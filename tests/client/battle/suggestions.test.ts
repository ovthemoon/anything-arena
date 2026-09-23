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
