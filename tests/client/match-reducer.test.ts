import { describe, expect, test } from 'vitest'
import { initialClientState, reduce, reduceConnection, reduceOutgoing } from '../../src/client/state/match-reducer'
import { createMatch, toPublic } from '../../src/worker/game/engine'
import type { ClientMessage } from '../../src/shared/schemas/messages'

const lobby = () => reduce(initialClientState, { type: 'room_snapshot', you: 'A', state: toPublic(createMatch('ROOM', 'm', 0)) })
const battle = () => reduce(lobby(), { type: 'round_started', matchId: 'm', roundId: 1, deadlineAt: 15000 })
const action = (actionId = 'a1'): ClientMessage => ({ type: 'action_submit', matchId: 'm', roundId: 1, actionId, text: '숙제는 했냐' })
const weapon: ClientMessage = { type: 'weapon_submit', requestId: 'w1', weapon: { nickname: '테스트', characterId: 'grandma', character: '', weaponName: '', description: '' } }

describe('match reducer', () => {
  test('nickname rejection and server errors unlock entry for another attempt', () => {
    const pending = reduceOutgoing(lobby(), weapon)
    expect(pending.pendingWeaponRequestId).toBe('w1')
    expect(reduceOutgoing(pending, weapon)).toBe(pending)
    const rejected = reduce(pending, { type: 'input_rejected', actionId: 'w1', reasonCode: 'MODERATION', canRetry: true })
    expect(rejected.pendingWeaponRequestId).toBeNull()
    const retry = reduceOutgoing(rejected, { ...weapon, requestId: 'w2' })
    expect(retry.pendingWeaponRequestId).toBe('w2')
    expect(retry.rejected).toBeNull()
    expect(reduce(retry, { type: 'error', code: 'INTERNAL', message: 'server error' }).pendingWeaponRequestId).toBeNull()
  })

  test('locks both free text and preset attacks immediately and keeps accepted attacks locked', () => {
    for (const message of [action(), { type: 'action_submit', matchId: 'm', roundId: 1, actionId: 'a1', techniqueId: 'preset' } as const]) {
      const pending = reduceOutgoing(battle(), message)
      expect(pending.match?.players.A.actionStatus).toBe('VALIDATING')
      expect(reduceOutgoing(pending, action('duplicate'))).toBe(pending)
      const accepted = reduce(pending, { type: 'action_accepted', actionId: 'a1' })
      expect(accepted.match?.players.A.actionStatus).toBe('ACCEPTED')
      expect(reduceOutgoing(accepted, action('duplicate'))).toBe(accepted)
    }
  })

  test('rejection allows a retry without old responses unlocking the new action', () => {
    const pending = reduceOutgoing(battle(), action())
    const rejected = reduce(pending, { type: 'input_rejected', actionId: 'a1', reasonCode: 'FOUL', canRetry: true })
    expect(rejected.match?.players.A.actionStatus).toBe('REJECTED')
    const retry = reduceOutgoing(rejected, action('a2'))
    expect(retry.match?.players.A.actionStatus).toBe('VALIDATING')
    expect(retry.rejected).toBeNull()
    expect(reduce(retry, { type: 'input_rejected', actionId: 'a1', reasonCode: 'FOUL', canRetry: true })).toBe(retry)
    expect(reduce(retry, { type: 'action_accepted', actionId: 'a1' })).toBe(retry)
  })

  test('unrelated snapshots do not unlock an attack being judged', () => {
    const base = battle()
    const pending = reduceOutgoing(base, action())
    const snapshot = reduce(pending, { type: 'room_snapshot', you: 'A', state: base.match! })
    expect(snapshot.match?.players.A.actionStatus).toBe('VALIDATING')
  })

  test('next round resets submission state and ignores late acceptance', () => {
    const accepted = reduce(reduceOutgoing(battle(), action()), { type: 'action_accepted', actionId: 'a1' })
    const next = reduce(accepted, { type: 'round_started', matchId: 'm', roundId: 2, deadlineAt: 30000 })
    expect(next.match?.players.A.actionStatus).toBe('NONE')
    expect(next.lastActionId).toBeNull()
    expect(reduce(next, { type: 'action_accepted', actionId: 'a1' })).toBe(next)
  })

  test('reconnect accepts a delayed acknowledgement and can recover an unprocessed action', () => {
    const base = battle()
    const pending = reduceOutgoing(base, action())
    const reconnected = reduceConnection(reduceConnection(pending, 'reconnecting'), 'open')
    const snapshot = reduce(reconnected, { type: 'room_snapshot', you: 'A', state: base.match! })
    expect(snapshot.match?.players.A.actionStatus).toBe('NONE')
    expect(reduce(snapshot, { type: 'action_accepted', actionId: 'a1' }).match?.players.A.actionStatus).toBe('ACCEPTED')
  })
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
