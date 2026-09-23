export interface AudioHandle {
  stop: () => void
}

export interface AudioManagerDeps {
  now: () => number
  play: (url: string) => AudioHandle
  speak: (text: string) => void
}

export interface AudioManager {
  unlock: () => Promise<boolean>
  /** 즉시 재생 (디버그 화면용). 연출 화면은 schedule + playScheduled 를 쓴다. */
  playCommentary: (eventId: string, audioPath: string | null, text: string, validUntil: number) => void
  /** 도착한 해설을 보관만 한다. 재생은 그 공격의 해설 차례에 playScheduled 로. */
  schedule: (eventId: string, audioPath: string | null, text: string, validUntil: number) => void
  /**
   * 해당 공격의 해설 차례가 됐을 때 부른다. 이미 도착해 있으면 즉시, 아직이면 windowMs 안에 도착할 때만 재생한다.
   * 창이 지나면 버린다 (다 끝났는데 뒤늦게 재생되는 일 방지).
   */
  playScheduled: (eventId: string, windowMs?: number) => void
  setMuted: (muted: boolean) => void
}

type Scheduled = { audioPath: string | null; text: string; validUntil: number }

const DEFAULT_WINDOW_MS = 2_500

/**
 * Logic-only audio player, driven by injected deps so it is testable without
 * real Audio/SpeechSynthesis. Rules: drop stale commentary, ignore duplicate
 * eventIds, only one playback at a time, fall back to speech when there is
 * no audioPath, and do nothing while muted.
 */
export function createAudioManager(deps: AudioManagerDeps): AudioManager {
  let muted = false
  let current: AudioHandle | null = null
  const seenEventIds = new Set<string>()
  const scheduled = new Map<string, Scheduled>()
  let wanted: { eventId: string; until: number } | null = null

  const playCommentary = (eventId: string, audioPath: string | null, text: string, validUntil: number): void => {
    if (muted) return
    if (deps.now() >= validUntil) return
    if (seenEventIds.has(eventId)) return
    seenEventIds.add(eventId)

    current?.stop()
    current = null

    if (audioPath) {
      current = deps.play(audioPath)
    } else {
      deps.speak(text)
    }
  }

  const schedule = (eventId: string, audioPath: string | null, text: string, validUntil: number): void => {
    if (seenEventIds.has(eventId)) return
    scheduled.set(eventId, { audioPath, text, validUntil })
    if (wanted && wanted.eventId === eventId && deps.now() < wanted.until) {
      wanted = null
      playCommentary(eventId, audioPath, text, validUntil)
    }
  }

  const playScheduled = (eventId: string, windowMs: number = DEFAULT_WINDOW_MS): void => {
    const entry = scheduled.get(eventId)
    if (entry) {
      wanted = null
      playCommentary(eventId, entry.audioPath, entry.text, entry.validUntil)
      return
    }
    wanted = { eventId, until: deps.now() + windowMs }
  }

  const setMuted = (value: boolean): void => {
    muted = value
  }

  const unlock = async (): Promise<boolean> => {
    try {
      const win = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
      const AudioContextCtor = win.AudioContext ?? win.webkitAudioContext
      if (!AudioContextCtor) return false
      const ctx = new AudioContextCtor()
      await ctx.resume()
      return true
    } catch {
      return false
    }
  }

  return { unlock, playCommentary, schedule, playScheduled, setMuted }
}

export function createBrowserAudioManager(): AudioManager {
  return createAudioManager({
    now: () => Date.now(),
    play: (url: string) => {
      const audio = new Audio(url)
      void audio.play()
      return {
        stop: () => {
          audio.pause()
          audio.currentTime = 0
        },
      }
    },
    speak: (text: string) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ko-KR'
      speechSynthesis.speak(utterance)
    },
  })
}
