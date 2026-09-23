export type StepKind = 'name' | 'windup' | 'travel' | 'freeze' | 'result' | 'commentary'

export interface PlaybackStep {
  kind: StepKind
  ms: number
}

/** 스펙 §3. 합계 2980ms. */
export const STEP_MS: Record<StepKind, number> = {
  name: 400,
  windup: 300,
  travel: 600,
  freeze: 80,
  result: 700,
  commentary: 900,
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
