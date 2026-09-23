import { useState } from 'react'
import type { Lang } from '../../shared/i18n/lang'
import { LangProvider } from '../i18n/LangContext'
import { readLangPref, writeLangPref } from '../i18n/pref'
import { stringsFor } from '../i18n/strings'
import './screens.css'

interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  error: string | null
}

async function postJson<T>(url: string): Promise<ApiEnvelope<T>> {
  const res = await fetch(url, { method: 'POST', credentials: 'same-origin' })
  return (await res.json()) as ApiEnvelope<T>
}

/** 방 만들기 주소. 언어는 방 전체(카드·AI·문구)가 따르므로 만들 때 함께 보낸다. */
export const createRoomUrl = (mode: 'pvp' | 'solo', lang: Lang): string => {
  const params = new URLSearchParams({ lang })
  if (mode === 'solo') params.set('mode', 'solo')
  return `/api/rooms?${params.toString()}`
}

/** 시작 화면: 방 만들기(PC 중계 화면) / 코드로 참가(휴대폰). PRD §11. 언어 토글은 이 기기에 저장되고 새 방에 적용된다. */
export function StartScreen({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lang, setLang] = useState<Lang>(readLangPref)
  const t = stringsFor(lang)

  const toggleLang = () => {
    const next: Lang = lang === 'ko' ? 'en' : 'ko'
    writeLangPref(next)
    setLang(next)
  }

  const createRoom = async (mode: 'pvp' | 'solo' = 'pvp') => {
    setError(null)
    setBusy(true)
    try {
      const res = await postJson<{ roomCode: string; joinUrl: string }>(createRoomUrl(mode, lang))
      if (res.success && res.data) onNavigate(`/screen/${res.data.roomCode}`)
      else setError(res.error ?? t.start.createFailed)
    } catch {
      setError(t.start.networkError)
    } finally {
      setBusy(false)
    }
  }

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    onNavigate(`/play/${code}`)
  }

  return (
    <LangProvider lang={lang}>
      <main className="screen screen--start">
        <button type="button" className="btn btn--ghost lang-toggle" onClick={toggleLang} aria-label={t.langToggle}>
          🌐 {t.langToggle}
        </button>
        <div className="screen__box">
          <img className="start-logo" src="/assets/logo.png" alt={t.appTitle} />
          <p>{t.start.tagline}</p>
          <p className="muted">{t.start.example}</p>
          <div className="row">
            <button type="button" className="btn" disabled={busy} onClick={() => createRoom()}>
              {t.start.createRoom}
            </button>
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => createRoom('solo')}>
              {t.start.soloRoom}
            </button>
          </div>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault()
              joinRoom()
            }}
          >
            <input className="input" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder={t.start.codePlaceholder} />
            <button type="submit" className="btn btn--ghost">
              {t.start.join}
            </button>
          </form>
          {error && <p className="err">{error}</p>}
        </div>
      </main>
    </LangProvider>
  )
}
