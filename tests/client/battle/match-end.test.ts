import { describe, expect, test } from 'vitest'
import { matchEndStage } from '../../../src/client/battle/match-end'

describe('matchEndStage', () => {
  test('stays in battle while the last round is still playing', () => {
    expect(matchEndStage({ phase: 'FINISHED', isPlayingOut: true, koDone: false })).toBe('battle')
  })

  test('shows the KO cut-in once playback is over', () => {
    expect(matchEndStage({ phase: 'FINISHED', isPlayingOut: false, koDone: false })).toBe('ko')
  })

  test('moves to the result after the cut-in', () => {
    expect(matchEndStage({ phase: 'FINISHED', isPlayingOut: false, koDone: true })).toBe('result')
  })

  test('CLOSED goes straight to result', () => {
    expect(matchEndStage({ phase: 'CLOSED', isPlayingOut: false, koDone: false })).toBe('result')
  })

  test('other phases are not an ending', () => {
    expect(matchEndStage({ phase: 'ROUND_INPUT', isPlayingOut: false, koDone: false })).toBeNull()
  })
})
