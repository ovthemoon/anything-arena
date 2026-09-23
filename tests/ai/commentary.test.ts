import { describe, expect, test, vi } from 'vitest'
import { FALLBACK_COMMENTARY, generateCommentaryWithOpenRouter } from '../../src/worker/ai/commentary'
import { DEFAULT_WEAPONS } from '../../src/worker/game/default-weapons'

const event = {
  eventId: 'e1',
  actor: 'A' as const,
  target: 'B' as const,
  techniqueLabel: '축축한 최후의 일격',
  approvedActionText: '양말을 휘둘러 상대를 흠뻑 적신다',
  effectiveness: 'STRONG' as const,
  damage: 40 as const,
  animation: 'DASH' as const,
  cosmeticTags: [],
  reasonCode: 'WEAKNESS_MATCH',
}
const weapons = { A: DEFAULT_WEAPONS[0], B: DEFAULT_WEAPONS[1] }

describe('generateCommentaryWithOpenRouter', () => {
  test('sends damage, effectiveness and techniqueLabel in the user prompt', async () => {
    const chatJson = vi.fn().mockResolvedValue({ text: '강력한 일격!' })
    const or = { chatJson, speech: vi.fn() }
    await generateCommentaryWithOpenRouter(or as never, 'm', event, weapons)
    const userArg = chatJson.mock.calls[0][0].user
    const parsed = JSON.parse(userArg)
    expect(parsed.damage).toBe(40)
    expect(parsed.effectiveness).toBe('STRONG')
    expect(parsed.technique).toBe('축축한 최후의 일격')
    expect(parsed.attackerCharacter).toBe(DEFAULT_WEAPONS[0].characterName)
  })

  test('falls back when response exceeds 60 chars (no truncation)', async () => {
    const longText = '아'.repeat(61)
    const or = { chatJson: vi.fn().mockResolvedValue({ text: longText }), speech: vi.fn() }
    const result = await generateCommentaryWithOpenRouter(or as never, 'm', event, weapons)
    expect(FALLBACK_COMMENTARY).toContain(result)
  })

  test('falls back when response contains a banned word', async () => {
    const or = { chatJson: vi.fn().mockResolvedValue({ text: '상대가 기절했습니다' }), speech: vi.fn() }
    const result = await generateCommentaryWithOpenRouter(or as never, 'm', event, weapons)
    expect(FALLBACK_COMMENTARY).toContain(result)
  })

  test('falls back when the call throws', async () => {
    const or = { chatJson: vi.fn().mockRejectedValue(new Error('timeout')), speech: vi.fn() }
    const result = await generateCommentaryWithOpenRouter(or as never, 'm', event, weapons)
    expect(FALLBACK_COMMENTARY).toContain(result)
  })

  test('returns model text unchanged when valid', async () => {
    const or = { chatJson: vi.fn().mockResolvedValue({ text: '강력한 일격!' }), speech: vi.fn() }
    const result = await generateCommentaryWithOpenRouter(or as never, 'm', event, weapons)
    expect(result).toBe('강력한 일격!')
  })
})
