import { describe, expect, test } from 'vitest'
import { LIMITS, countChars } from '../../src/shared/rules/limits'
import { ROSTER, characterCard } from '../../src/shared/rules/roster'
import { matchupRoasts } from '../../src/shared/rules/matchups'
import { WeaponProfile } from '../../src/shared/schemas/weapon'
import { hitsBlocklist } from '../../src/worker/moderation/blocklist'
import type { CharacterId } from '../../src/shared/schemas/enums'

const ids = Object.keys(ROSTER) as CharacterId[]

describe('matchup roasts (ko)', () => {
  test('every ordered pair has at least 3 roasts within limits and off the blocklist', () => {
    for (const a of ids) {
      for (const d of ids) {
        if (a === d) continue
        const roasts = matchupRoasts(a, d, 'ko')
        expect(roasts.length, `${a} → ${d}`).toBeGreaterThanOrEqual(3)
        for (const r of roasts) {
          expect(countChars(r.text), `${a} → ${d}: ${r.text}`).toBeLessThanOrEqual(LIMITS.ACTION_TEXT)
          expect(countChars(r.label)).toBeLessThanOrEqual(20)
          expect(hitsBlocklist(r.text), `${a} → ${d}: ${r.text}`).toBe(false)
        }
      }
    }
  })

  test('same character or unknown language yields nothing', () => {
    expect(matchupRoasts('grandma', 'grandma', 'ko')).toEqual([])
    expect(matchupRoasts('grandma', 'jaemmin', 'en')).toEqual([])
  })

  test('characterCard with an opponent puts targeted roasts first and stays a valid card', () => {
    const card = characterCard('grandma', 'm1', 'ko', 'daeri')
    expect(WeaponProfile.safeParse(card).success).toBe(true)
    expect(card.techniques.length).toBeLessThanOrEqual(10)
    const targeted = card.techniques.filter((t) => t.hitsWeakPoint)
    expect(targeted.length).toBe(matchupRoasts('grandma', 'daeri', 'ko').length)
    expect(card.techniques.slice(0, targeted.length).every((t) => t.id.startsWith('grandma-vs-daeri-'))).toBe(true)
    expect(card.techniques.slice(targeted.length).every((t) => !t.hitsWeakPoint)).toBe(true)
  })

  test('characterCard without an opponent carries only the own-voice pool', () => {
    const card = characterCard('grandma', 'm1')
    expect(card.techniques.some((t) => t.hitsWeakPoint)).toBe(false)
  })
})
