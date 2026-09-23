import type { PlayerSlot } from '../../shared/schemas/enums'
import type { PublicPlayer } from '../../shared/schemas/match'
import { characterOf, hasCharacterArtwork, poseUrl, type CharacterId } from './characters'
import { splitWeakPoints } from './weak-points'

export interface HudProps {
  players: Partial<Record<PlayerSlot, PublicPlayer>>
  characterIds: Record<PlayerSlot, CharacterId | null>
  roundId: number
  seconds: number | null
  maxHp?: number
}

const LOW_HP_RATIO = 0.3
const URGENT_SECONDS = 5

function Portrait({ id }: { id: CharacterId | null }) {
  if (!id) return <div className="portrait is-empty" />
  const { portrait } = characterOf(id)
  return (
    <div
      className="portrait"
      style={{
        backgroundImage: `url(${poseUrl(id, 'idle')})`,
        backgroundSize: hasCharacterArtwork(id) ? `${portrait.zoom * 100}%` : 'contain',
        backgroundPosition: hasCharacterArtwork(id) ? `${portrait.x}% ${portrait.y}%` : 'center',
      }}
    />
  )
}

function Side({ player, id, side, maxHp }: { player: PublicPlayer | undefined; id: CharacterId | null; side: 'left' | 'right'; maxHp: number }) {
  const hp = player?.hp ?? maxHp
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const name = player?.nickname ?? (id ? characterOf(id).name : '대기 중')
  const tagline = player?.weapon?.tagline ?? (player?.weapon?.displayName ? '' : id ? characterOf(id).blurb : '')
  const fouls = player?.fouls ?? 0
  const weakPoints = splitWeakPoints(player?.weapon?.weakness)
  return (
    <div className={`hud__side hud__side--${side}`}>
      <Portrait id={id} />
      <div className="hud__col">
        <div className="hud__name">{name}</div>
        <div className="hpbar">
          <div className={`hpbar__fill${pct <= LOW_HP_RATIO * 100 ? ' is-low' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="hud__meta">
          <span>{hp} HP</span>
          <span className="cards" title="반칙 카드">
            <span className={`card${fouls >= 1 ? ' is-on' : ''}`} />
            <span className={`card${fouls >= 2 ? ' is-on' : ''}`} />
          </span>
          {player?.weapon?.displayName && player.weapon.displayName !== player.weapon.characterName && <span className="hud__weapon">· {player.weapon.displayName}</span>}
        </div>
        <div className="hud__tag">{tagline}</div>
        {weakPoints.length > 0 && (
          <div className="hud__weak">
            <span className="hud__weak-label">아픈 곳</span>
            {weakPoints.map((w) => (
              <span key={w} className="hud__weak-chip">
                {w}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** 상단: 초상화·이름·체력·카드·타이머. 서버 HP 를 그대로 보여준다. */
export function Hud({ players, characterIds, roundId, seconds, maxHp = 100 }: HudProps) {
  return (
    <div className="hud">
      <Side player={players.A} id={characterIds.A} side="left" maxHp={maxHp} />
      <div className="hud__center">
        <div className="hud__round">{roundId > 0 ? `ROUND ${roundId}` : 'READY'}</div>
        <div className={`hud__timer${seconds !== null && seconds <= URGENT_SECONDS ? ' is-urgent' : ''}`}>{seconds ?? '--'}</div>
        <img className="hud__logo" src="/assets/logo.png" alt="아무거나 무기 배틀" />
      </div>
      <Side player={players.B} id={characterIds.B} side="right" maxHp={maxHp} />
    </div>
  )
}
