export interface AudioHandle {
  stop: () => void
}

export interface PlayOptions {
  /** 1 = 원래 속도. 해설은 빨리감기로 튼다 (COMMENTARY_PLAYBACK_RATE). */
  rate: number
  /** 끝났거나(ended) 못 틀었을 때(error·자동재생 차단) 한 번 호출. */
  onEnded?: () => void
}

export interface AudioManagerDeps {
  now: () => number
  play: (url: string, options: PlayOptions) => AudioHandle
  speak: (text: string) => void
}

/**
 * 해설 음성 빨리감기 배수. 서버가 만든 파일은 그대로 두고 브라우저에서 빠르게 튼다 (음높이는 유지).
 * 7~10초짜리 해설이 2배면 3.5~5초. 해설 장면(2.5초)을 넘는 만큼은 연출이 기다린다 (waitForCommentary).
 */
export const COMMENTARY_PLAYBACK_RATE = 2
const LINE_PLAYBACK_RATE = 1
/** 해설 음성이 끝나길 기다리는 최대 시간. 이 이상은 연출이 더 안 기다린다. */
export const COMMENTARY_HOLD_MAX_MS = 8_000

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
  /** 미리 녹음된 한 마디(추천 문구) 재생. 해설과 같은 '한 번에 하나' 자리를 쓴다: 서로 끊는다. 같은 lineId 는 한 번만. */
  playLine: (lineId: string, audioPath: string) => void
  /**
   * 그 공격의 해설 음성이 끝날 때까지 기다린다 (연출이 다음 공격으로 넘어가기 전에 부른다).
   * 즉시 끝나는 경우: 음소거, 이미 끝남, 음성 없이 자막만. 도착 창(2.5초) 안에 시작도 안 하면 포기.
   * 어떤 경우에도 maxMs 를 넘기지 않는다.
   */
  waitForCommentary: (eventId: string, maxMs: number) => Promise<void>
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
  /** 지금 재생 중인 해설의 eventId. 한 마디(playLine)는 추적하지 않는다. */
  let playingId: string | null = null
  const endedIds = new Set<string>()
  const waiters = new Map<string, Array<() => void>>()

  /** 해설 하나가 끝났다(자연 종료·교체·실패 모두). 기다리던 쪽을 깨운다. */
  const settle = (eventId: string): void => {
    endedIds.add(eventId)
    if (playingId === eventId) playingId = null
    const pending = waiters.get(eventId) ?? []
    waiters.delete(eventId)
    for (const wake of pending) wake()
  }

  const stopCurrent = (): void => {
    current?.stop()
    current = null
    if (playingId) settle(playingId)
  }

  const playCommentary = (eventId: string, audioPath: string | null, text: string, validUntil: number): void => {
    if (muted) return
    if (deps.now() >= validUntil) return
    if (seenEventIds.has(eventId)) return
    seenEventIds.add(eventId)

    stopCurrent()

    if (audioPath) {
      playingId = eventId
      current = deps.play(audioPath, {
        rate: COMMENTARY_PLAYBACK_RATE,
        onEnded: () => {
          if (playingId !== eventId) return
          current = null
          settle(eventId)
        },
      })
    } else {
      deps.speak(text)
      settle(eventId) // 브라우저 합성 음성은 끝을 알 수 없다: 기다리지 않는다
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

  const seenLineIds = new Set<string>()
  const playLine = (lineId: string, audioPath: string): void => {
    if (muted) return
    if (seenLineIds.has(lineId)) return
    seenLineIds.add(lineId)
    stopCurrent()
    current = deps.play(audioPath, { rate: LINE_PLAYBACK_RATE })
  }

  const waitForCommentary = (eventId: string, maxMs: number): Promise<void> =>
    new Promise((resolve) => {
      if (muted || endedIds.has(eventId)) {
        resolve()
        return
      }
      let isDone = false
      const finish = (): void => {
        if (isDone) return
        isDone = true
        clearTimeout(cap)
        clearTimeout(arrival)
        resolve()
      }
      waiters.set(eventId, [...(waiters.get(eventId) ?? []), finish])
      const cap = setTimeout(finish, maxMs)
      // 도착 창이 지났는데 시작도 안 했으면 (음성 실패·지연) 더 기다리지 않는다
      const arrival = setTimeout(() => {
        if (playingId !== eventId) finish()
      }, DEFAULT_WINDOW_MS)
    })

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

  return { unlock, playCommentary, schedule, playScheduled, playLine, waitForCommentary, setMuted }
}

export function createBrowserAudioManager(): AudioManager {
  return createAudioManager({
    now: () => Date.now(),
    play: (url: string, { rate, onEnded }: PlayOptions) => {
      const audio = new Audio(url)
      audio.playbackRate = rate
      audio.preservesPitch = true
      if (onEnded) {
        audio.addEventListener('ended', onEnded, { once: true })
        audio.addEventListener('error', onEnded, { once: true })
      }
      void audio.play().catch(() => onEnded?.())
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
