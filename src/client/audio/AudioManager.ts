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
  playCommentary: (eventId: string, audioPath: string | null, text: string, validUntil: number) => void
  setMuted: (muted: boolean) => void
}

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

  return { unlock, playCommentary, setMuted }
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
