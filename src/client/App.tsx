import { useEffect, useState } from 'react'
import { DebugArena } from './screens/DebugArena'
import './App.css'

interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  error: string | null
}

async function postJson<T>(url: string): Promise<ApiEnvelope<T>> {
  const res = await fetch(url, { method: 'POST', credentials: 'same-origin' })
  return (await res.json()) as ApiEnvelope<T>
}

function StartScreen({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createRoom = async () => {
    setError(null)
    try {
      const res = await postJson<{ roomCode: string; joinUrl: string }>('/api/rooms')
      if (res.success && res.data) {
        onNavigate(`/screen/${res.data.roomCode}`)
      } else {
        setError(res.error ?? '방 생성 실패')
      }
    } catch {
      setError('네트워크 오류')
    }
  }

  const joinRoom = async () => {
    setError(null)
    const code = joinCode.trim()
    if (!code) return
    try {
      const res = await postJson<{ roomCode: string; slot: 'A' | 'B' }>(`/api/rooms/${code}/join`)
      if (res.success && res.data) {
        onNavigate(`/play/${res.data.roomCode}`)
      } else {
        setError(res.error ?? '참가 실패')
      }
    } catch {
      setError('네트워크 오류')
    }
  }

  return (
    <section style={{ padding: 16, fontFamily: 'monospace' }}>
      <h1>Anything Arena (debug)</h1>
      <p>PC: 방 만들기 → 중계 화면(/screen/:code). 휴대폰: QR 또는 코드로 참가 → 조작 화면(/play/:code).</p>
      <button type="button" onClick={createRoom}>
        방 만들기 (PC)
      </button>
      <div style={{ marginTop: 12 }}>
        <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="방 코드" />
        <button type="button" onClick={joinRoom}>
          코드로 참가 (한 기기 테스트용)
        </button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </section>
  )
}

interface Route {
  kind: 'screen' | 'play'
  code: string
}

function parseRoute(pathname: string): Route | null {
  const screenMatch = pathname.match(/^\/screen\/([^/]+)$/)
  if (screenMatch) return { kind: 'screen', code: screenMatch[1] }
  const playMatch = pathname.match(/^\/play\/([^/]+)$/)
  if (playMatch) return { kind: 'play', code: playMatch[1] }
  return null
}

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setPathname(path)
  }

  const route = parseRoute(pathname)

  if (route?.kind === 'screen') return <DebugArena roomCode={route.code} />
  if (route?.kind === 'play') return <DebugArena roomCode={route.code} autoJoin />

  return <StartScreen onNavigate={navigate} />
}

export default App
