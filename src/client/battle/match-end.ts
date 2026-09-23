import type { MatchPhase } from '../../shared/schemas/enums'

export type MatchEndStage = 'battle' | 'ko' | 'result'

export interface MatchEndInput {
  phase: MatchPhase | null
  /** 마지막 round_resolved 재생이 아직 진행 중 */
  isPlayingOut: boolean
  /** KO 컷인을 이미 보여줬다 */
  koDone: boolean
}

/** 경기 종료 후 화면 단계. 종료 국면이 아니면 null. */
export const matchEndStage = ({ phase, isPlayingOut, koDone }: MatchEndInput): MatchEndStage | null => {
  if (phase === 'CLOSED') return 'result'
  if (phase !== 'FINISHED') return null
  if (isPlayingOut) return 'battle'
  return koDone ? 'result' : 'ko'
}
