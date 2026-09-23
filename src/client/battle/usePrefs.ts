import { useEffect, useState } from 'react'

const read = (key: string, fallback: boolean): boolean => {
  try {
    const v = localStorage.getItem(key)
    if (v === 'on') return true
    if (v === 'off') return false
  } catch {
    /* private mode / blocked storage */
  }
  return fallback
}

const write = (key: string, on: boolean): void => {
  try {
    localStorage.setItem(key, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
}

export interface Prefs {
  soundOn: boolean
  shakeOn: boolean
  reducedMotion: boolean
  setSoundOn: (on: boolean) => void
  setShakeOn: (on: boolean) => void
}

/** 소리·흔들림 토글(localStorage)과 OS 의 '동작 줄이기' 설정. */
export function usePrefs(defaultSound: boolean): Prefs {
  const [soundOn, setSound] = useState(() => read('audio', defaultSound))
  const [shakeOn, setShake] = useState(() => read('shake', true))
  const [reducedMotion, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return {
    soundOn,
    shakeOn,
    reducedMotion,
    setSoundOn: (on) => {
      write('audio', on)
      setSound(on)
    },
    setShakeOn: (on) => {
      write('shake', on)
      setShake(on)
    },
  }
}
