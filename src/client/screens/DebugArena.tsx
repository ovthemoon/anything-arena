import { newId } from '../lib/ids'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useMatch } from '../state/useMatch'
import { HpBar } from '../battle/HpBar'
import { LIMITS, countChars } from '../../shared/rules/limits'
import { createBrowserAudioManager } from '../audio/AudioManager'
import type { AttackEvent } from '../../shared/schemas/match'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { ClientMessage } from '../../shared/schemas/messages'
import type { ClientState } from '../state/match-reducer'

/**
 * Local mirror of PRESET_CHARACTERS from src/worker/game/default-weapons.ts.
 * Duplicated (not imported) on purpose: src/client must not import from src/worker,
 * and that file is owned by another lane editing concurrently. Keep these two lists
 * in sync by hand until a later session moves presets into src/shared.
 */
const PRESET_CHARACTERS = [
  { character: '순대국밥 20년차 욕쟁이 할머니', weaponName: '국자', description: '국물 회오리를 일으킨다' },
  { character: '내 나이 15 이잼민', weaponName: '응? 키보드', description: '말대꾸로 방패를 만든다' },
  { character: '빨래 못 말린 자취생', weaponName: '젖은 양말', description: '하루 종일 따라다니는 축축함' },
  { character: '충전기 잃어버린 대학생', weaponName: '배터리 1% 스마트폰', description: '마지막까지 꺼지지 않는 집념' },
] as const

function readAudioPref(defaultOn: boolean): boolean {
  try {
    const v = localStorage.getItem('audio')
    if (v === 'on') return true
    if (v === 'off') return false
  } catch {
    /* private mode / blocked storage: fall through to default */
  }
  return defaultOn
}

function writeAudioPref(on: boolean): void {
  try {
    localStorage.setItem('audio', on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
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

/** Ties favor the earlier round + earlier playback slot, since we only replace on strictly-greater damage. */
function findHighestDamageAttack(state: ClientState): AttackEvent | null {
  let best: AttackEvent | null = null
  for (const round of state.match?.history ?? []) {
    for (const slot of round.playbackOrder) {
      const attack = round.attacks.find((a) => a.actor === slot)
      if (attack && (!best || attack.damage > best.damage)) best = attack
    }
  }
  return best
}

function useCommentaryPlayback(state: ClientState, muted: boolean) {
  const [audioManager] = useState(() => createBrowserAudioManager())

  useEffect(() => {
    audioManager.setMuted(muted)
  }, [muted, audioManager])

  useEffect(() => {
    for (const [eventId, entry] of Object.entries(state.commentary)) {
      audioManager.playCommentary(eventId, entry.audioPath, entry.text, entry.validUntil)
    }
  }, [state.commentary, audioManager])
}

interface SoundToggleProps {
  on: boolean
  onChange: (on: boolean) => void
}

function SoundToggle({ on, onChange }: SoundToggleProps) {
  return (
    <label>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          onChange(e.target.checked)
          writeAudioPref(e.target.checked)
        }}
      />
      {' 소리'}
    </label>
  )
}

function useQrCode(url: string): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { width: 240 })
      .then((result) => {
        if (!cancelled) setDataUrl(result)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  return dataUrl
}

function ScreenView({ state }: { state: ClientState }) {
  const [soundOn, setSoundOn] = useState(() => readAudioPref(true))
  useCommentaryPlayback(state, !soundOn)
  const seconds = useCountdownSeconds(state.match?.deadlineAt)

  const match = state.match
  const joinUrl = `${location.origin}/play/${match?.roomCode ?? ''}`
  const qrDataUrl = useQrCode(joinUrl)
  const players = match?.players
  const best = findHighestDamageAttack(state)

  return (
    <section style={{ padding: 16, fontFamily: 'monospace' }}>
      <h1>
        방 코드: <code style={{ fontSize: 32 }}>{match?.roomCode ?? '...'}</code>
      </h1>
      <p>
        참가 링크: <code>{joinUrl}</code>
      </p>
      {qrDataUrl && <img src={qrDataUrl} width={240} height={240} alt="참가 QR 코드" />}
      <SoundToggle on={soundOn} onChange={setSoundOn} />

      <div>
        연결: {state.connection} / phase: {match?.phase ?? '-'} / round: {match?.roundId ?? '-'} / 남은시간:{' '}
        {seconds ?? '-'}s / eventSeq: {match?.eventSeq ?? '-'}
      </div>
      {state.toast && <div style={{ color: 'orange' }}>{state.toast}</div>}

      <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
        {(['A', 'B'] as const).map((slot) => {
          const p = players?.[slot]
          return (
            <div key={slot} style={{ border: '1px solid #888', padding: 8, flex: 1 }}>
              <h3>
                {slot} 플레이어 {p && !p.connected ? '(연결 끊김)' : ''}
              </h3>
              <div>닉네임: {p?.nickname ?? '-'}</div>
              <div>준비: {p?.ready ? 'Y' : 'N'}</div>
              <HpBar label={slot} hp={p?.hp ?? 100} />
              <div>{p?.weapon?.characterName ?? ''}</div>
              <pre>{JSON.stringify(p?.weapon ?? null, null, 2)}</pre>
            </div>
          )
        })}
      </div>

      {match?.phase === 'ROUND_PLAYBACK' && state.playback && (
        <section style={{ marginTop: 12 }}>
          <h2>재생</h2>
          <ol>
            {state.playback.playbackOrder.map((slot) => {
              const attack = state.playback?.attacks.find((a) => a.actor === slot)
              if (!attack) return null
              const commentary = state.commentary[attack.eventId]
              return (
                <li key={attack.eventId}>
                  <div>
                    {attack.techniqueLabel} — {attack.approvedActionText}
                  </div>
                  <div>
                    효과: {attack.effectiveness} / 피해: {attack.damage} / 연출: {attack.animation}
                    {attack.fallbackReason ? ` (대체: ${attack.fallbackReason})` : ''}
                  </div>
                  {commentary && <div>해설: {commentary.text}</div>}
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {match?.phase === 'FINISHED' && (
        <section style={{ marginTop: 12 }}>
          <h2>결과</h2>
          <div>{match.winner ? `승자: ${match.winner}` : '무승부'}</div>
          <div>
            최종 HP — A: {players?.A?.hp ?? '-'} / B: {players?.B?.hp ?? '-'}
          </div>
          <div>최고 피해: {best ? `${best.techniqueLabel} (${best.damage})` : '-'}</div>
          <div>
            재대결 대기: A {players?.A?.ready ? 'Y' : 'N'} / B {players?.B?.ready ? 'Y' : 'N'}
          </div>
        </section>
      )}
    </section>
  )
}

function PlayView({ state, send }: { state: ClientState; send: (message: ClientMessage) => void }) {
  const [soundOn, setSoundOn] = useState(() => readAudioPref(false))
  useCommentaryPlayback(state, !soundOn)
  const seconds = useCountdownSeconds(state.match?.deadlineAt)

  const [nickname, setNickname] = useState('')
  const [character, setCharacter] = useState('')
  const [weaponName, setWeaponName] = useState('')
  const [description, setDescription] = useState('')
  const [freeText, setFreeText] = useState('')

  const you: PlayerSlot | null = state.you === 'A' || state.you === 'B' ? state.you : null
  const opponentSlot: PlayerSlot | null = you === 'A' ? 'B' : you === 'B' ? 'A' : null
  const match = state.match
  const me = you ? match?.players[you] : undefined
  const opponent = opponentSlot ? match?.players[opponentSlot] : undefined

  const applyPreset = (preset: (typeof PRESET_CHARACTERS)[number]) => {
    setCharacter(preset.character)
    setWeaponName(preset.weaponName)
    setDescription(preset.description)
  }

  const submitWeapon = () => {
    send({
      type: 'weapon_submit',
      requestId: newId(),
      weapon: { nickname, character, weaponName, description },
    })
  }

  const submitReady = () => {
    if (!match) return
    send({ type: 'ready', matchId: match.matchId })
  }

  const submitTechnique = (techniqueId: string) => {
    if (!match) return
    send({ type: 'action_submit', matchId: match.matchId, roundId: match.roundId, actionId: newId(), techniqueId })
  }

  const submitFreeText = () => {
    if (!match) return
    if (countChars(freeText) === 0 || countChars(freeText) > LIMITS.ACTION_TEXT) return
    send({ type: 'action_submit', matchId: match.matchId, roundId: match.roundId, actionId: newId(), text: freeText })
    setFreeText('')
  }

  const submitRematch = () => {
    if (!match) return
    send({ type: 'rematch_ready', matchId: match.matchId })
  }

  const freeTextDisabled = me?.presetOnly === true
  const freeTextInvalid = countChars(freeText) === 0 || countChars(freeText) > LIMITS.ACTION_TEXT

  return (
    <section style={{ padding: 16, fontFamily: 'monospace' }}>
      <div>
        연결: {state.connection} / 내 좌석: {you ?? '-'} / phase: {match?.phase ?? '-'} / 남은시간: {seconds ?? '-'}s
      </div>
      <SoundToggle on={soundOn} onChange={setSoundOn} />
      {state.toast && <div style={{ color: 'orange' }}>{state.toast}</div>}

      {(match?.phase === 'LOBBY' || match?.phase === 'PREPARING') && (
        <section>
          <h2>로비</h2>
          <div>
            {PRESET_CHARACTERS.map((preset) => (
              <button key={preset.weaponName} type="button" onClick={() => applyPreset(preset)}>
                {preset.weaponName}
              </button>
            ))}
          </div>
          <div>
            <label>
              닉네임 ({LIMITS.NICKNAME - countChars(nickname)}자 남음)
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </label>
          </div>
          <div>
            <label>
              캐릭터 ({LIMITS.CHARACTER - countChars(character)}자 남음)
              <input value={character} onChange={(e) => setCharacter(e.target.value)} />
            </label>
          </div>
          <div>
            <label>
              무기 이름 ({LIMITS.WEAPON_NAME - countChars(weaponName)}자 남음)
              <input value={weaponName} onChange={(e) => setWeaponName(e.target.value)} />
            </label>
          </div>
          <div>
            <label>
              특징 ({LIMITS.WEAPON_DESCRIPTION - countChars(description)}자 남음)
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>
          <button type="button" onClick={submitWeapon}>
            무기 만들기
          </button>
          <button type="button" onClick={submitReady}>
            준비
          </button>

          <h3>내 무기</h3>
          <pre>{JSON.stringify(me?.weapon ?? null, null, 2)}</pre>
          {opponent?.weapon && (
            <>
              <h3>상대 무기</h3>
              <pre>{JSON.stringify(opponent.weapon, null, 2)}</pre>
            </>
          )}
        </section>
      )}

      {match?.phase === 'ROUND_INPUT' && (
        <section>
          <h2>전투</h2>
          <HpBar label="나" hp={me?.hp ?? 0} />
          <HpBar label="상대" hp={opponent?.hp ?? 0} />
          <div>
            {me?.weapon?.techniques.map((t) => (
              <button key={t.id} type="button" onClick={() => submitTechnique(t.id)}>
                {t.name}
              </button>
            ))}
          </div>
          <div>
            <input value={freeText} onChange={(e) => setFreeText(e.target.value)} disabled={freeTextDisabled} />
            <span>{LIMITS.ACTION_TEXT - countChars(freeText)}자 남음</span>
            <button type="button" onClick={submitFreeText} disabled={freeTextDisabled || freeTextInvalid}>
              제출
            </button>
          </div>
          <div>내 상태: {me?.actionStatus ?? '-'}</div>
          <div>상대 준비: {opponent?.ready ? 'Y' : 'N'}</div>
          {state.rejected && (
            <div style={{ color: 'red' }}>
              거부됨: {state.rejected.reasonCode} (재시도 {state.rejected.canRetry ? '가능' : '불가'})
            </div>
          )}
          {me && me.fouls > 0 && (
            <div style={{ color: 'red' }}>
              파울 경고: {me.fouls}회 (presetOnly={String(me.presetOnly)})
            </div>
          )}
        </section>
      )}

      {match?.phase === 'FINISHED' && (
        <section>
          <h2>결과</h2>
          <div>{match.winner ? (match.winner === you ? '승리!' : '패배') : '무승부'}</div>
          <div>
            최종 HP — 나: {me?.hp ?? '-'} / 상대: {opponent?.hp ?? '-'}
          </div>
          <button type="button" onClick={submitRematch}>
            재대결
          </button>
        </section>
      )}
    </section>
  )
}

interface DebugArenaProps {
  roomCode: string
  /** true on /play/:code — phones join a seat on mount; the PC on /screen/:code never joins. */
  autoJoin?: boolean
}

/**
 * Single role-aware debug page. All state comes from useMatch(); this component only
 * renders it. A later session can replace ScreenView/PlayView with real UI as long as
 * it keeps using useMatch + ClientState the same way.
 */
/** 같은 방에 대한 참가 요청은 탭당 한 번만. React StrictMode 의 이중 실행과 재마운트에서도 재사용된다. */
const joinInFlight = new Map<string, Promise<string | null>>()

const joinRoom = (roomCode: string): Promise<string | null> => {
  const existing = joinInFlight.get(roomCode)
  if (existing) return existing
  const p = fetch(`/api/rooms/${roomCode}/join`, { method: 'POST', credentials: 'same-origin' })
    .then(async (r) => {
      const body = (await r.json().catch(() => null)) as { error?: string | null } | null
      return r.ok ? null : body?.error ?? `참가 실패 (${r.status})`
    })
    .catch(() => '참가 요청 실패 (네트워크)')
  joinInFlight.set(roomCode, p)
  return p
}

export function DebugArena({ roomCode, autoJoin }: DebugArenaProps) {
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

  if (joinError) return <p style={{ color: 'salmon' }}>참가할 수 없습니다: {joinError}</p>
  if (state.you === 'SCREEN') return <ScreenView state={state} />
  return <PlayView state={state} send={send} />
}
