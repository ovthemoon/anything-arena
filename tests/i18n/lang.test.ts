import { describe, expect, test } from 'vitest'
import { langFromLocale, parseLang } from '../../src/shared/i18n/lang'

describe('parseLang', () => {
  test('accepts supported languages', () => {
    expect(parseLang('ko')).toBe('ko')
    expect(parseLang('en')).toBe('en')
  })
  test('falls back to ko for unknown or missing values', () => {
    expect(parseLang('fr')).toBe('ko')
    expect(parseLang(null)).toBe('ko')
    expect(parseLang(undefined)).toBe('ko')
  })
})

describe('langFromLocale', () => {
  test('maps Korean locales to ko and everything else to en', () => {
    expect(langFromLocale('ko-KR')).toBe('ko')
    expect(langFromLocale('KO')).toBe('ko')
    expect(langFromLocale('en-US')).toBe('en')
    expect(langFromLocale('ja')).toBe('en')
    expect(langFromLocale(undefined)).toBe('en')
  })
})
