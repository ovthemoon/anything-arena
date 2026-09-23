import type { Effectiveness } from '../schemas/enums'

export type Damage = 20 | 30 | 40

const DAMAGE_TABLE: Record<Effectiveness, Damage> = { LIMITED: 20, NORMAL: 30, STRONG: 40 }

export const DEFAULT_ATTACK_DAMAGE: Damage = 30

export const damageFor = (effectiveness: Effectiveness): Damage => DAMAGE_TABLE[effectiveness]
