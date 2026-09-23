import { describe, expect, test } from 'vitest'
import { damageFor, DEFAULT_ATTACK_DAMAGE } from '../../src/shared/rules/damage'

describe('damageFor', () => {
  test('maps effectiveness to fixed damage', () => {
    expect(damageFor('MISS')).toBe(0)
    expect(damageFor('LIMITED')).toBe(20)
    expect(damageFor('NORMAL')).toBe(30)
    expect(damageFor('STRONG')).toBe(40)
  })
  test('default attack is 30', () => {
    expect(DEFAULT_ATTACK_DAMAGE).toBe(30)
  })
})
