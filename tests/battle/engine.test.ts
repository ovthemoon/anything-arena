import { describe, expect, test } from 'vitest'
import { acceptAction, applyFoul, canSubmitCustom, createMatch, resolveRound, setReady, setWeapon, startRound, toPublic } from '../../src/worker/game/engine'
import { DEFAULT_WEAPONS } from '../../src/worker/game/default-weapons'
import type { JudgeResult } from '../../src/shared/schemas/judge'

const ok = (effectiveness: JudgeResult['effectiveness']): JudgeResult => ({ moderation: 'ALLOW', moderationReason: 'NORMAL', validity: 'VALID', effectiveness, animation: 'DASH', reasonCode: 'NORMAL' })

const readyMatch = () => {
  let s = createMatch('ROOM', 'm1', 1000)
  s = setWeapon(s, 'A', DEFAULT_WEAPONS[0], 'a')
  s = setWeapon(s, 'B', DEFAULT_WEAPONS[1], 'b')
  s = setReady(s, 'A', 1000); s = setReady(s, 'B', 1000)
  return s
}

describe('engine', () => {
  test('both ready starts round 1 with 15s deadline', () => {
    const s = readyMatch()
    expect(s.phase).toBe('ROUND_INPUT'); expect(s.roundId).toBe(1)
    expect(s.deadlineAt).toBe(1000 + 15000)
  })
  test('simultaneous damage: both lose hp, no first-strike bonus', () => {
    let s = readyMatch()
    s = acceptAction(s, 'A', { actionId: 'a1', label: 'x', text: 'x', judge: ok('STRONG') })
    s = acceptAction(s, 'B', { actionId: 'b1', label: 'y', text: 'y', judge: ok('LIMITED') })
    const { state, resolved } = resolveRound(s, 2000)
    expect(resolved.hpAfter).toEqual({ A: 80, B: 60 })
    expect(state.players.A.hp).toBe(80)
    expect(resolved.attacks.map((a) => a.damage)).toEqual([40, 20])
  })
  test('missing action becomes default attack of 30 with TIMEOUT reason', () => {
    let s = readyMatch()
    s = acceptAction(s, 'A', { actionId: 'a1', label: 'x', text: 'x', judge: ok('NORMAL') })
    const { resolved } = resolveRound(s, 2000)
    const b = resolved.attacks.find((a) => a.actor === 'B')!
    expect(b.damage).toBe(30); expect(b.fallbackReason).toBe('TIMEOUT')
  })
  test('finishes after 3 rounds and picks higher hp as winner', () => {
    let s = readyMatch()
    for (let r = 0; r < 3; r++) {
      if (r > 0) s = startRound(s, 3000 + r)
      s = acceptAction(s, 'A', { actionId: `a${r}`, label: 'x', text: 'x', judge: ok('STRONG') })
      s = acceptAction(s, 'B', { actionId: `b${r}`, label: 'y', text: 'y', judge: ok('LIMITED') })
      s = resolveRound(s, 3000 + r).state
    }
    expect(s.phase).toBe('FINISHED'); expect(s.winner).toBe('A')
    expect(s.players.A.hp).toBe(40); expect(s.players.B.hp).toBe(0)
  })
  test('tie is a draw', () => {
    let s = readyMatch()
    for (let r = 0; r < 3; r++) {
      if (r > 0) s = startRound(s, 3000 + r)
      s = acceptAction(s, 'A', { actionId: `a${r}`, label: 'x', text: 'x', judge: ok('NORMAL') })
      s = acceptAction(s, 'B', { actionId: `b${r}`, label: 'y', text: 'y', judge: ok('NORMAL') })
      s = resolveRound(s, 1).state
    }
    expect(s.phase).toBe('FINISHED'); expect(s.winner).toBeNull()
  })
  test('second foul switches player to preset-only', () => {
    let s = readyMatch()
    s = applyFoul(s, 'A'); expect(s.players.A.presetOnly).toBe(false)
    s = applyFoul(s, 'A'); expect(s.players.A.presetOnly).toBe(true)
    expect(canSubmitCustom(s, 'A')).toBe(false)
  })
  test('duplicate actionId is ignored', () => {
    let s = readyMatch()
    s = acceptAction(s, 'A', { actionId: 'a1', label: 'x', text: 'x', judge: ok('STRONG') })
    const again = acceptAction(s, 'A', { actionId: 'a1', label: 'x', text: 'x', judge: ok('LIMITED') })
    expect(again).toBe(s)
  })
  test('setReady does not mutate input and toPublic strips private fields', () => {
    const s = readyMatch()
    const pub = toPublic(s) as Record<string, unknown>
    expect(pub.pending).toBeUndefined(); expect(pub.customAttempts).toBeUndefined()
    expect(setReady(s, 'A', 5000)).toBe(s)
  })
})
