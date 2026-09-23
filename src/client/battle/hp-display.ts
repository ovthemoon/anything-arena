import type { PlayerSlot } from '../../shared/schemas/enums'
import type { RoundResolved } from '../../shared/schemas/match'
import type { PlaybackState } from './usePlayback'
import type { StepKind } from './timeline'

const LANDED_STEPS: readonly StepKind[] = ['result', 'commentary']

/**
 * 리듀서는 round_resolved 를 받는 즉시 서버 HP 를 반영한다. 화면은 그 값을
 * 공격이 "맞는 순간"까지 미뤄서 보여준다. 기준값은 언제나 서버(hpBefore/hpAfter)다.
 */
export const displayedHp = (pb: PlaybackState, playback: RoundResolved | null, slot: PlayerSlot, serverHp: number): number => {
  if (!playback || pb.done) return serverHp
  const before = playback.hpBefore[slot]
  if (before === undefined) return serverHp

  let hp = before
  playback.playbackOrder.forEach((actor, k) => {
    const attack = playback.attacks.find((a) => a.actor === actor)
    if (!attack || attack.target !== slot) return
    const landed = pb.index !== null && (pb.index > k || (pb.index === k && pb.step !== null && LANDED_STEPS.includes(pb.step)))
    if (landed) hp -= attack.damage
  })
  return Math.max(0, hp)
}
