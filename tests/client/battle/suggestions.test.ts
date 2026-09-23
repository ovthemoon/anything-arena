import { describe, expect, test } from 'vitest'
import { pickSuggestions } from '../../../src/client/battle/suggestions'

const items = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}` }))

describe('pickSuggestions', () => {
  test('returns the requested count and is deterministic for the same seed', () => {
    const a = pickSuggestions(items, 'm1:2:A', 0, 3)
    const b = pickSuggestions(items, 'm1:2:A', 0, 3)
    expect(a).toHaveLength(3)
    expect(a.map((t) => t.id)).toEqual(b.map((t) => t.id))
    expect(new Set(a.map((t) => t.id)).size).toBe(3)
  })

  test('different seeds or shuffle offsets give a different set', () => {
    const base = pickSuggestions(items, 'm1:2:A', 0, 3).map((t) => t.id)
    const otherRound = pickSuggestions(items, 'm1:3:A', 0, 3).map((t) => t.id)
    const shuffled = pickSuggestions(items, 'm1:2:A', 1, 3).map((t) => t.id)
    expect(otherRound).not.toEqual(base)
    expect(shuffled).not.toEqual(base)
  })

  test('returns everything when there are fewer items than requested, without mutating input', () => {
    const two = [{ id: 'a' }, { id: 'b' }]
    const copy = [...two]
    expect(pickSuggestions(two, 'x', 0, 3)).toHaveLength(2)
    expect(two).toEqual(copy)
  })
})

describe('pickTargetedSuggestions', () => {
  const t = (id: string, hitsWeakPoint?: boolean) => ({ id, hitsWeakPoint })
  test('mixes 2 targeted and 1 own-voice when both exist', async () => {
    const { pickTargetedSuggestions } = await import('../../../src/client/battle/suggestions')
    const items = [t('v1', true), t('v2', true), t('v3', true), t('o1'), t('o2'), t('o3')]
    const picked = pickTargetedSuggestions(items, 'seed', 0)
    expect(picked).toHaveLength(3)
    expect(picked.filter((p) => p.hitsWeakPoint)).toHaveLength(2)
  })
  test('falls back to the plain pick when nothing is targeted', async () => {
    const { pickTargetedSuggestions } = await import('../../../src/client/battle/suggestions')
    const items = [t('o1'), t('o2'), t('o3'), t('o4')]
    expect(pickTargetedSuggestions(items, 'seed', 0)).toHaveLength(3)
  })
})
