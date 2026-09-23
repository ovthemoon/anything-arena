import { useState } from 'react'
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

/** 시작 화면: 방 만들기(PC 중계 화면) / 코드로 참가(휴대폰). PRD §11. */
export function StartScreen({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const createRoom = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await postJson<{ roomCode: string; joinUrl: string }>('/api/rooms')
      if (res.success && res.data) onNavigate(`/screen/${res.data.roomCode}`)
      else setError(res.error ?? '방을 만들지 못했어요. 다시 시도해 주세요.')
    } catch {
      setError('네트워크 오류. 연결을 확인해 주세요.')
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
    <main className="screen">
      <div className="screen__box">
        <img className="start-logo" src="/assets/logo.png" alt="아무거나 무기 배틀" />
        <p>무기를 가져오세요. 강한 이유는 저희가 갖다 붙입니다.</p>
        <p className="muted">예: 젖은 양말 vs 배터리 1% 스마트폰</p>
        <div className="row">
          <button type="button" className="btn" disabled={busy} onClick={createRoom}>
            방 만들기 (중계 화면)
          </button>
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            joinRoom()
          }}
        >
          <input className="input" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="방 코드" />
          <button type="submit" className="btn btn--ghost">
            코드로 참가
          </button>
        </form>
        {error && <p className="err">{error}</p>}
      </div>
    </main>
  )
}
