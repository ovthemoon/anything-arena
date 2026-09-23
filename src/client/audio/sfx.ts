export interface SfxHandle {
  stop: () => void
  setVolume: (volume: number) => void
}

export type SfxName = 'whistle' | 'round-start' | 'hit-strong' | 'hit-normal' | 'block' | 'miss' | 'win' | 'lose' | 'bell'

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
  bell: `${AUDIO_DIR}/bell.mp3`,
}

export type BgmTrack = 'lobby' | 'battle'

export const BGM_PATHS: Record<BgmTrack, string> = {
  lobby: `${AUDIO_DIR}/bgm-lobby.mp3`,
  battle: `${AUDIO_DIR}/bgm-battle.mp3`,
}

export const SFX_VOLUME = 0.9
/** 배경음은 해설 음성·효과음 밑에 깔리도록 낮게. */
export const BGM_VOLUME = 0.18
/** 목소리(말풍선·해설)가 나가는 동안은 더 낮게 (덕킹). */
export const BGM_DUCKED_VOLUME = 0.05

export interface PlayOptions {
  loop: boolean
  volume: number
}

export interface SfxDeps {
  play: (url: string, options: PlayOptions) => SfxHandle
}

export interface SfxPlayer {
  play: (name: SfxName) => void
  startBgm: (track: BgmTrack) => void
  stopBgm: () => void
  /** 목소리가 나가는 동안 배경음을 낮춘다. 켜진 채로 시작한 배경음도 낮은 볼륨으로 시작. */
  setDucked: (ducked: boolean) => void
  setMuted: (muted: boolean) => void
}

/**
 * 효과음·배경음 재생기. 실제 Audio 객체는 deps 로 주입해 테스트한다.
 * 규칙: 음소거면 아무것도 안 낸다. 배경음은 한 번에 하나만 돌고(다른 곡을 요청하면 갈아탄다),
 * 음소거를 풀면 아직 원하는 곡이 있을 때(startBgm 이후 stopBgm 전)만 그 곡을 다시 시작한다.
 * 재생 실패(자동재생 차단, 파일 없음)는 게임을 멈추면 안 되므로 삼킨다.
 */
export function createSfxPlayer(deps: SfxDeps): SfxPlayer {
  let muted = false
  let ducked = false
  let wantedTrack: BgmTrack | null = null
  let playingTrack: BgmTrack | null = null
  let bgm: SfxHandle | null = null

  const bgmVolume = (): number => (ducked ? BGM_DUCKED_VOLUME : BGM_VOLUME)

  const safePlay = (url: string, options: PlayOptions): SfxHandle | null => {
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
    playingTrack = null
  }

  const startBgm = (track: BgmTrack): void => {
    wantedTrack = track
    if (muted) return
    if (playingTrack === track && bgm) return
    haltBgm()
    bgm = safePlay(BGM_PATHS[track], { loop: true, volume: bgmVolume() })
    playingTrack = bgm ? track : null
  }

  const setDucked = (value: boolean): void => {
    ducked = value
    try {
      bgm?.setVolume(bgmVolume())
    } catch {
      /* 볼륨 조절 실패는 무시 */
    }
  }

  const stopBgm = (): void => {
    wantedTrack = null
    haltBgm()
  }

  const setMuted = (value: boolean): void => {
    muted = value
    if (muted) haltBgm()
    else if (wantedTrack) startBgm(wantedTrack)
  }

  return { play, startBgm, stopBgm, setDucked, setMuted }
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
        setVolume: (v) => {
          audio.volume = v
        },
      }
    },
  })
}
