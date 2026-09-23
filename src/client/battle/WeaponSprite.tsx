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
  /** 긁기 배틀: 이미지가 없으면 이 한 마디가 말풍선으로 날아간다 */
  text?: string | null
  travelMs: number
  /** 무대 너비(px). 이동 거리 계산용 */
  stageWidth: number
}

const TRAVEL_RATIO = 0.52
/** 말풍선은 폭이 넓어서 덜 날아가야 상대 머리 위에 멈춘다 */
const BUBBLE_TRAVEL_RATIO = 0.36

const silhouetteUrl = (tag: VisualTag | null): string => `/assets/tag-${tag ?? 'ABSTRACT'}.svg`

/** 캐릭터 옆에 떠 있다가 공격 때 상대에게 날아가는 무기 그림. */
export function WeaponSprite({ imageUrl, visualTag, side, phase, animation, isMiss = false, text = null, travelMs, stageWidth }: WeaponSpriteProps) {
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

  const direction = side === 'left' ? 1 : -1
  const travelPx = Math.round(stageWidth * (imageUrl ? TRAVEL_RATIO : BUBBLE_TRAVEL_RATIO)) * direction
  const isTravelLike = phase === 'travel' || phase === 'frozen'
  const cls = ['weapon', `weapon--${side}`, `anim-${animation}`]
  cls.push(isTravelLike ? 'weapon--travel' : `weapon--${phase}`)
  if (phase === 'frozen') cls.push('is-frozen')
  if (isMiss) cls.push('is-miss')

  const style = {
    ['--travel' as string]: `${travelPx}px`,
    ['--travel-ms' as string]: `${travelMs}ms`,
  }

  // 이미지가 없으면: 대기 중엔 아무것도 없고, 공격 중엔 한 마디가 말풍선으로 날아간다.
  if (!imageUrl) {
    if (phase === 'float' || phase === 'hidden' || !text) return null
    cls.push('weapon--bubble')
    return (
      <>
        <div className={cls.join(' ')} style={style}>
          <div className={`bubble bubble--${side}`}>{text}</div>
        </div>
        {isTravelLike && animation === 'SHOCKWAVE' && <div className={`shockwave shockwave--${side}`} style={style} />}
        {isTravelLike && animation === 'PSYCHIC' && <div className="psychic-noise" style={style} />}
      </>
    )
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
