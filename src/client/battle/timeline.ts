export type StepKind = 'name' | 'windup' | 'travel' | 'freeze' | 'result' | 'commentary'

export interface PlaybackStep {
  kind: StepKind
  ms: number
}

/**
 * 스펙 §3 기준에서 읽는 시간을 늘린 값. 합계 6,580ms.
 * name(긁는 한 마디 말풍선)과 commentary(해설 자막)는 한국어 30~50자를 읽을 시간이 필요하다
 * (사용자 피드백 2026-09-23: "텍스트 넘어가는 속도가 너무 빠르다").
 * 서버의 라운드 간 대기(PLAYBACK_DELAY_MS)는 이 합계 × 2 보다 커야 한다.
 */
export const STEP_MS: Record<StepKind, number> = {
  name: 2200,
  windup: 300,
  travel: 600,
  freeze: 80,
  result: 900,
  commentary: 2500,
}

const ORDER: readonly StepKind[] = ['name', 'windup', 'travel', 'freeze', 'result', 'commentary']

const REDUCED_TRAVEL_MS = 200

export const buildAttackTimeline = (reducedMotion: boolean): PlaybackStep[] =>
  ORDER.map((kind) => {
    if (reducedMotion && kind === 'travel') return { kind, ms: REDUCED_TRAVEL_MS }
    if (reducedMotion && kind === 'freeze') return { kind, ms: 0 }
    return { kind, ms: STEP_MS[kind] }
  })

export const totalMs = (steps: readonly PlaybackStep[]): number => steps.reduce((sum, s) => sum + s.ms, 0)
