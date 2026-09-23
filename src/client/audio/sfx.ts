import type { AudioHandle } from './AudioManager'

export type SfxName = 'whistle' | 'round-start' | 'hit-strong' | 'hit-normal' | 'block' | 'miss' | 'win' | 'lose'

const AUDIO_DIR = '/audio'

export const SFX_PATHS: Record<SfxName, string> = {
  whistle: `${AUDIO_DIR}/whistle.mp3`,
  'round-start': `${AUDIO_DIR}/round-start.mp3`,
  'hit-strong': `${AUDIO_DIR}/hit-strong.mp3`,
  'hit-normal': `${AUDIO_DIR}/hit-normal.mp3`,
  block: `${AUDIO_DIR}/block.mp3`,
  miss: `${AUDIO_DIR}/miss.mp3`,
  win: `${AUDIO_DIR}/win.mp3`,
  lose: `${AUDIO_DIR}/lose.mp3`,
}

export const BGM_PATH = `${AUDIO_DIR}/bgm-battle.mp3`

const SFX_VOLUME = 0.9
/** 배경음은 해설 음성 밑에 깔리도록 낮게. */
const BGM_VOLUME = 0.35

export interface PlayOptions {
  loop: boolean
  volume: number
}

export interface SfxDeps {
  play: (url: string, options: PlayOptions) => AudioHandle
}

export interface SfxPlayer {
  play: (name: SfxName) => void
  startBgm: () => void
  stopBgm: () => void
  setMuted: (muted: boolean) => void
}

/**
 * 효과음·배경음 재생기. 실제 Audio 객체는 deps 로 주입해 테스트한다.
 * 규칙: 음소거면 아무것도 안 낸다. 배경음은 한 번에 하나만 돌고, 음소거를 풀면
 * 아직 원하는 상태(startBgm 이후 stopBgm 전)일 때만 다시 시작한다.
 * 재생 실패(자동재생 차단, 파일 없음)는 게임을 멈추면 안 되므로 삼킨다.
 */
export function createSfxPlayer(deps: SfxDeps): SfxPlayer {
  let muted = false
  let bgmWanted = false
  let bgm: AudioHandle | null = null

  const safePlay = (url: string, options: PlayOptions): AudioHandle | null => {
    try {
      return deps.play(url, options)
    } catch {
      return null
    }
  }

  const play = (name: SfxName): void => {
    if (muted) return
    safePlay(SFX_PATHS[name], { loop: false, volume: SFX_VOLUME })
  }

  const haltBgm = (): void => {
    bgm?.stop()
    bgm = null
  }

  const startBgm = (): void => {
    bgmWanted = true
    if (muted || bgm) return
    bgm = safePlay(BGM_PATH, { loop: true, volume: BGM_VOLUME })
  }

  const stopBgm = (): void => {
    bgmWanted = false
    haltBgm()
  }

  const setMuted = (value: boolean): void => {
    muted = value
    if (muted) haltBgm()
    else if (bgmWanted) startBgm()
  }

  return { play, startBgm, stopBgm, setMuted }
}

export function createBrowserSfxPlayer(): SfxPlayer {
  return createSfxPlayer({
    play: (url, { loop, volume }) => {
      const audio = new Audio(url)
      audio.loop = loop
      audio.volume = volume
      void audio.play().catch(() => undefined)
      return {
        stop: () => {
          audio.pause()
          audio.currentTime = 0
        },
      }
    },
  })
}
