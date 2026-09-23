import { describe, expect, test } from 'vitest'
import { buildCommentaryUser } from '../../src/worker/ai/prompts/commentary'
import { characterCard } from '../../src/shared/rules/roster'
import type { AttackEvent } from '../../src/shared/schemas/match'

const event: AttackEvent = {
  eventId: 'e1', actor: 'A', target: 'B', techniqueLabel: '국물 회오리', approvedActionText: '국물에 말아 먹는다',
  effectiveness: 'NORMAL', damage: 30, animation: 'SHOCKWAVE', reasonCode: 'NORMAL', cosmeticTags: ['HEAVY'],
}

describe('commentary voice', () => {
  test('includes the attacker tone and catchphrases so the commentator can mimic them', () => {
    const body = JSON.parse(buildCommentaryUser(event, { A: characterCard('grandma', 'm1'), B: characterCard('jaemmin', 'm1') }))
    expect(typeof body.attackerTone).toBe('string')
    expect(body.attackerCatchphrases).toHaveLength(2)
  })
})
