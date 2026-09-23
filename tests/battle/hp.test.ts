import { describe, expect, test } from 'vitest'
import { applyDamage } from '../../src/shared/rules/hp'

describe('applyDamage', () => {
  test('subtracts damage from hp', () => {
    expect(applyDamage(100, 30)).toBe(70)
  })

  test('never goes below zero', () => {
    expect(applyDamage(10, 30)).toBe(0)
  })

  test('throws on negative damage', () => {
    expect(() => applyDamage(100, -5)).toThrow()
  })
})
