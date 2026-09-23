import { useEffect, useState } from 'react'
import { Arena } from './screens/Arena'
import { DebugArena } from './screens/DebugArena'
import { DemoScreen } from './screens/DemoScreen'
import { StartScreen } from './screens/StartScreen'
import './App.css'

interface Route {
  kind: 'screen' | 'play' | 'debug-screen' | 'debug-play'
  code: string
}

function parseRoute(pathname: string): Route | null {
  const m = pathname.match(/^\/(debug\/)?(screen|play)\/([^/]+)$/)
  if (!m) return null
  const kind = m[2] as 'screen' | 'play'
  return { kind: m[1] ? (`debug-${kind}` as Route['kind']) : kind, code: m[3] }
}

/** 라우팅: /screen,/play → 연출 화면. /debug/screen,/debug/play → 로직 디버그 화면(다른 세션용). */
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

  if (pathname === '/demo') return <DemoScreen />
  const route = parseRoute(pathname)
  if (route?.kind === 'screen') return <Arena roomCode={route.code} />
  if (route?.kind === 'play') return <Arena roomCode={route.code} autoJoin />
  if (route?.kind === 'debug-screen') return <DebugArena roomCode={route.code} />
  if (route?.kind === 'debug-play') return <DebugArena roomCode={route.code} autoJoin />
  return <StartScreen onNavigate={navigate} />
}

export default App
