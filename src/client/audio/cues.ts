import type { MatchPhase, PlayerSlot } from '../../shared/schemas/enums'
import type { Outcome } from '../battle/outcome'
import type { SfxName } from './sfx'

/** 어떤 장면에서 어떤 효과음을 낼지 정하는 순수 규칙. 화면 코드는 여기 결과만 재생한다. */

const OUTCOME_CUE: Record<Outcome, SfxName> = {
  STRONG: 'hit-strong',
  NORMAL: 'hit-normal',
  LIMITED: 'block',
  MISS: 'miss',
}

export const outcomeCue = (outcome: Outcome): SfxName => OUTCOME_CUE[outcome]

/** 플레이어는 자기 결과대로, 공용 화면은 승자가 있으면 팡파르. 무승부는 둘 다 lose. */
export const resultCue = (winner: PlayerSlot | null | undefined, you: PlayerSlot | null): SfxName => {
  if (!winner) return 'lose'
  if (you === null) return 'win'
  return winner === you ? 'win' : 'lose'
}

export interface RoundMarker {
  phase: MatchPhase
  roundId: number
}

/** 입력 단계에 새로 들어올 때만 true. 재접속으로 재생 도중 처음 본 상태는 울리지 않는다. */
export const roundStartCue = (prev: RoundMarker | null, next: RoundMarker): boolean => {
  if (next.phase !== 'ROUND_INPUT') return false
  if (prev === null) return true
  return prev.phase !== 'ROUND_INPUT' || prev.roundId !== next.roundId
}
