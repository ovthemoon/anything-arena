import { describe, expect, test } from 'vitest'
import { WeaponProfile } from '../../src/shared/schemas/weapon'
import { ROSTER, ROSTER_BY_LANG, characterCard, rosterDescription, rosterVoice } from '../../src/shared/rules/roster'

describe('roster', () => {
  test('every character builds a valid card with 2 suggested roasts', () => {
    for (const id of Object.keys(ROSTER) as Array<keyof typeof ROSTER>) {
      const card = characterCard(id, 'm1')
      expect(WeaponProfile.safeParse(card).success).toBe(true)
      expect(card.characterId).toBe(id)
      expect(card.techniques).toHaveLength(10)
      expect(new Set(card.techniques.map((x) => x.actionText)).size).toBe(10)
      for (const x of card.techniques) expect(Array.from(x.actionText).length).toBeLessThanOrEqual(60)
    }
  })
})

describe('roster voice', () => {
  test('every character has a tone, 2 catchphrases and 2 hates', () => {
    for (const entry of Object.values(ROSTER)) {
      expect(entry.voice.tone.length).toBeGreaterThan(0)
      expect(entry.voice.catchphrases).toHaveLength(2)
      expect(entry.voice.hates).toHaveLength(2)
    }
  })
})

describe('english roster', () => {
  test('every character builds a valid English card with 10 distinct roasts under 60 chars', () => {
    for (const id of Object.keys(ROSTER) as Array<keyof typeof ROSTER>) {
      const card = characterCard(id, 'm1', 'en')
      expect(WeaponProfile.safeParse(card).success).toBe(true)
      expect(card.characterId).toBe(id)
      expect(card.techniques).toHaveLength(10)
      expect(new Set(card.techniques.map((x) => x.actionText)).size).toBe(10)
      for (const x of card.techniques) {
        expect(Array.from(x.actionText).length).toBeLessThanOrEqual(60)
        expect(Array.from(x.name).length).toBeLessThanOrEqual(20)
      }
      expect(card.techniques.map((t) => t.id)).toEqual(characterCard(id, 'm1', 'ko').techniques.map((t) => t.id))
    }
  })
  test('english entries contain no Hangul', () => {
    for (const entry of Object.values(ROSTER_BY_LANG.en)) {
      expect(JSON.stringify(entry)).not.toMatch(/[가-힣]/)
      expect(entry.voice.catchphrases).toHaveLength(2)
      expect(entry.voice.hates).toHaveLength(2)
      expect(entry.weakPoints).toHaveLength(3)
    }
  })
  test('rosterVoice and rosterDescription follow the language', () => {
    expect(rosterDescription('grandma', 'en')).not.toMatch(/[가-힣]/)
    expect(rosterVoice('grandma', 'en')?.tone).not.toMatch(/[가-힣]/)
    expect(rosterVoice('grandma')?.tone).toMatch(/[가-힣]/)
  })
})
