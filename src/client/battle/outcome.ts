import type { Pose } from './characters'
import { DEFAULT_LANG, type Lang } from '../../shared/i18n/lang'
import { stringsFor } from '../i18n/strings'

/** 판정 4단계. 서버 enum 에 MISS 가 추가되기 전에도 damage 0 을 MISS 로 본다. */
export type Outcome = 'STRONG' | 'NORMAL' | 'LIMITED' | 'MISS'

const KNOWN: readonly Outcome[] = ['STRONG', 'NORMAL', 'LIMITED', 'MISS']

export const outcomeOf = (attack: { effectiveness: string; damage: number }): Outcome => {
  if (attack.damage === 0 || attack.effectiveness === 'MISS') return 'MISS'
  return KNOWN.includes(attack.effectiveness as Outcome) ? (attack.effectiveness as Outcome) : 'NORMAL'
}

export interface OutcomeFx {
  targetPose: Pose
  label: string
  shakePx: number
  shakeMs: number
  showDamage: boolean
  /** 피격자가 밀리는 방향. x 양수 = 공격자 반대쪽으로 */
  targetShift: { x: number; y: number }
}

const FX: Record<Outcome, Omit<OutcomeFx, 'label'>> = {
  STRONG: { targetPose: 'hit', shakePx: 8, shakeMs: 300, showDamage: true, targetShift: { x: 24, y: 0 } },
  NORMAL: { targetPose: 'hit', shakePx: 5, shakeMs: 250, showDamage: true, targetShift: { x: 16, y: 0 } },
  LIMITED: { targetPose: 'idle', shakePx: 2, shakeMs: 150, showDamage: true, targetShift: { x: 40, y: 0 } },
  MISS: { targetPose: 'idle', shakePx: 0, shakeMs: 0, showDamage: false, targetShift: { x: 60, y: 0 } },
}

const labelFor = (o: Outcome, lang: Lang): string => {
  const t = stringsFor(lang).outcome
  return { STRONG: t.strong, NORMAL: t.normal, LIMITED: t.limited, MISS: t.miss }[o]
}

/** 연출 수치는 언어와 무관하고 라벨('쾅!'/'BAM!')만 언어를 따른다. */
export const outcomeFx = (o: Outcome, lang: Lang = DEFAULT_LANG): OutcomeFx => ({ ...FX[o], label: labelFor(o, lang), targetShift: { ...FX[o].targetShift } })

/** WeaponProfile.imageUrl 은 로직 세션 계약 변경 후 생긴다. 그 전엔 null. */
export const weaponImageUrlOf = (weapon: { imageUrl?: unknown } | null | undefined): string | null => {
  const url = weapon?.imageUrl
  return typeof url === 'string' && url.length > 0 ? url : null
}
