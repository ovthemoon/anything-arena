import { describe, expect, test, vi } from 'vitest'
import { BGM_DUCKED_VOLUME, BGM_PATHS, BGM_VOLUME, SFX_PATHS, SFX_VOLUME, createSfxPlayer } from '../../../src/client/audio/sfx'

const makeDeps = () => {
  const stop = vi.fn()
  const setVolume = vi.fn()
  const play = vi.fn().mockReturnValue({ stop, setVolume })
  return { play, stop, setVolume }
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
    sfx.startBgm('battle')
    expect(play).not.toHaveBeenCalled()
  })

  test('startBgm loops the battle track once, even if called twice', () => {
    const { play } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.startBgm('battle')
    sfx.startBgm('battle')
    expect(play).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenCalledWith(BGM_PATHS.battle, { loop: true, volume: BGM_VOLUME })
  })

  test('stopBgm stops the running track', () => {
    const { play, stop } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.startBgm('battle')
    sfx.stopBgm()
    expect(stop).toHaveBeenCalledTimes(1)
  })

  test('muting stops bgm and unmuting resumes it while still wanted', () => {
    const { play, stop } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.startBgm('battle')
    sfx.setMuted(true)
    expect(stop).toHaveBeenCalledTimes(1)
    sfx.setMuted(false)
    expect(play).toHaveBeenCalledTimes(2)
  })

  test('unmuting after stopBgm does not restart the track', () => {
    const { play } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.startBgm('battle')
    sfx.setMuted(true)
    sfx.stopBgm()
    sfx.setMuted(false)
    expect(play).toHaveBeenCalledTimes(1)
  })

  test('switching track stops the old one and starts the new one', () => {
    const { play, stop } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.startBgm('lobby')
    sfx.startBgm('battle')
    expect(stop).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenNthCalledWith(1, BGM_PATHS.lobby, { loop: true, volume: BGM_VOLUME })
    expect(play).toHaveBeenNthCalledWith(2, BGM_PATHS.battle, { loop: true, volume: BGM_VOLUME })
  })

  test('unmuting resumes the most recently wanted track', () => {
    const { play } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.setMuted(true)
    sfx.startBgm('battle')
    sfx.startBgm('lobby')
    sfx.setMuted(false)
    expect(play).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenCalledWith(BGM_PATHS.lobby, { loop: true, volume: BGM_VOLUME })
  })

  test('background music sits well under the effects', () => {
    expect(BGM_VOLUME).toBeLessThanOrEqual(0.2)
    expect(BGM_VOLUME).toBeLessThan(SFX_VOLUME)
  })

  test('ducking lowers the running bgm and restores it', () => {
    const { play, setVolume } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.startBgm('battle')
    sfx.setDucked(true)
    expect(setVolume).toHaveBeenLastCalledWith(BGM_DUCKED_VOLUME)
    sfx.setDucked(false)
    expect(setVolume).toHaveBeenLastCalledWith(BGM_VOLUME)
    expect(BGM_DUCKED_VOLUME).toBeLessThan(BGM_VOLUME)
  })

  test('bgm started while ducked begins at the ducked volume', () => {
    const { play } = makeDeps()
    const sfx = createSfxPlayer({ play })
    sfx.setDucked(true)
    sfx.startBgm('battle')
    expect(play).toHaveBeenCalledWith(BGM_PATHS.battle, { loop: true, volume: BGM_DUCKED_VOLUME })
  })

  test('the round bell has a file', () => {
    expect(SFX_PATHS.bell).toMatch(/\.mp3$/)
  })

  test('a throwing play dep never escapes', () => {
    const play = vi.fn().mockImplementation(() => {
      throw new Error('autoplay blocked')
    })
    const sfx = createSfxPlayer({ play })
    expect(() => sfx.play('win')).not.toThrow()
    expect(() => sfx.startBgm('battle')).not.toThrow()
  })
})
