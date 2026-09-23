import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { AttackEvent } from '../../../src/shared/schemas/match'
import { runPlayback, type SequencerState } from '../../../src/client/battle/sequencer'
import { buildAttackTimeline } from '../../../src/client/battle/timeline'

const attack = (actor: 'A' | 'B'): AttackEvent => ({
  eventId: `e-${actor}`, actor, target: actor === 'A' ? 'B' : 'A', techniqueLabel: 'x', approvedActionText: 'x',
  effectiveness: 'NORMAL', damage: 30, animation: 'DASH', cosmeticTags: [], reasonCode: 'NORMAL',
})
const attacks: [AttackEvent, AttackEvent] = [attack('A'), attack('B')]
const steps = buildAttackTimeline(false)
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

describe('runPlayback', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('without a hold, plays both attacks back to back and ends done', async () => {
    const seen: SequencerState[] = []
    runPlayback({ attacks, steps: [steps, steps], finishing: null, sleep, onState: (s) => seen.push(s) })
    await vi.advanceTimersByTimeAsync(6_580 * 2)
    expect(seen[0]).toMatchObject({ index: 0, step: 'name' })
    expect(seen.find((s) => s.index === 1 && s.step === 'name')).toBeDefined()
    expect(seen.at(-1)).toMatchObject({ index: 1, step: null, done: true })
  })

  test('a hold on the commentary step delays the next attack until it resolves', async () => {
    const seen: Array<SequencerState & { at: number }> = []
    const t0 = Date.now()
    const hold = vi.fn((a: AttackEvent) => (a.eventId === 'e-A' ? sleep(4_000) : Promise.resolve()))
    runPlayback({ attacks, steps: [steps, steps], finishing: null, sleep, hold, onState: (s) => seen.push({ ...s, at: Date.now() - t0 }) })
    await vi.advanceTimersByTimeAsync(20_000)
    const secondName = seen.find((s) => s.index === 1 && s.step === 'name')
    expect(secondName?.at).toBe(4_080 + 4_000)
    expect(hold).toHaveBeenCalledTimes(2)
  })

  test('a hold shorter than the commentary step does not shorten it', async () => {
    const seen: Array<SequencerState & { at: number }> = []
    const t0 = Date.now()
    runPlayback({ attacks, steps: [steps, steps], finishing: null, sleep, hold: () => sleep(500), onState: (s) => seen.push({ ...s, at: Date.now() - t0 }) })
    await vi.advanceTimersByTimeAsync(20_000)
    expect(seen.find((s) => s.index === 1 && s.step === 'name')?.at).toBe(6_580)
  })

  test('cancel stops further states', async () => {
    const seen: SequencerState[] = []
    const cancel = runPlayback({ attacks, steps: [steps, steps], finishing: null, sleep, onState: (s) => seen.push(s) })
    await vi.advanceTimersByTimeAsync(1_000)
    cancel()
    const count = seen.length
    await vi.advanceTimersByTimeAsync(20_000)
    expect(seen.length).toBe(count)
  })

  test('marks the finishing attack', async () => {
    const seen: SequencerState[] = []
    runPlayback({ attacks, steps: [steps, steps], finishing: 1, sleep, onState: (s) => seen.push(s) })
    await vi.advanceTimersByTimeAsync(20_000)
    expect(seen.find((s) => s.index === 0 && s.step === 'name')?.isFinishing).toBe(false)
    expect(seen.find((s) => s.index === 1 && s.step === 'name')?.isFinishing).toBe(true)
  })
})

describe('runPlayback failure', () => {
  test('a throwing sleep ends the playback instead of freezing it', async () => {
    const seen: SequencerState[] = []
    const badSleep = () => Promise.reject(new Error('boom'))
    runPlayback({ attacks, steps: [steps, steps], finishing: null, sleep: badSleep, onState: (s) => seen.push(s) })
    await new Promise((r) => setTimeout(r, 0))
    expect(seen.at(-1)).toMatchObject({ done: true })
  })
})
