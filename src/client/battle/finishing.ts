import type { PlayerSlot } from '../../shared/schemas/enums'
import type { RoundResolved } from '../../shared/schemas/match'

export type MatchEndKind = 'KO' | 'TIME_UP'

/**
 * 재생 순서상 어느 공격이 상대 체력을 0 으로 만드는지. 없으면 null.
 * 기준은 서버의 hpBefore 와 damage 뿐이다.
 */
export const finishingIndex = (playback: RoundResolved): 0 | 1 | null => {
  const hp: Record<string, number> = { ...playback.hpBefore }
  for (const [k, actor] of playback.playbackOrder.entries()) {
    const attack = playback.attacks.find((a) => a.actor === actor)
    if (!attack || attack.damage === 0) continue
    const before = hp[attack.target]
    if (before === undefined) continue
    const after = before - attack.damage
    hp[attack.target] = after
    if (after <= 0) return k === 0 ? 0 : 1
  }
  return null
}

/** 경기 종료 종류: 누군가 쓰러졌으면 KO, 3라운드를 버텼으면 TIME_UP. */
export const matchEndKind = (hp: Partial<Record<PlayerSlot, number>>): MatchEndKind =>
  Object.values(hp).some((v) => v !== undefined && v <= 0) ? 'KO' : 'TIME_UP'
