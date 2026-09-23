import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { LIMITS, countChars } from '../../shared/rules/limits'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { PublicPlayer } from '../../shared/schemas/match'
import type { WeaponProfile } from '../../shared/schemas/weapon'
import type { ClientMessage } from '../../shared/schemas/messages'
import type { ClientState } from '../state/match-reducer'
import { newId } from '../lib/ids'
import { CharacterSprite } from '../battle/CharacterSprite'
import { ROSTER, characterOf, poseUrl, type CharacterId } from '../battle/characters'
import { WeaponSprite } from '../battle/WeaponSprite'
import { weaponImageUrlOf } from '../battle/outcome'

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

function WeaponCard({ weapon }: { weapon: WeaponProfile }) {
  return (
    <div className="wcard wcard--flip">
      <div className="wcard__name">{weapon.displayName}</div>
      <div>{weapon.tagline}</div>
      <div className="wcard__row">
        {weapon.capabilities.map((c) => (
          <span key={c} className="wcard__chip">
            {c}
          </span>
        ))}
        <span className="wcard__chip is-weak">약점: {weapon.weakness}</span>
      </div>
      <div className="wcard__row">
        {weapon.techniques.map((t) => (
          <span key={t.id} className="wcard__chip">
            ⚔ {t.name}
          </span>
        ))}
      </div>
    </div>
  )
}

function Seat({ player, id, side, stageWidth }: { player: PublicPlayer | undefined; id: CharacterId | null; side: 'left' | 'right'; stageWidth: number }) {
  const label = player?.nickname ?? (player?.connected ? '무기 고르는 중' : '빈 자리')
  return (
    <>
      <CharacterSprite id={id} pose="idle" side={side} />
      {player?.weapon && (
        <WeaponSprite imageUrl={weaponImageUrlOf(player.weapon)} visualTag={player.weapon.visualTag} side={side} phase="float" animation="DASH" travelMs={0} stageWidth={stageWidth} />
      )}
      <div className={`seat-label seat-label--${side}`}>
        {label}
        {player?.ready ? ' ✓' : ''}
      </div>
    </>
  )
}

/** 대기실: 캐릭터 선택 → 무기 입력 → 선수 입장(설정 공개) → 준비. */
export function LobbyScreen({ state, you, roomCode, characterIds, onPickCharacter, send, stageWidth }: LobbyScreenProps) {
  const match = state.match
  const me = you ? match?.players[you] : undefined
  const joinUrl = `${window.location.origin}/play/${roomCode}`
  const qr = useQrCode(joinUrl)

  const [nickname, setNickname] = useState('')
  const [weaponName, setWeaponName] = useState('')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const myCharacter = you ? characterIds[you] : null
  const canSubmit = !!myCharacter && countChars(nickname) > 0 && countChars(nickname) <= LIMITS.NICKNAME && countChars(weaponName) > 0 && countChars(weaponName) <= LIMITS.WEAPON_NAME && countChars(description) <= LIMITS.WEAPON_DESCRIPTION

  const submitWeapon = () => {
    if (!canSubmit || !myCharacter) return
    send({
      type: 'weapon_submit',
      requestId: newId(),
      weapon: { nickname, character: characterOf(myCharacter).blurb, weaponName, description },
    })
    setSubmitted(true)
  }

  const submitReady = () => {
    if (!match) return
    send({ type: 'ready', matchId: match.matchId })
  }

  const isWaitingWeapon = submitted && !me?.weapon

  return (
    <div className="lobby" style={{ position: 'absolute', inset: 0 }}>
      <div className="lobby__seats">
        <Seat player={match?.players.A} id={characterIds.A} side="left" stageWidth={stageWidth} />
        <Seat player={match?.players.B} id={characterIds.B} side="right" stageWidth={stageWidth} />
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
            <div className="muted">두 사람이 무기를 고르고 준비하면 시작합니다.</div>
          </>
        )}

        {you && !me?.weapon && !isWaitingWeapon && (
          <div className="lobby__form">
            <div className="roster">
              {ROSTER.map((c) => (
                <button key={c.id} type="button" className={`roster__pick${myCharacter === c.id ? ' is-on' : ''}`} onClick={() => onPickCharacter(c.id)}>
                  <div
                    className="portrait"
                    style={{ backgroundImage: `url(${poseUrl(c.id, 'idle')})`, backgroundSize: `${c.portrait.zoom * 100}%`, backgroundPosition: `${c.portrait.x}% ${c.portrait.y}%` }}
                  />
                  {c.name}
                </button>
              ))}
            </div>
            <input className="input" value={nickname} maxLength={LIMITS.NICKNAME * 2} placeholder={`닉네임 (${LIMITS.NICKNAME}자)`} onChange={(e) => setNickname(e.target.value)} />
            <input className="input" value={weaponName} maxLength={LIMITS.WEAPON_NAME * 2} placeholder="무기 이름 — 아무거나! (예: 젖은 양말)" onChange={(e) => setWeaponName(e.target.value)} />
            <input className="input" value={description} maxLength={LIMITS.WEAPON_DESCRIPTION * 2} placeholder="한 줄 설명 (선택)" onChange={(e) => setDescription(e.target.value)} />
            {state.rejected && <div className="err">입력을 확인해 주세요. 사람과 가족은 공격하지 마세요.</div>}
            <button type="button" className="btn" disabled={!canSubmit} onClick={submitWeapon}>
              무기 제출
            </button>
          </div>
        )}

        {you && isWaitingWeapon && (
          <div className="entering">
            <div className="spinner" />
            <div>선수 입장 중… 무기를 분석하고 있습니다</div>
          </div>
        )}

        {you && me?.weapon && (
          <>
            <WeaponCard weapon={me.weapon} />
            <button type="button" className="btn" disabled={me.ready} onClick={submitReady}>
              {me.ready ? '상대를 기다리는 중…' : '준비 완료!'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
