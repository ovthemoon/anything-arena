import { describe, expect, test, vi } from 'vitest'
import { checkTextWithJev, judgeWithJev } from '../../src/worker/ai/jev'
import { DEFAULT_WEAPONS } from '../../src/worker/game/default-weapons'

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

const fullAnswers = {
  answers: {
    moderation: { choice: 'ALLOW' },
    attackKind: { choice: 'ROAST' },
    effectiveness: { choice: 'STRONG' },
    animation: { choice: 'DASH' },
    reasonCode: { choice: 'WEAKNESS_MATCH' },
  },
}

const req = {
  attacker: DEFAULT_WEAPONS[0],
  defender: DEFAULT_WEAPONS[1],
  actionText: '수분으로 공격한다',
  rulesetVersion: 'v0.1',
}

describe('judgeWithJev', () => {
  test('maps all 5 answers into a JudgeResult', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(fullAnswers))
    const result = await judgeWithJev({ apiKey: 'k', model: 'jev-latest', fetchImpl, timeoutMs: 1000 }, req)
    expect(result).toEqual({
      moderation: 'ALLOW',
      moderationReason: 'NORMAL',
      validity: 'VALID',
      effectiveness: 'STRONG',
      animation: 'DASH',
      reasonCode: 'WEAKNESS_MATCH',
    })
  })

  test('throws when effectiveness choice is outside the enum', async () => {
    const bad = { answers: { ...fullAnswers.answers, effectiveness: { choice: 'HUGE' } } }
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(bad))
    await expect(judgeWithJev({ apiKey: 'k', model: 'jev-latest', fetchImpl, timeoutMs: 1000 }, req)).rejects.toThrow()
  })

  test('request state never includes the defender current action', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(fullAnswers))
    await judgeWithJev({ apiKey: 'k', model: 'jev-latest', fetchImpl, timeoutMs: 1000 }, req)
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(body.state.defender.action).toBeUndefined()
    expect(body.state.attacker.action).toBeUndefined()
    expect(body.state.action).toBe(req.actionText)
  })

  test('GENERIC_VIOLENCE attack kind forces MISS with OFF_THEME regardless of effectiveness', async () => {
    const violent = { answers: { ...fullAnswers.answers, attackKind: { choice: 'GENERIC_VIOLENCE' }, effectiveness: { choice: 'STRONG' } } }
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(violent))
    const result = await judgeWithJev({ apiKey: 'k', model: 'jev-latest', fetchImpl, timeoutMs: 1000 }, req)
    expect(result.effectiveness).toBe('MISS')
    expect(result.reasonCode).toBe('OFF_THEME')
    expect(result.validity).toBe('VALID')
  })

  test('SYSTEM_INSTRUCTION attack kind maps to validity SYSTEM_INSTRUCTION', async () => {
    const sys = { answers: { ...fullAnswers.answers, attackKind: { choice: 'SYSTEM_INSTRUCTION' } } }
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(sys))
    const result = await judgeWithJev({ apiKey: 'k', model: 'jev-latest', fetchImpl, timeoutMs: 1000 }, req)
    expect(result.validity).toBe('SYSTEM_INSTRUCTION')
  })

  test('moderation FOUL regardless of other answers still maps to FOUL', async () => {
    const foulAnswers = { answers: { ...fullAnswers.answers, moderation: { choice: 'FOUL' } } }
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(foulAnswers))
    const result = await judgeWithJev({ apiKey: 'k', model: 'jev-latest', fetchImpl, timeoutMs: 1000 }, req)
    expect(result.moderation).toBe('FOUL')
  })
})

describe('checkTextWithJev', () => {
  test('sends only the moderation question and returns its choice', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ answers: { moderation: { choice: 'FOUL' } } }))
    const decision = await checkTextWithJev({ apiKey: 'k', model: 'jev-latest', fetchImpl, timeoutMs: 1000 }, '나쁜 말')
    expect(decision).toBe('FOUL')
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(Object.keys(body.questions)).toEqual(['moderation'])
  })
})

describe('judgeWithJev character voice', () => {
  test('sends attacker tone/catchphrases and defender hates for roster characters', async () => {
    const { characterCard } = await import('../../src/shared/rules/roster')
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(fullAnswers))
    const voiced = { ...req, attacker: characterCard('grandma', 'm1'), defender: characterCard('jaemmin', 'm1') }
    await judgeWithJev({ apiKey: 'k', model: 'jev-latest', fetchImpl, timeoutMs: 1000 }, voiced)
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(typeof body.state.attacker.tone).toBe('string')
    expect(body.state.attacker.catchphrases).toHaveLength(2)
    expect(body.state.defender.hates).toHaveLength(2)
    // 상대의 말버릇은 판정에 필요 없다. 상대 정보는 아픈 곳만.
    expect(body.state.defender.catchphrases).toBeUndefined()
  })

  test('omits voice fields for free-form weapons without a roster character', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(fullAnswers))
    await judgeWithJev({ apiKey: 'k', model: 'jev-latest', fetchImpl, timeoutMs: 1000 }, req)
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(body.state.attacker.tone).toBeUndefined()
    expect(body.state.defender.hates).toBeUndefined()
  })
})
