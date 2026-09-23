import type { AttackEvent } from '../../shared/schemas/match'
import type { PlaybackStep, StepKind } from './timeline'

export interface SequencerState {
  index: 0 | 1
  attack: AttackEvent
  step: StepKind | null
  done: boolean
  isFinishing: boolean
}

export interface SequencerInput {
  attacks: [AttackEvent, AttackEvent]
  /** 공격별 장면 목록 (결정타면 다를 수 있다) */
  steps: [readonly PlaybackStep[], readonly PlaybackStep[]]
  finishing: 0 | 1 | null
  sleep: (ms: number) => Promise<void>
  /**
   * 해설 장면에서 추가로 기다릴 것 (해설 음성이 끝날 때까지). 장면 기본 길이와 이것 중 긴 쪽만큼 머문다.
   * 없거나 실패하면 기본 길이만.
   */
  hold?: (attack: AttackEvent) => Promise<void>
  onState: (state: SequencerState) => void
}

/**
 * 두 공격을 장면 순서대로 돌리며 "지금 어느 장면인지"를 알린다. 취소 함수를 돌려준다.
 * 시간은 sleep 으로만 흐르므로 테스트에서 가짜 타이머로 돌릴 수 있다.
 */
export const runPlayback = (input: SequencerInput): (() => void) => {
  let isCancelled = false

  const run = async (): Promise<void> => {
    for (const index of [0, 1] as const) {
      const attack = input.attacks[index]
      const isFinishing = input.finishing === index
      for (const step of input.steps[index]) {
        if (isCancelled) return
        input.onState({ index, attack, step: step.kind, done: false, isFinishing })
        const waits = [input.sleep(step.ms)]
        if (step.kind === 'commentary' && input.hold) waits.push(input.hold(attack).catch(() => undefined))
        await Promise.all(waits)
      }
    }
    if (!isCancelled) input.onState({ index: 1, attack: input.attacks[1], step: null, done: true, isFinishing: false })
  }

  // 어떤 이유로든 순서기가 죽으면 장면에 갇히지 않게 '끝'으로 넘긴다
  run().catch(() => {
    if (!isCancelled) input.onState({ index: 1, attack: input.attacks[1], step: null, done: true, isFinishing: false })
  })
  return () => {
    isCancelled = true
  }
}
