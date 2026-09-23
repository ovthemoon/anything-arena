import { describe, expect, test } from 'vitest'
import { outcomeCue, resultCue, roundStartCue } from '../../../src/client/audio/cues'

describe('outcomeCue', () => {
  test.each([
    ['STRONG', 'hit-strong'],
    ['NORMAL', 'hit-normal'],
    ['LIMITED', 'block'],
    ['MISS', 'miss'],
  ] as const)('%s → %s', (outcome, cue) => {
    expect(outcomeCue(outcome)).toBe(cue)
  })
})

describe('resultCue', () => {
  test('player who won hears win, the other hears lose', () => {
    expect(resultCue('A', 'A')).toBe('win')
    expect(resultCue('A', 'B')).toBe('lose')
  })
  test('draw is lose for players', () => {
    expect(resultCue(null, 'A')).toBe('lose')
  })
  test('shared screen hears win whenever someone won, lose on a draw', () => {
    expect(resultCue('B', null)).toBe('win')
    expect(resultCue(null, null)).toBe('lose')
  })
})

describe('roundStartCue', () => {
  test('fires when phase enters ROUND_INPUT', () => {
    expect(roundStartCue({ phase: 'PREPARING', roundId: 1 }, { phase: 'ROUND_INPUT', roundId: 1 })).toBe(true)
  })
  test('fires again on the next round even if phase string is unchanged', () => {
    expect(roundStartCue({ phase: 'ROUND_INPUT', roundId: 1 }, { phase: 'ROUND_INPUT', roundId: 2 })).toBe(true)
  })
  test('does not fire on an unrelated re-render', () => {
    expect(roundStartCue({ phase: 'ROUND_INPUT', roundId: 2 }, { phase: 'ROUND_INPUT', roundId: 2 })).toBe(false)
  })
  test('does not fire when first seen mid-battle (reconnect into playback)', () => {
    expect(roundStartCue(null, { phase: 'ROUND_PLAYBACK', roundId: 3 })).toBe(false)
  })
})
