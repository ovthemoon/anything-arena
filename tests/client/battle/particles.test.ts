import { describe, expect, test } from 'vitest'
import { burstParticles } from '../../../src/client/battle/particles'

describe('burstParticles', () => {
  test('returns the requested number of particles', () => {
    expect(burstParticles(10, 1)).toHaveLength(10)
  })

  test('is deterministic for the same seed and differs across seeds', () => {
    expect(burstParticles(8, 3)).toEqual(burstParticles(8, 3))
    expect(burstParticles(8, 3)).not.toEqual(burstParticles(8, 4))
  })

  test('spreads particles around the full circle with unit-ish reach', () => {
    const ps = burstParticles(12, 7)
    const hasLeft = ps.some((p) => p.dx < -0.3)
    const hasRight = ps.some((p) => p.dx > 0.3)
    const hasUp = ps.some((p) => p.dy < -0.3)
    expect(hasLeft && hasRight && hasUp).toBe(true)
    for (const p of ps) {
      expect(Math.hypot(p.dx, p.dy)).toBeGreaterThan(0.5)
      expect(Math.hypot(p.dx, p.dy)).toBeLessThanOrEqual(1.0001)
      expect(p.size).toBeGreaterThan(0)
      expect(p.delayMs).toBeGreaterThanOrEqual(0)
    }
  })
})
