import { useEffect, useState } from 'react'
import { BANNER_MS, bannerStageAt, type BannerStage } from './round-banner'
import { useT } from '../i18n/LangContext'

/** roundId 가 바뀌어 입력이 열릴 때마다 "ROUND N" → "싸워!" 를 잠깐 보여준다. */
export function useRoundBanner(roundId: number, isInputOpen: boolean): BannerStage | null {
  const [stage, setStage] = useState<BannerStage | null>(null)
  useEffect(() => {
    if (!isInputOpen || roundId <= 0) return
    const startedAt = Date.now()
    setStage(bannerStageAt(0))
    const tick = window.setTimeout(() => setStage(bannerStageAt(Date.now() - startedAt)), BANNER_MS.round)
    const end = window.setTimeout(() => setStage(null), BANNER_MS.round + BANNER_MS.fight)
    return () => {
      window.clearTimeout(tick)
      window.clearTimeout(end)
      setStage(null)
    }
    // 라운드 번호가 바뀔 때만 다시 시작한다. isInputOpen 은 첫 진입 판단용.
  }, [roundId, isInputOpen])
  return stage
}

export function RoundBanner({ stage, roundId }: { stage: BannerStage | null; roundId: number }) {
  const t = useT()
  if (!stage) return null
  return (
    <div className="banner" aria-live="polite">
      {stage === 'round' ? <div className="banner__round">{t.hud.round(roundId)}</div> : <div className="banner__fight">{t.battle.fight}</div>}
    </div>
  )
}
