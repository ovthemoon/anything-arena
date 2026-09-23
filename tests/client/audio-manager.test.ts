import { describe, expect, test, vi } from 'vitest'
import { createAudioManager } from '../../src/client/audio/AudioManager'

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
})
