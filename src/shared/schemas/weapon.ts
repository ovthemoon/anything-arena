import { z } from 'zod'
import { LIMITS, countChars } from '../rules/limits'
import { AnimationType, VisualTag } from './enums'

const bounded = (max: number) => z.string().refine((s) => countChars(s) <= max, { message: `max ${max} chars` })
const nonEmpty = (max: number) => bounded(max).refine((s) => countChars(s) > 0, { message: 'required' })

export const WeaponInput = z.object({
  nickname: nonEmpty(LIMITS.NICKNAME),
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
})
export type PreparedTechnique = z.infer<typeof PreparedTechnique>

export const WeaponProfile = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  /** 캐릭터 이름 (사람). 없으면 무기 이름으로 표시. */
  characterName: z.string().max(40).default(''),
  displayName: bounded(LIMITS.WEAPON_NAME),
  tagline: z.string().max(60),
  capabilities: z.array(z.string().min(1)).min(1).max(2),
  weakness: z.string().min(1),
  visualTag: VisualTag,
  techniques: z.tuple([PreparedTechnique, PreparedTechnique]),
})
export type WeaponProfile = z.infer<typeof WeaponProfile>
