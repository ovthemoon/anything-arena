import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { LIMITS, countChars } from '../../shared/rules/limits'
import { rosterEntry } from '../../shared/rules/roster'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { PublicPlayer } from '../../shared/schemas/match'
import type { WeaponProfile } from '../../shared/schemas/weapon'
import type { ClientMessage } from '../../shared/schemas/messages'
import type { ClientState } from '../state/match-reducer'
import { newId } from '../lib/ids'
import { CharacterSprite } from '../battle/CharacterSprite'
import { rosterFor, hasCharacterArtwork, poseUrl, type Character, type CharacterId } from '../battle/characters'
import { splitWeakPoints } from '../battle/weak-points'
import { useLang, useT } from '../i18n/LangContext'

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
  const weakPoints = splitWeakPoints(card.weakness)
  const t = useT().lobby
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
        <span className="muted">{t.myWeakPoints}</span>
        {weakPoints.map((w) => (
          <span key={w} className="wcard__chip is-weak">
            {w}
          </span>
        ))}
      </div>
      <div className="muted">{t.howToPlay}</div>
    </div>
  )
}

/** 고르기 전에 이름·설명·아픈 곳을 다 보여준다. 출연진 설정이 아직 없는 캐릭터는 이름만. */
function RosterPick({ character, isOn, disabled, onPick }: { character: Character; isOn: boolean; disabled: boolean; onPick: () => void }) {
  const lang = useLang()
  const t = useT().lobby
  const entry = rosterEntry(character.id, lang)
  return (
    <button type="button" className={`roster__pick${isOn ? ' is-on' : ''}`} disabled={disabled} onClick={onPick}>
      <div
        className="portrait"
        style={{ backgroundImage: `url(${poseUrl(character.id, 'idle')})`, backgroundSize: hasCharacterArtwork(character.id) ? `${character.portrait.zoom * 100}%` : 'contain', backgroundPosition: hasCharacterArtwork(character.id) ? `${character.portrait.x}% ${character.portrait.y}%` : 'center' }}
      />
      <div className="roster__name">{character.name}</div>
      {!hasCharacterArtwork(character.id) && <div className="muted">{t.placeholderArt}</div>}
      <div className="roster__desc">{entry.description}</div>
      {entry && (
        <div className="roster__weak">
          <span className="muted">{t.weakPoints}</span>
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

/** 좌석 위 소개 카드: 중계 화면과 휴대폰 모두에서 이름·설명·아픈 곳이 보인다. */
function SeatCard({ card, side }: { card: WeaponProfile; side: 'left' | 'right' }) {
  const weakPoints = splitWeakPoints(card.weakness)
  const t = useT().lobby
  return (
    <div className={`seat-card seat-card--${side}`}>
      <div className="seat-card__name">{card.displayName}</div>
      <div className="seat-card__desc">{card.tagline}</div>
      <div className="seat-card__weak">
        <span className="muted">{t.weakPoints}</span>
        {weakPoints.map((w) => (
          <span key={w} className="wcard__chip is-weak">
            {w}
          </span>
        ))}
      </div>
    </div>
  )
}

function Seat({ player, id, side }: { player: PublicPlayer | undefined; id: CharacterId | null; side: 'left' | 'right' }) {
  const t = useT().lobby
  const label = player?.nickname ?? (player?.connected ? t.pickingCharacter : t.emptySeat)
  // 카드가 도착하면 캐릭터가 튀어오르며 "입장"한다 (key 로 다시 마운트)
  const isEntered = !!player?.weapon
  return (
    <>
      <CharacterSprite key={isEntered ? 'entered' : 'picking'} id={player?.connected ? id : null} pose="idle" side={side} isEntering={isEntered} />
      {player?.weapon && <SeatCard card={player.weapon} side={side} />}
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
  const lang = useLang()
  const t = useT().lobby
  const submitted = state.pendingWeaponRequestId !== null

  const myCharacter = you ? characterIds[you] : null
  const nickOk = countChars(nickname) <= LIMITS.NICKNAME
  const canEnter = !!myCharacter && nickOk && !submitted

  const enter = () => {
    if (!myCharacter || !nickOk) return
    const name = rosterEntry(myCharacter, lang).name
    send({
      type: 'weapon_submit',
      requestId: newId(),
      weapon: { nickname: nickname.trim() || name, characterId: myCharacter, character: name, weaponName: name, description: '' },
    })
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
              {qr && <img className="qr" src={qr} alt={t.qrAlt} />}
              <div style={{ textAlign: 'left' }}>
                <div className="muted">{t.joinWithPhone}</div>
                <div style={{ fontWeight: 900, fontSize: '1.6em', color: '#ffe259' }}>{roomCode}</div>
                <div className="muted">{joinUrl}</div>
              </div>
            </div>
            <div className="muted">{t.waitingForBoth}</div>
          </>
        )}

        {you && !me?.weapon && (
          <div className="lobby__form">
            <div className="roster">
              {rosterFor(lang).map((c) => (
                <RosterPick key={c.id} character={c} isOn={myCharacter === c.id} disabled={submitted} onPick={() => onPickCharacter(c.id)} />
              ))}
            </div>
            <input className="input" value={nickname} maxLength={LIMITS.NICKNAME * 2} placeholder={t.nicknamePlaceholder(LIMITS.NICKNAME)} onChange={(e) => setNickname(e.target.value)} disabled={submitted} />
            {state.rejected && <div className="err">{t.nicknameRejected}</div>}
            <button type="button" className="btn" disabled={!canEnter} onClick={enter}>
              {submitted ? t.entering : t.enter}
            </button>
          </div>
        )}

        {you && me?.weapon && (
          <>
            <CharacterCard card={me.weapon} />
            <button type="button" className="btn" disabled={me.ready} onClick={submitReady}>
              {me.ready ? t.waitingOpponent : t.ready}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
