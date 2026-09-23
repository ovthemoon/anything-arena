import { describe, expect, test, vi } from 'vitest'
import { COMMENTARY_PLAYBACK_RATE, createAudioManager } from '../../src/client/audio/AudioManager'

describe('AudioManager', () => {
  test('drops commentary whose validUntil already passed', () => {
    const play = vi.fn()
    const am = createAudioManager({ now: () => 10_000, play, speak: vi.fn() })
    am.playCommentary('e1', '/api/audio/e1.mp3', '텍스트', 9_000)
    expect(play).not.toHaveBeenCalled()
  })
  test('falls back to speech synthesis when audioPath is null', () => {
    const speak = vi.fn()
    const am = createAudioManager({ now: () => 0, play: vi.fn(), speak })
    am.playCommentary('e1', null, '텍스트', 5_000)
    expect(speak).toHaveBeenCalledWith('텍스트')
  })
  test('only one commentary plays at a time; newer replaces older', () => {
    const stop = vi.fn()
    const play = vi.fn().mockReturnValue({ stop })
    const am = createAudioManager({ now: () => 0, play, speak: vi.fn() })
    am.playCommentary('e1', '/a', 'a', 5_000); am.playCommentary('e2', '/b', 'b', 5_000)
    expect(stop).toHaveBeenCalledTimes(1)
  })
  test('muted plays nothing', () => {
    const play = vi.fn(); const speak = vi.fn()
    const am = createAudioManager({ now: () => 0, play, speak })
    am.setMuted(true); am.playCommentary('e1', '/a', 'a', 5_000); am.playCommentary('e2', null, 'b', 5_000)
    expect(play).not.toHaveBeenCalled(); expect(speak).not.toHaveBeenCalled()
  })
  test('ignores duplicate eventId', () => {
    const play = vi.fn().mockReturnValue({ stop: vi.fn() })
    const am = createAudioManager({ now: () => 0, play, speak: vi.fn() })
    am.playCommentary('e1', '/a', 'a', 5_000)
    am.playCommentary('e1', '/a', 'a', 5_000)
    expect(play).toHaveBeenCalledTimes(1)
  })

  test('schedule does not play until playScheduled is called for that event', () => {
    const play = vi.fn().mockReturnValue({ stop: vi.fn() })
    const am = createAudioManager({ now: () => 0, play, speak: vi.fn() })
    am.schedule('e1', '/a', 'a', 20_000)
    expect(play).not.toHaveBeenCalled()
    am.playScheduled('e1')
    expect(play).toHaveBeenCalledWith('/a', expect.objectContaining({ rate: expect.any(Number) }))
  })
  test('playScheduled before arrival plays when audio arrives inside the window, not after', () => {
    let t = 0
    const play = vi.fn().mockReturnValue({ stop: vi.fn() })
    const am = createAudioManager({ now: () => t, play, speak: vi.fn() })
    am.playScheduled('e1', 2_500)
    t = 1_000
    am.schedule('e1', '/a', 'a', 20_000)
    expect(play).toHaveBeenCalledTimes(1)
    am.playScheduled('e2', 2_500)
    t = 5_000
    am.schedule('e2', '/b', 'b', 20_000)
    expect(play).toHaveBeenCalledTimes(1)
  })
})

describe('AudioManager.playLine', () => {
  test('plays the line and stops whatever was playing', () => {
    const stop = vi.fn()
    const play = vi.fn().mockReturnValue({ stop })
    const am = createAudioManager({ now: () => 0, play, speak: vi.fn() })
    am.playCommentary('e1', '/a', 'a', 5_000)
    am.playLine('e2', '/audio/roasts/grandma-r2.mp3')
    expect(stop).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenLastCalledWith('/audio/roasts/grandma-r2.mp3', expect.objectContaining({ rate: 1 }))
  })
  test('a later commentary stops the line', () => {
    const stop = vi.fn()
    const play = vi.fn().mockReturnValue({ stop })
    const am = createAudioManager({ now: () => 0, play, speak: vi.fn() })
    am.playLine('e2', '/audio/roasts/grandma-r2.mp3')
    am.playCommentary('e1', '/a', 'a', 5_000)
    expect(stop).toHaveBeenCalledTimes(1)
  })
  test('same attack plays its line only once (StrictMode double effect)', () => {
    const play = vi.fn().mockReturnValue({ stop: vi.fn() })
    const am = createAudioManager({ now: () => 0, play, speak: vi.fn() })
    am.playLine('e2', '/audio/roasts/grandma-r2.mp3')
    am.playLine('e2', '/audio/roasts/grandma-r2.mp3')
    am.playLine('e3', '/audio/roasts/jaemmin-r3.mp3')
    expect(play).toHaveBeenCalledTimes(2)
  })
  test('muted plays no line', () => {
    const play = vi.fn()
    const am = createAudioManager({ now: () => 0, play, speak: vi.fn() })
    am.setMuted(true)
    am.playLine('e2', '/audio/roasts/grandma-r2.mp3')
    expect(play).not.toHaveBeenCalled()
  })
})

describe('AudioManager playback rate', () => {
  test('commentary plays at the fast-forward rate, roast lines at normal speed', () => {
    const play = vi.fn().mockReturnValue({ stop: vi.fn() })
    const am = createAudioManager({ now: () => 0, play, speak: vi.fn() })
    am.playCommentary('e1', '/a.mp3', 'a', 5_000)
    am.playLine('x', '/audio/roasts/grandma-r1.mp3')
    expect(play).toHaveBeenNthCalledWith(1, '/a.mp3', expect.objectContaining({ rate: COMMENTARY_PLAYBACK_RATE }))
    expect(play).toHaveBeenNthCalledWith(2, '/audio/roasts/grandma-r1.mp3', expect.objectContaining({ rate: 1 }))
    expect(COMMENTARY_PLAYBACK_RATE).toBe(2)
  })
})

describe('AudioManager.waitForCommentary', () => {
  const makePlay = () => {
    const handles: Array<{ url: string; onEnded?: () => void; stop: ReturnType<typeof vi.fn> }> = []
    const play = vi.fn((url: string, opts: { rate: number; onEnded?: () => void }) => {
      const h = { url, onEnded: opts.onEnded, stop: vi.fn() }
      handles.push(h)
      return h
    })
    return { play, handles }
  }

  test('resolves when the audio for that event ends', async () => {
    vi.useFakeTimers()
    const { play, handles } = makePlay()
    const am = createAudioManager({ now: () => Date.now(), play, speak: vi.fn() })
    am.schedule('e1', '/a.mp3', 'a', Date.now() + 10_000)
    am.playScheduled('e1')
    let done = false
    void am.waitForCommentary('e1', 8_000).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(done).toBe(false)
    handles[0].onEnded?.()
    await vi.advanceTimersByTimeAsync(0)
    expect(done).toBe(true)
    vi.useRealTimers()
  })

  test('resolves when the audio starts after the wait began (hold called before playScheduled)', async () => {
    vi.useFakeTimers()
    const { play, handles } = makePlay()
    const am = createAudioManager({ now: () => Date.now(), play, speak: vi.fn() })
    let done = false
    void am.waitForCommentary('e1', 8_000).then(() => { done = true })
    am.schedule('e1', '/a.mp3', 'a', Date.now() + 10_000)
    am.playScheduled('e1')
    await vi.advanceTimersByTimeAsync(4_000)
    expect(done).toBe(false)
    handles[0].onEnded?.()
    await vi.advanceTimersByTimeAsync(0)
    expect(done).toBe(true)
    vi.useRealTimers()
  })

  test('gives up after the arrival window when no audio ever arrives', async () => {
    vi.useFakeTimers()
    const { play } = makePlay()
    const am = createAudioManager({ now: () => Date.now(), play, speak: vi.fn() })
    let done = false
    void am.waitForCommentary('e1', 8_000).then(() => { done = true })
    am.playScheduled('e1')
    await vi.advanceTimersByTimeAsync(2_600)
    expect(done).toBe(true)
    vi.useRealTimers()
  })

  test('never waits longer than maxMs even if the audio keeps playing', async () => {
    vi.useFakeTimers()
    const { play } = makePlay()
    const am = createAudioManager({ now: () => Date.now(), play, speak: vi.fn() })
    am.schedule('e1', '/a.mp3', 'a', Date.now() + 10_000)
    am.playScheduled('e1')
    let done = false
    void am.waitForCommentary('e1', 5_000).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(5_000)
    expect(done).toBe(true)
    vi.useRealTimers()
  })

  test('resolves at once when muted or when the audio was replaced by another line', async () => {
    vi.useFakeTimers()
    const { play, handles } = makePlay()
    const am = createAudioManager({ now: () => Date.now(), play, speak: vi.fn() })
    am.setMuted(true)
    let mutedDone = false
    void am.waitForCommentary('e1', 8_000).then(() => { mutedDone = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(mutedDone).toBe(true)

    am.setMuted(false)
    am.schedule('e2', '/b.mp3', 'b', Date.now() + 10_000)
    am.playScheduled('e2')
    let replacedDone = false
    void am.waitForCommentary('e2', 8_000).then(() => { replacedDone = true })
    am.playLine('x', '/audio/roasts/grandma-r1.mp3')
    await vi.advanceTimersByTimeAsync(0)
    expect(handles[0].stop).toHaveBeenCalled()
    expect(replacedDone).toBe(true)
    vi.useRealTimers()
  })
})
