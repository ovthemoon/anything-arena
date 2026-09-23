import { describe, expect, test } from 'vitest'
import { outcomeFx, outcomeOf, weaponImageUrlOf } from '../../../src/client/battle/outcome'

describe('outcomeOf', () => {
  test('maps effectiveness tiers', () => {
    expect(outcomeOf({ effectiveness: 'STRONG', damage: 40 })).toBe('STRONG')
    expect(outcomeOf({ effectiveness: 'NORMAL', damage: 30 })).toBe('NORMAL')
    expect(outcomeOf({ effectiveness: 'LIMITED', damage: 20 })).toBe('LIMITED')
  })

  test('treats MISS effectiveness or zero damage as MISS', () => {
    expect(outcomeOf({ effectiveness: 'MISS', damage: 0 })).toBe('MISS')
    expect(outcomeOf({ effectiveness: 'NORMAL', damage: 0 })).toBe('MISS')
  })

  test('unknown effectiveness with damage falls back to NORMAL', () => {
    expect(outcomeOf({ effectiveness: 'WHATEVER', damage: 30 })).toBe('NORMAL')
  })
})

describe('outcomeFx', () => {
  test('STRONG hits hardest and shows damage', () => {
    const fx = outcomeFx('STRONG')
    expect(fx.targetPose).toBe('hit')
    expect(fx.label).toBe('쾅!')
    expect(fx.showDamage).toBe(true)
    expect(fx.shakePx).toBeGreaterThan(outcomeFx('NORMAL').shakePx)
  })

  test('LIMITED keeps idle pose, pushes back, small shake', () => {
    const fx = outcomeFx('LIMITED')
    expect(fx.targetPose).toBe('idle')
    expect(fx.label).toBe('막았다!')
    expect(fx.targetShift.x).toBeGreaterThan(0)
    expect(fx.shakePx).toBeLessThan(outcomeFx('NORMAL').shakePx)
  })

  test('MISS slides sideways, no shake, no damage number', () => {
    const fx = outcomeFx('MISS')
    expect(fx.targetPose).toBe('idle')
    expect(fx.label).toBe('휙!')
    expect(fx.shakePx).toBe(0)
    expect(fx.showDamage).toBe(false)
    expect(fx.targetShift.x).toBeGreaterThan(outcomeFx('LIMITED').targetShift.x)
  })
})

describe('weaponImageUrlOf', () => {
  test('returns string imageUrl, otherwise null', () => {
    expect(weaponImageUrlOf({ imageUrl: '/api/assets/w.png' })).toBe('/api/assets/w.png')
    expect(weaponImageUrlOf({ imageUrl: null })).toBeNull()
    expect(weaponImageUrlOf({})).toBeNull()
    expect(weaponImageUrlOf(null)).toBeNull()
  })
})
