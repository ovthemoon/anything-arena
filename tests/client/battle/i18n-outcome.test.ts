import { describe, expect, test } from 'vitest'
import { outcomeFx } from '../../../src/client/battle/outcome'
import { characterOf, rosterFor } from '../../../src/client/battle/characters'

describe('outcomeFx by language', () => {
  test('labels follow the language while fx numbers stay identical', () => {
    for (const o of ['STRONG', 'NORMAL', 'LIMITED', 'MISS'] as const) {
      const ko = outcomeFx(o, 'ko')
      const en = outcomeFx(o, 'en')
      expect(en.label).not.toMatch(/[가-힣]/)
      expect(ko.label).toMatch(/[가-힣]/)
      expect({ ...en, label: '' }).toEqual({ ...ko, label: '' })
    }
  })
  test('defaults to Korean labels', () => {
    expect(outcomeFx('STRONG').label).toBe('쾅!')
  })
})

describe('character names by language', () => {
  test('rosterFor keeps ids and portraits, swaps names', () => {
    const ko = rosterFor('ko')
    const en = rosterFor('en')
    expect(en.map((c) => c.id)).toEqual(ko.map((c) => c.id))
    expect(en.map((c) => c.portrait)).toEqual(ko.map((c) => c.portrait))
    for (const c of en) {
      expect(c.name).not.toMatch(/[가-힣]/)
      expect(c.blurb).not.toMatch(/[가-힣]/)
    }
  })
  test('characterOf returns the localized short name', () => {
    expect(characterOf('grandma', 'en').name).toBe('Soup Granny')
    expect(characterOf('grandma').name).toBe('욕쟁이 할머니')
  })
})
