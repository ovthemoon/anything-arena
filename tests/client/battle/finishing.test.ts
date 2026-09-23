import { describe, expect, test } from 'vitest'
import type { AttackEvent, RoundResolved } from '../../../src/shared/schemas/match'
import { finishingIndex, matchEndKind } from '../../../src/client/battle/finishing'

const attack = (actor: 'A' | 'B', damage: 0 | 20 | 30 | 40): AttackEvent => ({
  eventId: `${actor}-${damage}`,
  actor,
  target: actor === 'A' ? 'B' : 'A',
  techniqueLabel: 't',
  approvedActionText: '',
  effectiveness: damage === 0 ? 'MISS' : 'NORMAL',
  damage,
  animation: 'DASH',
  cosmeticTags: [],
  reasonCode: 'x',
})

const round = (hpBefore: { A: number; B: number }, a: AttackEvent, b: AttackEvent, order: ['A', 'B'] | ['B', 'A']): RoundResolved => ({
  type: 'round_resolved',
  matchId: 'm',
  roundId: 1,
  eventSeq: 1,
  rulesetVersion: 'v',
  hpBefore,
  hpAfter: { A: hpBefore.A - b.damage, B: hpBefore.B - a.damage },
  attacks: [a, b],
  playbackOrder: order,
  resolvedAt: 0,
})

describe('finishingIndex', () => {
  test('returns null when nobody reaches zero', () => {
    expect(finishingIndex(round({ A: 100, B: 100 }, attack('A', 30), attack('B', 30), ['A', 'B']))).toBeNull()
  })

  test('returns the playback index of the attack that empties the target', () => {
    expect(finishingIndex(round({ A: 100, B: 30 }, attack('A', 30), attack('B', 30), ['A', 'B']))).toBe(0)
    expect(finishingIndex(round({ A: 100, B: 30 }, attack('A', 30), attack('B', 30), ['B', 'A']))).toBe(1)
  })

  test('first knockout wins when both would fall', () => {
    expect(finishingIndex(round({ A: 20, B: 20 }, attack('A', 30), attack('B', 30), ['B', 'A']))).toBe(0)
  })

  test('a miss never finishes', () => {
    expect(finishingIndex(round({ A: 100, B: 0 }, attack('A', 0), attack('B', 30), ['A', 'B']))).toBeNull()
  })
})

describe('matchEndKind', () => {
  test('KO when someone has no HP left', () => {
    expect(matchEndKind({ A: 40, B: 0 })).toBe('KO')
  })

  test('TIME_UP when both still stand', () => {
    expect(matchEndKind({ A: 40, B: 10 })).toBe('TIME_UP')
  })
})
