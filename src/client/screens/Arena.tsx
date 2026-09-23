import { useEffect, useRef, useState } from 'react'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { RoundResolved } from '../../shared/schemas/match'
import { createBrowserAudioManager } from '../audio/AudioManager'
import { useMatch } from '../state/useMatch'
import type { ClientState } from '../state/match-reducer'
import { characterIdFor, type CharacterId } from '../battle/characters'
import { usePlayback } from '../battle/usePlayback'
import { usePrefs } from '../battle/usePrefs'
import { useSfx } from '../audio/useSfx'
import type { SfxPlayer } from '../audio/sfx'
import { BattleScreen } from './BattleScreen'
import { LobbyScreen } from './LobbyScreen'
import { ResultScreen } from './ResultScreen'
import '../battle/animations.css'
import '../battle/ui.css'
import './screens.css'

export interface ArenaProps {
  roomCode: string
  /** /play/:code — 휴대폰은 마운트 시 좌석 참가. /screen/:code 는 참가하지 않는다. */
  autoJoin?: boolean
}

const FOUL_OVERLAY_MS = 2600
const FOUL_TEXT = '삐익! 인신공격 반칙입니다. 무기로 승부하세요.'
const FOUL_LOCK_TEXT = '자유 입력이 잠겼습니다. 이번 경기는 기본 공격으로 진행됩니다.'

/** 같은 방 참가 요청은 탭당 한 번. StrictMode 이중 실행·재마운트에서도 재사용. */
const joinInFlight = new Map<string, Promise<string | null>>()
const joinRoom = (roomCode: string): Promise<string | null> => {
  const existing = joinInFlight.get(roomCode)
  if (existing) return existing
  const p = fetch(`/api/rooms/${roomCode}/join`, { method: 'POST', credentials: 'same-origin' })
    .then(async (r) => {
      const body = (await r.json().catch(() => null)) as { error?: string | null } | null
      return r.ok ? null : (body?.error ?? `참가 실패 (${r.status})`)
    })
    .catch(() => '참가 요청 실패 (네트워크)')
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
}

/** 양쪽 fouls 가 오르면 카드 오버레이 + 호루라기. 원문은 절대 표시하지 않는다. */
function useFoulOverlay(state: ClientState, sfx: SfxPlayer): FoulOverlayState | null {
  const prev = useRef<Record<PlayerSlot, number>>({ A: 0, B: 0 })
  const [overlay, setOverlay] = useState<FoulOverlayState | null>(null)
  useEffect(() => {
    const players = state.match?.players
    if (!players) return
    for (const slot of ['A', 'B'] as const) {
      const fouls = players[slot]?.fouls ?? 0
      if (fouls > prev.current[slot]) {
        prev.current = { ...prev.current, [slot]: fouls }
        setOverlay({ slot, fouls })
        sfx.play('whistle')
        const t = window.setTimeout(() => setOverlay(null), FOUL_OVERLAY_MS)
        return () => window.clearTimeout(t)
      }
      if (fouls < prev.current[slot]) prev.current = { ...prev.current, [slot]: fouls }
    }
  }, [state.match?.players, sfx])
  return overlay
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
  const [joinError, setJoinError] = useState<string | null>(null)
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
  const playback = usePlayback(held, prefs.reducedMotion)
  useEffect(() => {
    if (playback.done && !state.playback) setHeld(null)
  }, [playback.done, state.playback])
  // 해설 음성은 해당 공격의 'commentary' 장면에서만. 늦게 온 음성은 창(2.5초)이 지나면 버린다.
  useEffect(() => {
    if (playback.step === 'commentary' && playback.attack) audioManager.playScheduled(playback.attack.eventId)
  }, [playback.step, playback.attack?.eventId, audioManager])
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

  const phase = match?.phase ?? null
  const isPlayingOut = held !== null && !playback.done
  const isBattle = phase === 'ROUND_INPUT' || phase === 'ROUND_RESOLVING' || phase === 'ROUND_PLAYBACK' || (isPlayingOut && phase === 'FINISHED')
  const isFinished = (phase === 'FINISHED' && !isPlayingOut) || phase === 'CLOSED'
  const isLobby = match !== null && !isBattle && !isFinished
  const sfx = useSfx({ state, playback, muted: !prefs.soundOn, you, isLobby, isBattle, isFinished })
  const foul = useFoulOverlay(state, sfx)

  if (joinError) {
    return (
      <main className="screen">
        <div className="screen__box">
          <h1>입장 실패</h1>
          <p className="err">{joinError}</p>
        </div>
      </main>
    )
  }

  return (
    <div ref={stageRef} className="arena" style={{ position: 'relative' }}>
      {!match && (
        <div className="subtitle" style={{ bottom: '48%' }}>
          {state.connection === 'reconnecting' ? '다시 연결하는 중…' : '연결 중…'}
        </div>
      )}
      {match && !isBattle && !isFinished && (
        <LobbyScreen state={state} you={you} roomCode={roomCode} characterIds={characterIds} onPickCharacter={setMyPick} send={send} stageWidth={stageWidth} />
      )}
      {match && isBattle && <BattleScreen state={state} you={you} playback={playback} resolved={held} seconds={seconds} characterIds={characterIds} prefs={prefs} stageWidth={stageWidth} send={send} />}
      {match && isFinished && <ResultScreen state={state} you={you} characterIds={characterIds} send={send} />}

      {foul && (
        <div className="foul">
          <div>
            <div className={`foul__card${foul.fouls >= 2 ? ' is-red' : ''}`} style={{ margin: '0 auto' }} />
            <div className="foul__text">{foul.fouls >= 2 ? FOUL_LOCK_TEXT : FOUL_TEXT}</div>
          </div>
        </div>
      )}
      {state.toast && !foul && <div className="toast">{state.toast}</div>}

      <div style={{ position: 'absolute', top: 4, right: 8, zIndex: 10, fontSize: 12, opacity: 0.8 }}>
        <label style={{ marginRight: 8 }}>
          <input type="checkbox" checked={prefs.soundOn} onChange={(e) => prefs.setSoundOn(e.target.checked)} /> 소리
        </label>
        <label>
          <input type="checkbox" checked={prefs.shakeOn} onChange={(e) => prefs.setShakeOn(e.target.checked)} /> 흔들림
        </label>
      </div>
    </div>
  )
}
