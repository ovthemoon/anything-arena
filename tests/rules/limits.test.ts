import { describe, expect, test } from 'vitest'
import { countChars, isWithinLimit, LIMITS } from '../../src/shared/rules/limits'

describe('limits', () => {
  test('counts korean and emoji as one char each', () => {
    expect(countChars('젖은 양말')).toBe(5)
    expect(countChars('👟')).toBe(1)
  })
  test('trims surrounding whitespace before counting', () => {
    expect(countChars('  a  ')).toBe(1)
  })
  test('action text limit is 60', () => {
    expect(LIMITS.ACTION_TEXT).toBe(60)
    expect(isWithinLimit('a'.repeat(60), LIMITS.ACTION_TEXT)).toBe(true)
    expect(isWithinLimit('a'.repeat(61), LIMITS.ACTION_TEXT)).toBe(false)
  })
})
