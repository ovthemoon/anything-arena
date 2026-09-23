import { describe, expect, test } from 'vitest'
import { ROSTER, characterIdFor, poseUrl } from '../../../src/client/battle/characters'

describe('roster', () => {
  test('has grandma and jaemmin with 5-pose urls', () => {
    expect(ROSTER.map((c) => c.id)).toEqual(['grandma', 'jaemmin'])
    expect(poseUrl('grandma', 'idle')).toBe('/assets/characters/grandma/idle.png')
    expect(poseUrl('jaemmin', 'win')).toBe('/assets/characters/jaemmin/win.png')
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
