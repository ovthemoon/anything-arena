import { describe, expect, test, vi } from 'vitest'
import { checkTextWithJev, judgeWithJev } from '../../src/worker/ai/jev'
import { DEFAULT_WEAPONS } from '../../src/worker/game/default-weapons'

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

const fullAnswers = {
  answers: {
    moderation: { choice: 'ALLOW' },
    validity: { choice: 'VALID' },
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
