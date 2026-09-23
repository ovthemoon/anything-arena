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

/** 결정타(이 한 방으로 체력 0): 이동을 느리게, 충돌 정지를 길게 */
const FINISHING_TRAVEL_SCALE = 1.5
const FINISHING_FREEZE_MS = 260
/** 결정타 피해 숫자 애니메이션(900ms)이 잘리지 않게 결과 구간도 늘린다 */
const FINISHING_RESULT_MS = 900

export interface TimelineOptions {
  isFinishing?: boolean
}

export const buildAttackTimeline = (reducedMotion: boolean, { isFinishing = false }: TimelineOptions = {}): PlaybackStep[] => {
  // 동작 줄이기가 켜져 있으면 결정타 슬로우도 생략한다
  const isSlowMo = isFinishing && !reducedMotion
  return ORDER.map((kind) => {
    if (reducedMotion && kind === 'travel') return { kind, ms: REDUCED_TRAVEL_MS }
    if (reducedMotion && kind === 'freeze') return { kind, ms: 0 }
    if (isSlowMo && kind === 'travel') return { kind, ms: Math.round(STEP_MS.travel * FINISHING_TRAVEL_SCALE) }
    if (isSlowMo && kind === 'freeze') return { kind, ms: FINISHING_FREEZE_MS }
    if (isSlowMo && kind === 'result') return { kind, ms: FINISHING_RESULT_MS }
    return { kind, ms: STEP_MS[kind] }
  })
}

export const totalMs = (steps: readonly PlaybackStep[]): number => steps.reduce((sum, s) => sum + s.ms, 0)
