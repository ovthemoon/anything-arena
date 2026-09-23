import { describe, expect, test, vi } from 'vitest'
import { BGM_PATH, SFX_PATHS, createSfxPlayer } from '../../../src/client/audio/sfx'

const makeDeps = () => {
  const stop = vi.fn()
  const play = vi.fn().mockReturnValue({ stop })
  return { play, stop }
}

describe('SfxPlayer', () => {
  test('play(name) resolves to the file path for that cue', () => {
    // Arrange
    const { play } = makeDeps()
    const sfx = createSfxPlayer({ play })
    // Act
    sfx.play('hit-strong')
    // Assert
    expect(play).toHaveBeenCalledWith(SFX_PATHS['hit-strong'], { loop: false, volume: expect.any(Number) })
  })

  test('muted plays nothing', () => {
    const { play } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.setMuted(true)
    sfx.play('miss')
    sfx.startBgm()
    expect(play).not.toHaveBeenCalled()
  })

  test('startBgm loops the battle track once, even if called twice', () => {
    const { play } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.startBgm()
    sfx.startBgm()
    expect(play).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenCalledWith(BGM_PATH, { loop: true, volume: expect.any(Number) })
  })

  test('stopBgm stops the running track', () => {
    const { play, stop } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.startBgm()
    sfx.stopBgm()
    expect(stop).toHaveBeenCalledTimes(1)
  })

  test('muting stops bgm and unmuting resumes it while still wanted', () => {
    const { play, stop } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.startBgm()
    sfx.setMuted(true)
    expect(stop).toHaveBeenCalledTimes(1)
    sfx.setMuted(false)
    expect(play).toHaveBeenCalledTimes(2)
  })

  test('unmuting after stopBgm does not restart the track', () => {
    const { play } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.startBgm()
    sfx.setMuted(true)
    sfx.stopBgm()
    sfx.setMuted(false)
    expect(play).toHaveBeenCalledTimes(1)
  })

  test('a throwing play dep never escapes', () => {
    const play = vi.fn().mockImplementation(() => {
      throw new Error('autoplay blocked')
    })
    const sfx = createSfxPlayer({ play })
    expect(() => sfx.play('win')).not.toThrow()
    expect(() => sfx.startBgm()).not.toThrow()
  })
})
