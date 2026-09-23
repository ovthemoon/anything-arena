import { z } from 'zod'
import { LIMITS, countChars } from '../rules/limits'
import { AnimationType, CharacterId, VisualTag } from './enums'

const bounded = (max: number) => z.string().refine((s) => countChars(s) <= max, { message: `max ${max} chars` })
const nonEmpty = (max: number) => bounded(max).refine((s) => countChars(s) > 0, { message: 'required' })

export const WeaponInput = z.object({
  nickname: nonEmpty(LIMITS.NICKNAME),
  /** 대기실에서 고른 고정 출연진. */
  characterId: CharacterId.optional(),
  /** 사람 캐릭터 설정. 예: '순대국밥 20년차 욕쟁이 할머니'. 비면 무기만으로 생성. */
  character: bounded(LIMITS.CHARACTER).default(''),
  weaponName: nonEmpty(LIMITS.WEAPON_NAME),
  description: bounded(LIMITS.WEAPON_DESCRIPTION).default(''),
})
export type WeaponInput = z.infer<typeof WeaponInput>

export const PreparedTechnique = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(20),
  actionText: bounded(LIMITS.ACTION_TEXT),
  animation: AnimationType,
  /** 이번 상대의 아픈 곳을 겨냥해 고른 추천이면 true. 휴대폰 추천 칩이 먼저 보여준다. */
  hitsWeakPoint: z.boolean().optional(),
})
export type PreparedTechnique = z.infer<typeof PreparedTechnique>

export const WeaponProfile = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  /** 캐릭터 이름 (사람). 없으면 무기 이름으로 표시. */
  characterName: z.string().max(40).default(''),
  characterId: CharacterId.nullable().default(null),
  /** 서버가 생성해 R2 에 저장한 무기 그림의 동일 출처 경로(/api/images/...). 없으면 null. */
  imageUrl: z.string().nullable().default(null),
  displayName: bounded(LIMITS.WEAPON_NAME),
  tagline: z.string().max(60),
  capabilities: z.array(z.string().min(1)).min(1).max(2),
  weakness: z.string().min(1),
  visualTag: VisualTag,
  /** 추천 한 마디 목록. 출연진 카드는 10개, AI 생성 무기는 2개. */
  techniques: z.array(PreparedTechnique).min(2).max(10),
})
export type WeaponProfile = z.infer<typeof WeaponProfile>
