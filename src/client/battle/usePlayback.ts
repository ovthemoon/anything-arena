import { useEffect, useState } from 'react'
import type { AttackEvent, RoundResolved } from '../../shared/schemas/match'
import { finishingIndex } from './finishing'
import { buildAttackTimeline, type StepKind } from './timeline'

export interface PlaybackState {
  /** 0 = 첫 공격, 1 = 두 번째, null = 재생 없음 */
  index: 0 | 1 | null
  attack: AttackEvent | null
  step: StepKind | null
  done: boolean
  /** 지금 재생 중인 공격이 상대 체력을 0 으로 만드는 결정타 */
  isFinishing: boolean
}

const IDLE: PlaybackState = { index: null, attack: null, step: null, done: false, isFinishing: false }

const attacksInOrder = (playback: RoundResolved): [AttackEvent, AttackEvent] | null => {
  const [first, second] = playback.playbackOrder.map((slot) => playback.attacks.find((a) => a.actor === slot))
  return first && second ? [first, second] : null
}

/**
 * round_resolved 하나를 시간 순서로 재생한다. 서버 값은 이미 확정돼 있고,
 * 이 훅은 "지금 어느 장면인지"만 알려준다. playback 이 바뀌면 처음부터.
 */
export function usePlayback(playback: RoundResolved | null, reducedMotion: boolean): PlaybackState {
  const [state, setState] = useState<PlaybackState>(IDLE)
  const key = playback ? `${playback.matchId}:${playback.roundId}:${playback.eventSeq}` : null

  useEffect(() => {
    if (!playback) {
      setState(IDLE)
      return
    }
    const attacks = attacksInOrder(playback)
    if (!attacks) {
      setState({ ...IDLE, done: true })
      return
    }

    const finishing = finishingIndex(playback)
    const timers: number[] = []
    let elapsed = 0
    for (const index of [0, 1] as const) {
      const isFinishing = finishing === index
      for (const step of buildAttackTimeline(reducedMotion, { isFinishing })) {
        const at = elapsed
        timers.push(window.setTimeout(() => setState({ index, attack: attacks[index], step: step.kind, done: false, isFinishing }), at))
        elapsed += step.ms
      }
    }
    timers.push(window.setTimeout(() => setState({ index: 1, attack: attacks[1], step: null, done: true, isFinishing: false }), elapsed))

    return () => {
      for (const t of timers) window.clearTimeout(t)
    }
    // key 가 playback 의 정체성. reducedMotion 이 중간에 바뀌면 다시 재생해도 무방.
  }, [key, reducedMotion]) // eslint-disable-line react-hooks/exhaustive-deps

  return state
}
