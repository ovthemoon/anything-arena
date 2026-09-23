import { describe, expect, test, vi } from 'vitest'
import { generateWeaponWithOpenRouter } from '../../src/worker/ai/weapon-gen'

const validOutput = {
  characterName: '빨래 못 말린 자취생',
  tagline: '축축한 존재감',
  capabilities: ['수분 전달'],
  weakness: '열',
  visualTag: 'WET',
  techniques: [
    { name: '회전타', actionText: '양말을 휘둘러 물을 튀긴다', animation: 'DASH' },
    { name: '수분 방출', actionText: '물방울을 흩뿌린다', animation: 'PROJECTILE' },
  ],
}

const input = { nickname: 'n', character: '', weaponName: '젖은 양말', description: '' }
const ctx = { matchId: 'm1', slot: 'A' as const }

describe('generateWeaponWithOpenRouter', () => {
  test('returns a valid WeaponProfile on success', async () => {
    const or = { chatJson: vi.fn().mockResolvedValue(validOutput), speech: vi.fn() }
    const profile = await generateWeaponWithOpenRouter(or as never, 'm', input, ctx)
    expect(profile.techniques).toHaveLength(2)
    expect(profile.visualTag).toBe('WET')
    expect(profile.capabilities.length).toBeLessThanOrEqual(2)
    expect(profile.displayName).toBe('젖은 양말')
    expect(profile.characterName).toBe('빨래 못 말린 자취생')
  })

  test('retries once on schema failure then uses second response', async () => {
    const or = {
      chatJson: vi
        .fn()
        .mockRejectedValueOnce(new Error('bad schema'))
        .mockResolvedValueOnce(validOutput),
      speech: vi.fn(),
    }
    const profile = await generateWeaponWithOpenRouter(or as never, 'm', input, ctx)
    expect(profile.techniques).toHaveLength(2)
    expect(or.chatJson).toHaveBeenCalledTimes(2)
  })

  test('throws after two consecutive failures', async () => {
    const or = { chatJson: vi.fn().mockRejectedValue(new Error('bad schema')), speech: vi.fn() }
    await expect(generateWeaponWithOpenRouter(or as never, 'm', input, ctx)).rejects.toThrow()
    expect(or.chatJson).toHaveBeenCalledTimes(2)
  })
})
