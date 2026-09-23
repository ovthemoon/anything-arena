import { describe, expect, test } from 'vitest'
import { BANNER_MS, bannerStageAt } from '../../../src/client/battle/round-banner'

describe('bannerStageAt', () => {
  test('shows the round number first, then the fight call, then nothing', () => {
    expect(bannerStageAt(0)).toBe('round')
    expect(bannerStageAt(BANNER_MS.round - 1)).toBe('round')
    expect(bannerStageAt(BANNER_MS.round)).toBe('fight')
    expect(bannerStageAt(BANNER_MS.round + BANNER_MS.fight - 1)).toBe('fight')
    expect(bannerStageAt(BANNER_MS.round + BANNER_MS.fight)).toBeNull()
  })

  test('total is short enough not to eat the input window', () => {
    expect(BANNER_MS.round + BANNER_MS.fight).toBeLessThanOrEqual(1600)
  })
})
