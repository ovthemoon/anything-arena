import { describe, expect, test } from 'vitest'
import { STRINGS } from '../../../src/client/i18n/strings'

const shape = (value: unknown): unknown => {
  if (typeof value === 'function') return 'fn'
  if (typeof value === 'string') return 'str'
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]))
  return typeof value
}

const leaves = (value: unknown, path = ''): string[] => {
  if (typeof value === 'string') return [`${path}=${value}`]
  if (typeof value === 'function') return [`${path}=${String((value as (...a: never[]) => unknown)(('x' as unknown) as never))}`]
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
  return []
}

describe('ui strings', () => {
  test('ko and en have identical key shapes', () => {
    expect(shape(STRINGS.en)).toEqual(shape(STRINGS.ko))
  })
  test('english strings contain no Hangul (except the toggle that names the other language)', () => {
    for (const leaf of leaves(STRINGS.en).filter((l) => !l.startsWith('langToggle'))) expect(leaf).not.toMatch(/[가-힣]/)
  })
  test('korean strings are not accidentally english copies', () => {
    const ko = leaves(STRINGS.ko).filter((l) => !/=(READY|ROUND|🔀)/.test(l) && !l.startsWith('langToggle'))
    expect(ko.some((l) => /[가-힣]/.test(l))).toBe(true)
  })
})
