import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMatch } from '../../src/worker/game/engine'
import { createMockAdapters } from '../../src/worker/ai/mock'
import { handleWeaponSubmit } from '../../src/worker/rooms/handlers/lobby'
import type { RoomCtx } from '../../src/worker/rooms/room-context'
const msg = { type: 'weapon_submit' as const, requestId: 'request-1', weapon: { nickname: 'tester', character: 'paper knight', weaponName: 'paper sword', description: 'a folded sword' } }
function setup() {
  let state = createMatch('ABCDE', 'match-1', Date.now())
  const cache = new Map<string, unknown>()
  const ai = createMockAdapters()
  const check = vi.spyOn(ai, 'checkText').mockResolvedValue('ALLOW')
  const generate = vi.spyOn(ai, 'generateWeapon')
  const image = vi.spyOn(ai, 'generateWeaponImage').mockResolvedValue(null)
  const reject = vi.fn()
  const ctx = { ai, getState: () => state, commit: async next => { state = next }, sendTo: reject, broadcastSnapshot: vi.fn(),
    cacheGet: async <T,>(key: string) => cache.get(key) as T | undefined,
    cachePut: async <T,>(key: string, value: T) => { cache.set(key, value) },
  } as unknown as RoomCtx
  return { ctx, check, generate, image, reject }
}
afterEach(() => vi.useRealTimers())
describe('weapon submission budget', () => {
  it('executes duplicate messages only once, including overlapping arrivals', async () => {
    const h = setup()
    await Promise.all(Array.from({ length: 5 }, () => handleWeaponSubmit(h.ctx, 'A', msg)))
    await handleWeaponSubmit(h.ctx, 'A', msg)
    expect(h.check).toHaveBeenCalledTimes(4)
    expect(h.generate).toHaveBeenCalledTimes(1)
    expect(h.image).toHaveBeenCalledTimes(1)
  })
  it('persists the duplicate guard across handler re-creation', async () => {
    const h = setup()
    await handleWeaponSubmit(h.ctx, 'A', msg)
    await handleWeaponSubmit({ ...h.ctx }, 'A', msg)
    expect(h.generate).toHaveBeenCalledTimes(1)
  })
  it('bounds distinct paid submissions per player and match', async () => {
    vi.useFakeTimers()
    const h = setup()
    for (let i = 0; i < 8; i++) {
      vi.setSystemTime(Date.now() + 3000)
      await handleWeaponSubmit(h.ctx, 'A', { ...msg, requestId: `request-${i}` })
    }
    expect(h.generate).toHaveBeenCalledTimes(5)
    expect(h.reject).toHaveBeenLastCalledWith('A', expect.objectContaining({ reasonCode: 'WEAPON_LIMIT', canRetry: false }))
  })
})
