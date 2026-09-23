import { describe, expect, test } from 'vitest'
import { displayedHp } from '../../../src/client/battle/hp-display'
import type { RoundResolved } from '../../../src/shared/schemas/match'

const attack = (actor: 'A' | 'B', damage: 20 | 30 | 40) => ({
  eventId: `e-${actor}`,
  actor,
  target: actor === 'A' ? 'B' : 'A',
  techniqueLabel: 't',
  approvedActionText: 'x',
  effectiveness: 'NORMAL' as const,
  damage,
  animation: 'DASH' as const,
  cosmeticTags: [],
  reasonCode: 'NORMAL',
})

const playback: RoundResolved = {
  type: 'round_resolved',
  matchId: 'm',
  roundId: 1,
  eventSeq: 3,
  rulesetVersion: 'v',
  hpBefore: { A: 100, B: 100 },
  hpAfter: { A: 70, B: 60 },
  attacks: [attack('A', 40), attack('B', 30)],
  playbackOrder: ['A', 'B'],
  resolvedAt: 0,
}

describe('displayedHp', () => {
  test('no playback: server hp as-is', () => {
    expect(displayedHp({ index: null, attack: null, step: null, done: false }, null, 'A', 55)).toBe(55)
  })

  test('before the first result step both sides still show hpBefore', () => {
    const pb = { index: 0 as const, attack: playback.attacks[0], step: 'travel' as const, done: false }
    expect(displayedHp(pb, playback, 'B', 60)).toBe(100)
    expect(displayedHp(pb, playback, 'A', 70)).toBe(100)
  })

  test('at the first result step only the first target drops', () => {
    const pb = { index: 0 as const, attack: playback.attacks[0], step: 'result' as const, done: false }
    expect(displayedHp(pb, playback, 'B', 60)).toBe(60)
    expect(displayedHp(pb, playback, 'A', 70)).toBe(100)
  })

  test('during the second attack the first drop stays and the second waits for its result', () => {
    const pb = { index: 1 as const, attack: playback.attacks[1], step: 'windup' as const, done: false }
    expect(displayedHp(pb, playback, 'B', 60)).toBe(60)
    expect(displayedHp(pb, playback, 'A', 70)).toBe(100)
  })

  test('done: server hp', () => {
    const pb = { index: 1 as const, attack: playback.attacks[1], step: null, done: true }
    expect(displayedHp(pb, playback, 'A', 70)).toBe(70)
  })
})
