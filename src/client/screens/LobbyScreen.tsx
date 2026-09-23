import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { LIMITS, countChars } from '../../shared/rules/limits'
import { ROSTER as SHARED_ROSTER, type RosterEntry } from '../../shared/rules/roster'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { PublicPlayer } from '../../shared/schemas/match'
import type { WeaponProfile } from '../../shared/schemas/weapon'
import type { ClientMessage } from '../../shared/schemas/messages'
import type { ClientState } from '../state/match-reducer'
import { newId } from '../lib/ids'
import { CharacterSprite } from '../battle/CharacterSprite'
import { ROSTER, poseUrl, type Character, type CharacterId } from '../battle/characters'

export interface LobbyScreenProps {
  state: ClientState
  you: PlayerSlot | null
  roomCode: string
  characterIds: Record<PlayerSlot, CharacterId | null>
  onPickCharacter: (id: CharacterId) => void
  send: (m: ClientMessage) => void
  stageWidth: number
}

function useQrCode(url: string): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { width: 280 })
      .then((r) => {
        if (!cancelled) setDataUrl(r)
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

/** 출연진 카드: 성격 2 · 아픈 곳 3 · 추천 한 마디 2 (긁기 배틀). */
function CharacterCard({ card }: { card: WeaponProfile }) {
  const weakPoints = card.weakness.split(',').map((w) => w.trim()).filter(Boolean)
  return (
    <div className="wcard wcard--flip">
      <div className="wcard__name">{card.displayName}</div>
      <div>{card.tagline}</div>
      <div className="wcard__row">
        {card.capabilities.map((c) => (
          <span key={c} className="wcard__chip">
            {c}
          </span>
        ))}
      </div>
      <div className="wcard__row">
        <span className="muted">내 아픈 곳</span>
        {weakPoints.map((w) => (
          <span key={w} className="wcard__chip is-weak">
            {w}
          </span>
        ))}
      </div>
      <div className="muted">라운드마다 한 마디로 상대의 아픈 곳을 긁으세요. 뻔한 칼·주먹은 0점.</div>
    </div>
  )
}

/** 고르기 전에 이름·설명·아픈 곳을 다 보여준다. 출연진 설정이 아직 없는 캐릭터는 이름만. */
function RosterPick({ character, isOn, disabled, onPick }: { character: Character; isOn: boolean; disabled: boolean; onPick: () => void }) {
  const entry = SHARED_ROSTER[character.id] as RosterEntry | undefined
  return (
    <button type="button" className={`roster__pick${isOn ? ' is-on' : ''}`} disabled={disabled} onClick={onPick}>
      <div
        className="portrait"
        style={{ backgroundImage: `url(${poseUrl(character.id, 'idle')})`, backgroundSize: `${character.portrait.zoom * 100}%`, backgroundPosition: `${character.portrait.x}% ${character.portrait.y}%` }}
      />
      <div className="roster__name">{character.name}</div>
      <div className="roster__desc">{entry?.description ?? character.blurb}</div>
      {entry && (
        <div className="roster__weak">
          <span className="muted">아픈 곳</span>
          {entry.weakPoints.map((w) => (
            <span key={w} className="wcard__chip is-weak">
              {w}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

function Seat({ player, id, side }: { player: PublicPlayer | undefined; id: CharacterId | null; side: 'left' | 'right' }) {
  const label = player?.nickname ?? (player?.connected ? '캐릭터 고르는 중' : '빈 자리')
  return (
    <>
      <CharacterSprite id={player?.connected ? id : null} pose="idle" side={side} />
      <div className={`seat-label seat-label--${side}`}>
        {label}
        {player?.ready ? ' ✓' : ''}
      </div>
    </>
  )
}

/** 대기실: 닉네임 + 캐릭터 선택 → 카드 공개 → 준비. 무기는 미리 정하지 않는다. */
export function LobbyScreen({ state, you, roomCode, characterIds, onPickCharacter, send }: LobbyScreenProps) {
  const match = state.match
  const me = you ? match?.players[you] : undefined
  const joinUrl = `${window.location.origin}/play/${roomCode}`
  const qr = useQrCode(joinUrl)

  const [nickname, setNickname] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const myCharacter = you ? characterIds[you] : null
  const nickOk = countChars(nickname) <= LIMITS.NICKNAME
  const canEnter = !!myCharacter && nickOk && !submitted

  const enter = () => {
    if (!myCharacter || !nickOk) return
    const name = (SHARED_ROSTER[myCharacter] as RosterEntry | undefined)?.name ?? myCharacter
    send({
      type: 'weapon_submit',
      requestId: newId(),
      weapon: { nickname: nickname.trim() || name, characterId: myCharacter, character: name, weaponName: name, description: '' },
    })
    setSubmitted(true)
  }

  const submitReady = () => {
    if (!match) return
    send({ type: 'ready', matchId: match.matchId })
  }

  return (
    <div className="lobby" style={{ position: 'absolute', inset: 0 }}>
      <div className="lobby__seats">
        <Seat player={match?.players.A} id={characterIds.A} side="left" />
        <Seat player={match?.players.B} id={characterIds.B} side="right" />
        <img className="vs" src="/assets/vs.png" alt="VS" />
      </div>

      <div className="lobby__panel">
        {!you && (
          <>
            <div className="row">
              {qr && <img className="qr" src={qr} alt="참가 QR" />}
              <div style={{ textAlign: 'left' }}>
                <div className="muted">휴대폰으로 참가</div>
                <div style={{ fontWeight: 900, fontSize: '1.6em', color: '#ffe259' }}>{roomCode}</div>
                <div className="muted">{joinUrl}</div>
              </div>
            </div>
            <div className="muted">두 사람이 캐릭터를 고르고 준비하면 시작합니다.</div>
          </>
        )}

        {you && !me?.weapon && (
          <div className="lobby__form">
            <div className="roster">
              {ROSTER.map((c) => (
                <RosterPick key={c.id} character={c} isOn={myCharacter === c.id} disabled={submitted} onPick={() => onPickCharacter(c.id)} />
              ))}
            </div>
            <input className="input" value={nickname} maxLength={LIMITS.NICKNAME * 2} placeholder={`닉네임 (${LIMITS.NICKNAME}자, 비우면 캐릭터 이름)`} onChange={(e) => setNickname(e.target.value)} disabled={submitted} />
            {state.rejected && <div className="err">닉네임을 확인해 주세요. 사람과 가족은 공격하지 마세요.</div>}
            <button type="button" className="btn" disabled={!canEnter} onClick={enter}>
              {submitted ? '입장 중…' : '이 캐릭터로 입장'}
            </button>
          </div>
        )}

        {you && me?.weapon && (
          <>
            <CharacterCard card={me.weapon} />
            <button type="button" className="btn" disabled={me.ready} onClick={submitReady}>
              {me.ready ? '상대를 기다리는 중…' : '준비 완료!'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
