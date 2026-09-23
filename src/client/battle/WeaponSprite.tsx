import { useEffect, useState } from 'react'
import type { AnimationType, VisualTag } from '../../shared/schemas/enums'
import { loadCutout } from './chroma-key'

export type WeaponPhase = 'float' | 'windup' | 'travel' | 'frozen' | 'return' | 'hidden'

export interface WeaponSpriteProps {
  imageUrl: string | null
  visualTag: VisualTag | null
  side: 'left' | 'right'
  phase: WeaponPhase
  animation: AnimationType
  isMiss?: boolean
  travelMs: number
  /** 무대 너비(px). 이동 거리 계산용 */
  stageWidth: number
}

const TRAVEL_RATIO = 0.52

const silhouetteUrl = (tag: VisualTag | null): string => `/assets/tag-${tag ?? 'ABSTRACT'}.svg`

/** 생성된 무기 그림의 초록을 오려낸 주소. 그림이 없으면 태그별 실루엣. */
export function useCutout(imageUrl: string | null, visualTag: VisualTag | null): string {
  const [src, setSrc] = useState<string>(() => imageUrl ?? silhouetteUrl(visualTag))

  useEffect(() => {
    let cancelled = false
    if (!imageUrl) {
      setSrc(silhouetteUrl(visualTag))
      return
    }
    loadCutout(imageUrl).then((cut) => {
      if (!cancelled) setSrc(cut)
    })
    return () => {
      cancelled = true
    }
  }, [imageUrl, visualTag])

  return src
}

/** 캐릭터 옆에 떠 있다가 공격 때 상대에게 날아가는 무기 그림. */
export function WeaponSprite({ imageUrl, visualTag, side, phase, animation, isMiss = false, travelMs, stageWidth }: WeaponSpriteProps) {
  const src = useCutout(imageUrl, visualTag)

  const direction = side === 'left' ? 1 : -1
  const travelPx = Math.round(stageWidth * TRAVEL_RATIO) * direction
  const isTravelLike = phase === 'travel' || phase === 'frozen'
  const cls = ['weapon', `weapon--${side}`, `anim-${animation}`]
  cls.push(isTravelLike ? 'weapon--travel' : `weapon--${phase}`)
  if (phase === 'frozen') cls.push('is-frozen')
  if (isMiss) cls.push('is-miss')

  const style = {
    ['--travel' as string]: `${travelPx}px`,
    ['--travel-ms' as string]: `${travelMs}ms`,
  }

  return (
    <>
      <div className={cls.join(' ')} style={style}>
        <img src={src} alt="" draggable={false} />
      </div>
      {isTravelLike && animation === 'SHOCKWAVE' && <div className={`shockwave shockwave--${side}`} style={style} />}
      {isTravelLike && animation === 'PSYCHIC' && <div className="psychic-noise" style={style} />}
    </>
  )
}
