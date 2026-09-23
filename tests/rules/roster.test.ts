import { describe, expect, test } from 'vitest'
import { WeaponProfile } from '../../src/shared/schemas/weapon'
import { ROSTER, characterCard } from '../../src/shared/rules/roster'

describe('roster', () => {
  test('every character builds a valid card with 2 suggested roasts', () => {
    for (const id of Object.keys(ROSTER) as Array<keyof typeof ROSTER>) {
      const card = characterCard(id, 'm1')
      expect(WeaponProfile.safeParse(card).success).toBe(true)
      expect(card.characterId).toBe(id)
      expect(card.techniques).toHaveLength(2)
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
