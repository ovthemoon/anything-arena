import { describe, expect, test } from 'vitest'
import { createMatch, resolveRound, setReady, setWeapon, toPublic } from '../../src/worker/game/engine'
import { characterCard } from '../../src/shared/rules/roster'
import { FROZEN_ACTION_BY_LANG } from '../../src/shared/rules/constants'
import { PublicMatchState } from '../../src/shared/schemas/match'

const armed = (lang: 'ko' | 'en') => {
  const base = createMatch('ROOM', 'm1', 1000, null, lang)
  const withA = setWeapon(base, 'A', characterCard('grandma', 'm1', lang), 'A')
  const withB = setWeapon(withA, 'B', characterCard('jaemmin', 'm1', lang), 'B')
  return setReady(setReady(withB, 'A', 1000), 'B', 1000)
}

describe('match language', () => {
  test('createMatch defaults to ko and keeps an explicit en', () => {
    expect(createMatch('R', 'm', 0).lang).toBe('ko')
    expect(createMatch('R', 'm', 0, null, 'en').lang).toBe('en')
  })
  test('public state carries lang and old snapshots without it still parse as ko', () => {
    expect(toPublic(createMatch('R', 'm', 0, null, 'en')).lang).toBe('en')
    const { lang: _l, ...legacy } = toPublic(createMatch('R', 'm', 0))
    expect(PublicMatchState.parse(legacy).lang).toBe('ko')
  })
  test('timeout fallback attack is worded in the match language', () => {
    const { resolved } = resolveRound(armed('en'), 2000)
    expect(resolved.attacks[0].fallbackReason).toBe('TIMEOUT')
    expect(resolved.attacks[0].techniqueLabel).toBe(FROZEN_ACTION_BY_LANG.en.label)
    expect(resolved.attacks[0].approvedActionText).not.toMatch(/[가-힣]/)
    const ko = resolveRound(armed('ko'), 2000).resolved
    expect(ko.attacks[0].techniqueLabel).toBe(FROZEN_ACTION_BY_LANG.ko.label)
  })
})
