import { useState } from 'react'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { AttackEvent, PublicPlayer } from '../../shared/schemas/match'
import type { ClientMessage } from '../../shared/schemas/messages'
import type { ClientState } from '../state/match-reducer'
import { CharacterSprite } from '../battle/CharacterSprite'
import { Hud } from '../battle/Hud'
import { useCutout } from '../battle/WeaponSprite'
import { outcomeFx, outcomeOf, weaponImageUrlOf } from '../battle/outcome'
import type { CharacterId, Pose } from '../battle/characters'
import { useLang, useT } from '../i18n/LangContext'

export interface ResultScreenProps {
  state: ClientState
  you: PlayerSlot | null
  characterIds: Record<PlayerSlot, CharacterId | null>
  send: (m: ClientMessage) => void
}

/** 동점은 앞선 라운드·앞선 재생 순서가 이긴다 (PRD §11). */
const highestDamageAttack = (state: ClientState): AttackEvent | null => {
  let best: AttackEvent | null = null
  for (const round of state.match?.history ?? []) {
    for (const slot of round.playbackOrder) {
      const a = round.attacks.find((x) => x.actor === slot)
      if (a && (!best || a.damage > best.damage)) best = a
    }
  }
  return best
}

const poseFor = (slot: PlayerSlot, winner: PlayerSlot | null | undefined): Pose => {
  if (!winner) return 'idle'
  return winner === slot ? 'win' : 'lose'
}

/** 최고의 한 방 카드: 무기 그림·기술명·판정·피해. */
function BestHitCard({ attack, actor }: { attack: AttackEvent; actor: PublicPlayer | undefined }) {
  const src = useCutout(weaponImageUrlOf(actor?.weapon), actor?.weapon?.visualTag ?? null)
  const outcome = outcomeOf(attack)
  const lang = useLang()
  const t = useT()
  return (
    <div className="best">
      <div className="best__title">{t.result.bestShot}</div>
      <div className="best__body">
        <img className="best__weapon" src={src} alt="" draggable={false} />
        <div className="best__col">
          <div className="best__who">{actor?.nickname ?? (attack.actor === 'A' ? t.result.left : t.result.right)}</div>
          <div className="best__tech">{attack.techniqueLabel}</div>
          <div className="best__row">
            <span className={`best__label is-${outcome}`}>{outcomeFx(outcome, lang).label}</span>
            <span className="best__dmg">-{attack.damage}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 결과: 승자·패자 자세, 최고 피해 공격, 재대결. */
export function ResultScreen({ state, you, characterIds, send }: ResultScreenProps) {
  const [rematchSent, setRematchSent] = useState(false)
  const t = useT()
  const match = state.match
  if (!match) return null
  const winner = match.winner ?? null
  const winnerName = winner ? match.players[winner]?.nickname ?? (winner === 'A' ? t.result.left : t.result.right) : null
  const best = highestDamageAttack(state)

  return (
    <div className="arena result">
      <div className="arena__floor" />
      <CharacterSprite id={characterIds.A} pose={poseFor('A', winner)} side="left" />
      <CharacterSprite id={characterIds.B} pose={poseFor('B', winner)} side="right" />
      <Hud players={match.players} characterIds={characterIds} roundId={match.roundId} seconds={null} />

      <div className="result__banner">
        <div className="result__title">{winner && winnerName ? t.result.win(winnerName) : t.result.draw}</div>
        {best && best.damage > 0 && <BestHitCard attack={best} actor={match.players[best.actor]} />}
      </div>

      <div className="result__panel">
        {you ? (
          <button
            type="button"
            className="btn"
            disabled={rematchSent}
            onClick={() => {
              send({ type: 'rematch_ready', matchId: match.matchId })
              setRematchSent(true)
            }}
          >
            {rematchSent ? t.result.waitingOpponent : t.result.rematch}
          </button>
        ) : (
          <div className="muted">{t.result.rematchHint}</div>
        )}
      </div>
    </div>
  )
}
