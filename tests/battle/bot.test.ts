import { describe, expect, it } from 'vitest'
import { createMatch, setReady, setWeapon, toPublic } from '../../src/worker/game/engine'
import { BOT_SLOT, armBot, pickBotTechniqueId } from '../../src/worker/rooms/handlers/bot'
import { characterCard } from '../../src/shared/rules/roster'

describe('AI opponent bot', () => {
  it('arms the bot seat with a character card and marks it ready', () => {
    const s = armBot(createMatch('ROOM', 'm1', 1000, BOT_SLOT), 1000)
    expect(s.players.B.ready).toBe(true)
    expect(s.players.B.connected).toBe(true)
    expect(s.players.B.weapon?.characterId).toBe('jaemmin')
    expect(s.phase).toBe('PREPARING')
  })

  it('does nothing without a bot slot', () => {
    const s = createMatch('ROOM', 'm1', 1000)
    expect(armBot(s, 1000)).toBe(s)
  })

  it('starts the round as soon as the human is ready', () => {
    const armed = armBot(createMatch('ROOM', 'm1', 1000, BOT_SLOT), 1000)
    const s = setReady(setWeapon(armed, 'A', characterCard('grandma', 'm1'), '나'), 'A', 2000)
    expect(s.phase).toBe('ROUND_INPUT')
    expect(s.roundId).toBe(1)
  })

  it('alternates between the two suggested roasts by round', () => {
    const armed = armBot(createMatch('ROOM', 'm1', 1000, BOT_SLOT), 1000)
    const r1 = setReady(setWeapon(armed, 'A', characterCard('grandma', 'm1'), '나'), 'A', 2000)
    expect(pickBotTechniqueId(r1, BOT_SLOT)).toBe('jaemmin-r1')
    expect(pickBotTechniqueId({ ...r1, roundId: 2 }, BOT_SLOT)).toBe('jaemmin-r2')
    expect(pickBotTechniqueId({ ...r1, roundId: 3 }, BOT_SLOT)).toBe('jaemmin-r1')
  })

  it('keeps botSlot out of the public state', () => {
    const s = createMatch('ROOM', 'm1', 1000, BOT_SLOT)
    expect('botSlot' in toPublic(s)).toBe(false)
  })
})
