import { useState } from 'react'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { AttackEvent } from '../../shared/schemas/match'
import type { ClientMessage } from '../../shared/schemas/messages'
import type { ClientState } from '../state/match-reducer'
import { CharacterSprite } from '../battle/CharacterSprite'
import { Hud } from '../battle/Hud'
import type { CharacterId, Pose } from '../battle/characters'

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

/** 결과: 승자·패자 자세, 최고 피해 공격, 재대결. */
export function ResultScreen({ state, you, characterIds, send }: ResultScreenProps) {
  const [rematchSent, setRematchSent] = useState(false)
  const match = state.match
  if (!match) return null
  const winner = match.winner ?? null
  const winnerName = winner ? match.players[winner]?.nickname ?? (winner === 'A' ? '왼쪽' : '오른쪽') : null
  const best = highestDamageAttack(state)

  return (
    <div className="arena">
      <div className="arena__floor" />
      <CharacterSprite id={characterIds.A} pose={poseFor('A', winner)} side="left" />
      <CharacterSprite id={characterIds.B} pose={poseFor('B', winner)} side="right" />
      <Hud players={match.players} characterIds={characterIds} roundId={match.roundId} seconds={null} />

      <div className="result__banner">
        <div className="result__title">{winner ? `${winnerName} 승리!` : '무승부!'}</div>
        {best && (
          <div className="result__sub">
            최고의 한 방: {best.techniqueLabel} (-{best.damage})
          </div>
        )}
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
            {rematchSent ? '상대를 기다리는 중…' : '재대결!'}
          </button>
        ) : (
          <div className="muted">두 사람이 재대결을 누르면 새 경기가 시작됩니다.</div>
        )}
      </div>
    </div>
  )
}
