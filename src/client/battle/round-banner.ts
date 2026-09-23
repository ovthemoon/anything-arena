export type BannerStage = 'round' | 'fight'

/** 라운드 시작 배너: "ROUND N" 다음 "싸워!". 서버 타이머와 무관한 순수 연출. */
export const BANNER_MS: Record<BannerStage, number> = { round: 700, fight: 700 }

export const bannerStageAt = (elapsedMs: number): BannerStage | null => {
  if (elapsedMs < BANNER_MS.round) return 'round'
  if (elapsedMs < BANNER_MS.round + BANNER_MS.fight) return 'fight'
  return null
}
