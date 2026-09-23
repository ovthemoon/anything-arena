import { describe, expect, test } from 'vitest'
import { existsSync } from 'node:fs'
import { ROSTER, characterIdFor, poseUrl } from '../../../src/client/battle/characters'

describe('roster', () => {
  test('lists all six characters with 5-pose urls', () => {
    expect(ROSTER.map((c) => c.id)).toEqual(['grandma', 'jaemmin', 'daeri', 'alba', 'chongmu', 'wonjang'])
    expect(poseUrl('grandma', 'idle')).toBe('/assets/characters/grandma/idle.png')
    expect(poseUrl('jaemmin', 'win')).toBe('/assets/characters/jaemmin/win.png')
    expect(poseUrl('wonjang', 'attack')).toBe('/assets/characters/wonjang/attack.png')
  })

  test('every selectable character has an existing image for every pose', () => {
    for (const character of ROSTER) {
      for (const pose of ['idle', 'attack', 'hit', 'win', 'lose'] as const) {
        expect(existsSync(`public${poseUrl(character.id, pose)}`)).toBe(true)
      }
    }
  })

  test('characterIdFor prefers player.characterId when it is in the roster', () => {
    expect(characterIdFor({ slot: 'A', characterId: 'jaemmin' }, 'A')).toBe('jaemmin')
  })

  test('characterIdFor falls back to slot default when characterId is missing or unknown', () => {
    expect(characterIdFor({ slot: 'A' }, 'A')).toBe('grandma')
    expect(characterIdFor({ slot: 'B', characterId: 'nobody' }, 'B')).toBe('jaemmin')
    expect(characterIdFor(undefined, 'B')).toBe('jaemmin')
  })
})
