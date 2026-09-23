import { useEffect, useRef, useState } from 'react'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { ClientState } from '../state/match-reducer'
import type { PlaybackState } from '../battle/usePlayback'
import { outcomeOf } from '../battle/outcome'
import { outcomeCue, resultCue, roundStartCue, type RoundMarker } from './cues'
import { createBrowserSfxPlayer, type SfxPlayer } from './sfx'

export interface UseSfxInput {
  state: ClientState
  playback: PlaybackState
  muted: boolean
  you: PlayerSlot | null
  /** Arena 가 고른 화면. 마지막 공격 재생이 끝날 때까지 FINISHED 여도 전투 화면이므로 phase 대신 이걸 따른다. */
  isBattle: boolean
  isFinished: boolean
}

/**
 * 경기 상태·재생 단계를 보고 효과음과 배경음을 낸다. 판단은 cues.ts 의 순수 함수가 하고,
 * 이 훅은 "언제 바뀌었나"만 감시한다. 반환한 player 는 반칙 호루라기처럼 밖에서 직접 쓸 수 있다.
 */
export function useSfx({ state, playback, muted, you, isBattle, isFinished }: UseSfxInput): SfxPlayer {
  const [sfx] = useState(() => createBrowserSfxPlayer())
  const phase = state.match?.phase ?? null
  const roundId = state.match?.roundId ?? null
  const winner = state.match?.winner ?? null
  const prevRound = useRef<RoundMarker | null>(null)

  useEffect(() => {
    sfx.setMuted(muted)
  }, [muted, sfx])

  useEffect(() => {
    if (isBattle) sfx.startBgm()
    else sfx.stopBgm()
  }, [isBattle, sfx])

  useEffect(() => {
    if (phase === null || roundId === null) return
    const next: RoundMarker = { phase, roundId }
    if (roundStartCue(prevRound.current, next)) sfx.play('round-start')
    prevRound.current = next
  }, [phase, roundId, sfx])

  useEffect(() => {
    if (isFinished) sfx.play(resultCue(winner, you))
  }, [isFinished, winner, you, sfx])

  const attack = playback.attack
  useEffect(() => {
    if (playback.step === 'result' && attack) sfx.play(outcomeCue(outcomeOf(attack)))
    // index 가 같이 바뀌므로 공격 1→2 전환에서도 result 마다 한 번씩 울린다.
  }, [playback.step, playback.index, attack, sfx])

  useEffect(() => () => sfx.stopBgm(), [sfx])

  return sfx
}
