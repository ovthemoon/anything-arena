import { describe, expect, test } from 'vitest'
import { STEP_MS, buildAttackTimeline, totalMs } from '../../../src/client/battle/timeline'

describe('buildAttackTimeline', () => {
  test('full motion: six steps in order summing to about 3 seconds', () => {
    const steps = buildAttackTimeline(false)
    expect(steps.map((s) => s.kind)).toEqual(['name', 'windup', 'travel', 'freeze', 'result', 'commentary'])
    expect(totalMs(steps)).toBe(400 + 300 + 600 + 80 + 700 + 900)
    expect(totalMs(steps)).toBeLessThanOrEqual(3000)
  })

  test('reduced motion shortens travel and removes freeze but keeps every step', () => {
    const steps = buildAttackTimeline(true)
    expect(steps.map((s) => s.kind)).toEqual(['name', 'windup', 'travel', 'freeze', 'result', 'commentary'])
    const travel = steps.find((s) => s.kind === 'travel')
    const freeze = steps.find((s) => s.kind === 'freeze')
    expect(travel?.ms).toBeLessThan(STEP_MS.travel)
    expect(freeze?.ms).toBe(0)
    expect(totalMs(steps)).toBeLessThan(totalMs(buildAttackTimeline(false)))
  })

  test('returns a fresh array each call', () => {
    expect(buildAttackTimeline(false)).not.toBe(buildAttackTimeline(false))
  })
})
