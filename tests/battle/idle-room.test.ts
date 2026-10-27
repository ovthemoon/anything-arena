import { expect, it, vi } from 'vitest'
vi.mock('cloudflare:workers', () => ({ DurableObject: class { constructor(public ctx: unknown, public env: unknown) {} } }))
vi.mock('../../src/worker/ai', async () => ({ createAiAdapters: () => ({}) }))
import { BattleRoom } from '../../src/worker/rooms/battle-room'
import { createMatch } from '../../src/worker/game/engine'
import { RULES } from '../../src/shared/rules/constants'
function setup(state = createMatch('ABCDE', 'm1', Date.now()), sockets: Array<{ readyState: number }> = []) {
  const values = new Map<string, unknown>([['state', state], ['commentary:old:1:A', {}], ['weaponBudget:old:A', {}]])
  let alarm: number | null = null, ready: Promise<unknown> = Promise.resolve()
  const storage = { get: async (key: string) => values.get(key), put: async (key: string, value: unknown) => { values.set(key, value) },
    getAlarm: async () => alarm, setAlarm: async (at: number) => { alarm = at }, deleteAlarm: async () => { alarm = null },
    deleteAll: async () => { values.clear() }, delete: async (keys: string | string[]) => { for (const key of [keys].flat()) values.delete(key) },
    list: async ({ prefix }: { prefix: string }) => new Map([...values].filter(([key]) => key.startsWith(prefix))),
  }
  const ctx = { storage, getWebSockets: () => sockets, blockConcurrencyWhile: (fn: () => Promise<unknown>) => (ready = fn()) }
  const room = new BattleRoom(ctx as unknown as DurableObjectState, {} as Env)
  return { room, values, ready: () => ready, alarm: () => alarm }
}
it('expires an empty waiting room once, without recurring cleanup polls', async () => {
  vi.useFakeTimers(); vi.stubGlobal('WebSocket', { OPEN: 1 })
  try {
    const h = setup(); await h.ready()
    expect(h.alarm()).toBe(Date.now() + RULES.IDLE_ROOM_TTL_MS)
    vi.setSystemTime(Date.now() + RULES.IDLE_ROOM_TTL_MS)
    await h.room.alarm()
    expect(h.values.size).toBe(0)
    const res = await h.room.fetch(new Request('https://internal/internal/state', { headers: { 'X-Internal': '1' } }))
    expect(res.status).toBe(404)
  } finally { vi.useRealTimers(); vi.unstubAllGlobals() }
})
it('does not expire rooms with an open participant connection', async () => {
  vi.stubGlobal('WebSocket', { OPEN: 1 })
  try {
    const h = setup(undefined, [{ readyState: 1 }]); await h.ready()
    expect(h.alarm()).toBeNull()
    await h.room.alarm()
    expect(h.values.has('state')).toBe(true)
  } finally { vi.unstubAllGlobals() }
})
it('round alarms keep running and rematches clear only stale match caches', async () => {
  vi.stubGlobal('WebSocket', { OPEN: 1 })
  try {
    const state = createMatch('ABCDE', 'm1', Date.now())
    state.phase = 'ROUND_INPUT'; state.deadlineAt = Date.now() + 10000
    const h = setup(state); await h.ready()
    await h.room.alarm()
    expect(h.alarm()).toBe(state.deadlineAt + RULES.JUDGE_GRACE_MS)
    expect(h.values.has('state')).toBe(true)
    await h.room['commit'](createMatch('ABCDE', 'm2', Date.now()))
    expect(h.values.has('commentary:old:1:A')).toBe(false)
    expect(h.values.has('weaponBudget:old:A')).toBe(false)
    expect(h.values.has('state')).toBe(true)
  } finally { vi.unstubAllGlobals() }
})
