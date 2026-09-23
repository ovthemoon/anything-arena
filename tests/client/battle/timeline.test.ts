import { describe, expect, test } from 'vitest'
import { STEP_MS, buildAttackTimeline, totalMs } from '../../../src/client/battle/timeline'

describe('buildAttackTimeline', () => {
  test('full motion: six steps in order, readable pacing under 7 seconds', () => {
    const steps = buildAttackTimeline(false)
    expect(steps.map((s) => s.kind)).toEqual(['name', 'windup', 'travel', 'freeze', 'result', 'commentary'])
    expect(totalMs(steps)).toBe(2200 + 300 + 600 + 80 + 900 + 2500)
    expect(totalMs(steps)).toBeLessThanOrEqual(7000)
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

describe('buildAttackTimeline finishing blow', () => {
  test('slows the travel and holds the freeze longer', () => {
    const normal = buildAttackTimeline(false)
    const finishing = buildAttackTimeline(false, { isFinishing: true })
    expect(finishing.map((s) => s.kind)).toEqual(normal.map((s) => s.kind))
    expect(finishing.find((s) => s.kind === 'travel')?.ms).toBeGreaterThan(STEP_MS.travel)
    expect(finishing.find((s) => s.kind === 'freeze')?.ms).toBeGreaterThan(STEP_MS.freeze)
  })

  test('holds the result long enough for the bigger damage number', () => {
    const finishing = buildAttackTimeline(false, { isFinishing: true })
    expect(finishing.find((s) => s.kind === 'result')?.ms).toBeGreaterThanOrEqual(900)
  })

  test('reduced motion ignores the slow-mo', () => {
    expect(buildAttackTimeline(true, { isFinishing: true })).toEqual(buildAttackTimeline(true))
  })
})
