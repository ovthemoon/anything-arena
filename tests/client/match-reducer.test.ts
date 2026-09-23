import { describe, expect, test } from 'vitest'
import { initialClientState, reduce } from '../../src/client/state/match-reducer'

describe('match reducer', () => {
  test('room_snapshot sets match and slot', () => {
    const s = reduce(initialClientState, { type: 'room_snapshot', you: 'B', state: { roomCode: 'R', matchId: 'm', phase: 'LOBBY', roundId: 0, deadlineAt: null, players: {} as never, history: [], winner: null, eventSeq: 0, rulesetVersion: 'v0.1' } })
    expect(s.you).toBe('B'); expect(s.match?.roomCode).toBe('R')
  })
  test('commentary older than current match is dropped', () => {
    const base = reduce(initialClientState, { type: 'room_snapshot', you: 'A', state: { roomCode: 'R', matchId: 'm2', phase: 'ROUND_PLAYBACK', roundId: 1, deadlineAt: null, players: {} as never, history: [], winner: null, eventSeq: 1, rulesetVersion: 'v0.1' } })
    const s = reduce(base, { type: 'commentary_ready', matchId: 'm1', eventId: 'e', text: 'x', audioPath: null, validUntil: 9 })
    expect(Object.keys(s.commentary)).toHaveLength(0)
  })
  test('input_rejected stores reason for own action', () => {
    const s = reduce(initialClientState, { type: 'input_rejected', actionId: 'a1', reasonCode: 'REWRITE', canRetry: true })
    expect(s.rejected).toEqual({ reasonCode: 'REWRITE', canRetry: true })
  })
  test('room_snapshot accepts SCREEN role', () => {
    const s = reduce(initialClientState, { type: 'room_snapshot', you: 'SCREEN', state: { roomCode: 'R', matchId: 'm', phase: 'LOBBY', roundId: 0, deadlineAt: null, players: {} as never, history: [], winner: null, eventSeq: 0, rulesetVersion: 'v0.1' } })
    expect(s.you).toBe('SCREEN')
  })
})
