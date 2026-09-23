import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { AttackEvent, RoundResolved } from '../../shared/schemas/match'
import { COMMENTARY_HOLD_MAX_MS, createBrowserAudioManager } from '../audio/AudioManager'
import { useMatch } from '../state/useMatch'
import type { ClientState } from '../state/match-reducer'
import { characterIdFor, type CharacterId } from '../battle/characters'
import { usePlayback } from '../battle/usePlayback'
import { usePrefs } from '../battle/usePrefs'
import { useSfx } from '../audio/useSfx'
import { roastVoicePath } from '../audio/roast-voice'
import type { SfxPlayer } from '../audio/sfx'
import { matchEndKind } from '../battle/finishing'
import { matchEndStage } from '../battle/match-end'
import { KoCutIn } from '../battle/KoCutIn'
import { BattleScreen } from './BattleScreen'
import { LobbyScreen } from './LobbyScreen'
import { ResultScreen } from './ResultScreen'
import '../battle/animations.css'
import '../battle/ui.css'
import './screens.css'
import { LangProvider } from '../i18n/LangContext'
import { stringsFor } from '../i18n/strings'
import { readLangPref } from '../i18n/pref'

export interface ArenaProps {
  roomCode: string
  /** /play/:code — 휴대폰은 마운트 시 좌석 참가. /screen/:code 는 참가하지 않는다. */
  autoJoin?: boolean
}

const FOUL_OVERLAY_MS = 2600
const KO_CUTIN_MS = 1600

/** 같은 방 참가 요청은 탭당 한 번. StrictMode 이중 실행·재마운트에서도 재사용. */
/** 참가 실패 사유. 문구는 렌더 시점에 언어에 맞춰 만든다. */
type JoinError = { kind: 'http'; status: number; message: string | null } | { kind: 'network' }
const joinInFlight = new Map<string, Promise<JoinError | null>>()

const joinRoom = (roomCode: string): Promise<JoinError | null> => {
  const existing = joinInFlight.get(roomCode)
  if (existing) return existing
  const p: Promise<JoinError | null> = fetch(`/api/rooms/${roomCode}/join`, { method: 'POST', credentials: 'same-origin' })
    .then(async (r) => {
      const body = (await r.json().catch(() => null)) as { error?: string | null } | null
      return r.ok ? null : { kind: 'http' as const, status: r.status, message: body?.error ?? null }
    })
    .catch(() => ({ kind: 'network' as const }))
  joinInFlight.set(roomCode, p)
  return p
}

function useCountdownSeconds(deadlineAt: number | null | undefined): number | null {
  const [seconds, setSeconds] = useState<number | null>(null)
  useEffect(() => {
    if (deadlineAt == null) {
      setSeconds(null)
      return
    }
    const tick = () => setSeconds(Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [deadlineAt])
  return seconds
}

function useCommentaryAudio(state: ClientState, muted: boolean) {
  const [audioManager] = useState(() => createBrowserAudioManager())
  useEffect(() => {
    audioManager.setMuted(muted)
  }, [muted, audioManager])
  useEffect(() => {
    // 도착 즉시 틀지 않고 보관만. 재생은 그 공격의 해설 차례(usePlayback step === 'commentary')에.
    for (const [eventId, entry] of Object.entries(state.commentary)) {
      audioManager.schedule(eventId, entry.audioPath, entry.text, entry.validUntil)
    }
  }, [state.commentary, audioManager])
  return audioManager
}

interface FoulOverlayState {
  slot: PlayerSlot
  fouls: number
  matchId: string
}

/** 양쪽 fouls 가 오르면 카드 오버레이 + 호루라기. 원문은 절대 표시하지 않는다. */
function useFoulOverlay(state: ClientState, sfx: SfxPlayer): FoulOverlayState | null {
  const prev = useRef<Record<PlayerSlot, number>>({ A: 0, B: 0 })
  const [overlay, setOverlay] = useState<FoulOverlayState | null>(null)
  const matchId = state.match?.matchId
  useEffect(() => {
    const players = state.match?.players
    if (!players || !matchId) return
    for (const slot of ['A', 'B'] as const) {
      const fouls = players[slot]?.fouls ?? 0
      if (fouls > prev.current[slot]) {
        prev.current = { ...prev.current, [slot]: fouls }
        setOverlay({ slot, fouls, matchId })
        sfx.play('whistle')
      }
      if (fouls < prev.current[slot]) prev.current = { ...prev.current, [slot]: fouls }
    }
  }, [state.match?.players, matchId, sfx])
  // Player snapshots must not cancel the lifetime of an already visible warning.
  useEffect(() => {
    if (!overlay) return
    const timer = window.setTimeout(() => setOverlay(null), FOUL_OVERLAY_MS)
    return () => window.clearTimeout(timer)
  }, [overlay])
  return overlay?.matchId === matchId ? overlay : null
}

function useStageWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/** 역할(SCREEN/A/B)과 phase 에 따라 화면을 고르는 컨테이너. 상태는 useMatch 만. */
export function Arena({ roomCode, autoJoin = false }: ArenaProps) {
  const [joined, setJoined] = useState(!autoJoin)
  const [joinError, setJoinError] = useState<JoinError | null>(null)
  /** 방 언어가 스냅샷으로 오기 전까지는 이 기기의 선택을 쓴다. */
  const [prefLang] = useState(readLangPref)
  useEffect(() => {
    if (!autoJoin) return
    let cancelled = false
    joinRoom(roomCode).then((err) => {
      if (cancelled) return
      if (err) setJoinError(err)
      else setJoined(true)
    })
    return () => {
      cancelled = true
    }
  }, [roomCode, autoJoin])

  const { state, send } = useMatch(joined ? roomCode : null)
  const prefs = usePrefs(!autoJoin)
  const audioManager = useCommentaryAudio(state, !prefs.soundOn)
  const seconds = useCountdownSeconds(state.match?.deadlineAt)
  // round_started 가 오면 리듀서가 playback 을 지우지만, 재생이 끝날 때까지는 마지막 round_resolved 를 붙잡는다.
  const [held, setHeld] = useState<RoundResolved | null>(null)
  useEffect(() => {
    if (state.playback) setHeld(state.playback)
  }, [state.playback])
  // 해설 음성이 끝날 때까지 다음 공격을 기다린다 (최대 COMMENTARY_HOLD_MAX_MS)
  const holdForCommentary = useCallback((attack: AttackEvent) => audioManager.waitForCommentary(attack.eventId, COMMENTARY_HOLD_MAX_MS), [audioManager])
  const playback = usePlayback(held, prefs.reducedMotion, holdForCommentary)
  useEffect(() => {
    if (playback.done && !state.playback) setHeld(null)
  }, [playback.done, state.playback])
  // 해설 음성은 해당 공격의 'commentary' 장면에서만. 늦게 온 음성은 창(2.5초)이 지나면 버린다.
  useEffect(() => {
    if (playback.step === 'commentary' && playback.attack) audioManager.playScheduled(playback.attack.eventId)
  }, [playback.step, playback.attack?.eventId, audioManager])
  // 추천 한 마디를 그대로 썼으면 미리 녹음한 목소리를 말풍선('name') 장면에서 튼다. 고친 문장·자유 입력은 자막만.
  // 녹음된 목소리는 한국어 카드만 있다. 영어 방은 자막만.
  const roastVoice = playback.attack && (state.match?.lang ?? prefLang) === 'ko'
    ? roastVoicePath(state.match?.players[playback.attack.actor]?.weapon?.techniques, playback.attack.approvedActionText)
    : null
  useEffect(() => {
    if (playback.step === 'name' && roastVoice && playback.attack) audioManager.playLine(playback.attack.eventId, roastVoice)
  }, [playback.step, playback.attack?.eventId, roastVoice, audioManager])
  useEffect(() => {
    if (!state.match || state.match.phase === 'LOBBY' || state.match.phase === 'PREPARING') setHeld(null)
  }, [state.match?.matchId, state.match?.phase])
  const [stageRef, stageWidth] = useStageWidth()

  const you: PlayerSlot | null = state.you === 'A' || state.you === 'B' ? state.you : null
  const [myPick, setMyPick] = useState<CharacterId | null>(null)

  const match = state.match
  const characterIds: Record<PlayerSlot, CharacterId | null> = {
    A: match?.players.A ? (you === 'A' && myPick ? myPick : characterIdFor(match.players.A, 'A')) : null,
    B: match?.players.B ? (you === 'B' && myPick ? myPick : characterIdFor(match.players.B, 'B')) : null,
  }

  // 경기 종료: 마지막 재생 → KO 컷인 → 결과 화면
  const phase = match?.phase ?? null
  const isPlayingOut = held !== null && !playback.done
  const [koDone, setKoDone] = useState(false)
  const endStage = matchEndStage({ phase, isPlayingOut, koDone })
  useEffect(() => {
    if (endStage !== 'ko') return
    const t = window.setTimeout(() => setKoDone(true), KO_CUTIN_MS)
    return () => window.clearTimeout(t)
  }, [endStage])
  useEffect(() => {
    if (phase !== 'FINISHED' && phase !== 'CLOSED') setKoDone(false)
  }, [phase])
  const isBattle = phase === 'ROUND_INPUT' || phase === 'ROUND_RESOLVING' || phase === 'ROUND_PLAYBACK' || endStage === 'battle' || endStage === 'ko'
  const isFinished = endStage === 'result'
  const koKind = matchEndKind({ A: match?.players.A?.hp, B: match?.players.B?.hp })
  const isLobby = match !== null && !isBattle && !isFinished
  const sfx = useSfx({ state, playback, muted: !prefs.soundOn, you, isLobby, isBattle, isFinished })
  const foul = useFoulOverlay(state, sfx)
  const lang = match?.lang ?? prefLang
  const t = stringsFor(lang)

  if (joinError) {
    const message = joinError.kind === 'network' ? t.arena.joinNetworkError : joinError.message ?? t.arena.joinFailed(joinError.status)
    return (
      <LangProvider lang={lang}>
        <main className="screen">
          <div className="screen__box">
            <h1>{t.arena.joinFailedTitle}</h1>
            <p className="err">{message}</p>
          </div>
        </main>
      </LangProvider>
    )
  }

  return (
    <LangProvider lang={lang}>
    <div ref={stageRef} className="arena" style={{ position: 'relative' }}>
      {!match && (
        <div className="subtitle" style={{ bottom: '48%' }}>
          {state.connection === 'reconnecting' ? t.arena.reconnecting : t.arena.connecting}
        </div>
      )}
      {match && !isBattle && !isFinished && (
        <LobbyScreen state={state} you={you} roomCode={roomCode} characterIds={characterIds} onPickCharacter={setMyPick} send={send} stageWidth={stageWidth} />
      )}
      {match && isBattle && <BattleScreen state={state} you={you} playback={playback} resolved={held} seconds={seconds} characterIds={characterIds} prefs={prefs} stageWidth={stageWidth} send={send} />}
      {match && isFinished && <ResultScreen state={state} you={you} characterIds={characterIds} send={send} />}
      {endStage === 'ko' && <KoCutIn kind={koKind} />}

      {foul && (
        <div className="foul">
          <div>
            <div className={`foul__card${foul.fouls >= 2 ? ' is-red' : ''}`} style={{ margin: '0 auto' }} />
            <div className="foul__text">{foul.fouls >= 2 ? t.arena.foulLock : t.arena.foul}</div>
          </div>
        </div>
      )}
      {state.toast && !foul && <div className="toast">{state.toast}</div>}

      <div style={{ position: 'absolute', top: 4, right: 8, zIndex: 10, fontSize: 12, opacity: 0.8 }}>
        <label style={{ marginRight: 8 }}>
          <input type="checkbox" checked={prefs.soundOn} onChange={(e) => prefs.setSoundOn(e.target.checked)} /> {t.arena.sound}
        </label>
        <label>
          <input type="checkbox" checked={prefs.shakeOn} onChange={(e) => prefs.setShakeOn(e.target.checked)} /> {t.arena.shake}
        </label>
      </div>
    </div>
    </LangProvider>
  )
}
