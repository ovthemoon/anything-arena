import { describe, expect, test } from 'vitest'
import { WeaponInput, WeaponProfile } from '../../src/shared/schemas/weapon'
import { JudgeResult } from '../../src/shared/schemas/judge'
import { ClientMessage } from '../../src/shared/schemas/messages'

describe('schemas', () => {
  test('rejects weapon name over 30 chars', () => {
    const r = WeaponInput.safeParse({ nickname: 'a', weaponName: '가'.repeat(31), description: '' })
    expect(r.success).toBe(false)
  })
  test('weapon profile needs exactly 2 techniques and 1-2 capabilities', () => {
    const base = { id: 'w1', version: 1, displayName: '젖은 양말', tagline: '축축함', capabilities: ['수분 전달'], weakness: '열', visualTag: 'WET' }
    expect(WeaponProfile.safeParse({ ...base, techniques: [] }).success).toBe(false)
    const tech = { id: 't1', name: '젖은 회전타', actionText: '양말을 휘둘러 물을 튀긴다', animation: 'DASH' }
    expect(WeaponProfile.safeParse({ ...base, techniques: [tech, { ...tech, id: 't2' }] }).success).toBe(true)
  })
  test('judge result rejects unknown enum value', () => {
    const r = JudgeResult.safeParse({ moderation: 'ALLOW', moderationReason: 'NORMAL', validity: 'VALID', effectiveness: 'HUGE', animation: 'DASH', reasonCode: 'NORMAL' })
    expect(r.success).toBe(false)
  })
  test('action_submit requires techniqueId or text', () => {
    expect(ClientMessage.safeParse({ type: 'action_submit', matchId: 'm', roundId: 1, actionId: 'a1', techniqueId: 't1' }).success).toBe(true)
    expect(ClientMessage.safeParse({ type: 'action_submit', matchId: 'm', roundId: 1, actionId: 'a1' }).success).toBe(false)
  })
})
