import type { PlayerSlot } from '../../shared/schemas/enums'
import type { AttackEvent, RoundResolved } from '../../shared/schemas/match'
import type { ClientMessage } from '../../shared/schemas/messages'
import type { ClientState } from '../state/match-reducer'
import { newId } from '../lib/ids'
import { ActionPanel } from '../battle/ActionPanel'
import { CharacterSprite } from '../battle/CharacterSprite'
import { Fx } from '../battle/Fx'
import { Hud } from '../battle/Hud'
import { Impact } from '../battle/Impact'
import { RoundBanner, useRoundBanner } from '../battle/RoundBanner'
import { WeaponSprite, type WeaponPhase } from '../battle/WeaponSprite'
import { displayedHp } from '../battle/hp-display'
import { outcomeFx, outcomeOf, weaponImageUrlOf } from '../battle/outcome'
import { STEP_MS, buildAttackTimeline, type StepKind } from '../battle/timeline'
import { useLang, useT } from '../i18n/LangContext'
import type { PlaybackState } from '../battle/usePlayback'
import type { Pose, CharacterId } from '../battle/characters'
import type { Prefs } from '../battle/usePrefs'

export interface BattleScreenProps {
  state: ClientState
  you: PlayerSlot | null
  playback: PlaybackState
  /** 재생 중인 round_resolved. round_started 가 먼저 와도 재생이 끝날 때까지 유지된다. */
  resolved: RoundResolved | null
  seconds: number | null
  characterIds: Record<PlayerSlot, CharacterId | null>
  prefs: Prefs
  stageWidth: number
  send: (m: ClientMessage) => void
}

const sideOf = (slot: PlayerSlot): 'left' | 'right' => (slot === 'A' ? 'left' : 'right')

const ACTOR_ATTACK_STEPS: readonly StepKind[] = ['windup', 'travel', 'freeze', 'result']

/** 시간 초과로 아무 말도 못 한 공격. 공격 자세 없이 말풍선만 제자리에서 떤다. 라벨은 언어마다 달라 fallbackReason 으로 본다. */
const isFrozenAttack = (attack: AttackEvent | null): boolean => attack?.fallbackReason === 'TIMEOUT'

/** 카메라 펀치(줌인) 배율. 맞은 쪽으로 화면이 잠깐 다가갔다 돌아온다. */
const CAMERA_ZOOM: Record<'STRONG' | 'NORMAL' | 'LIMITED' | 'MISS', number> = { STRONG: 1.1, NORMAL: 1.06, LIMITED: 1.02, MISS: 1 }

const weaponPhaseFor = (step: StepKind | null, isActor: boolean, done: boolean): WeaponPhase => {
  if (!isActor || step === null) return done ? 'float' : 'float'
  switch (step) {
    case 'name':
      return 'float'
    case 'windup':
      return 'windup'
    case 'travel':
      return 'travel'
    case 'freeze':
      return 'frozen'
    case 'result':
      return 'hidden'
    case 'commentary':
      return 'return'
  }
}

interface SideVisual {
  pose: Pose
  shiftX: number
  isLunging: boolean
  isFlashing: boolean
}

const visualFor = (slot: PlayerSlot, pb: PlaybackState, attack: AttackEvent | null): SideVisual => {
  const base: SideVisual = { pose: 'idle', shiftX: 0, isLunging: false, isFlashing: false }
  if (!attack || pb.step === null) return base
  const fx = outcomeFx(outcomeOf(attack))
  if (attack.actor === slot) {
    if (isFrozenAttack(attack)) return base
    return {
      ...base,
      pose: ACTOR_ATTACK_STEPS.includes(pb.step) ? 'attack' : 'idle',
      isLunging: attack.animation === 'DASH' && (pb.step === 'travel' || pb.step === 'freeze'),
    }
  }
  if (attack.target === slot && pb.step === 'result') {
    return { pose: fx.targetPose, shiftX: fx.targetShift.x, isLunging: false, isFlashing: fx.targetPose === 'hit' }
  }
  return base
}

const travelMsFor = (pb: PlaybackState, reducedMotion: boolean): number =>
  buildAttackTimeline(reducedMotion, { isFinishing: pb.isFinishing }).find((s) => s.kind === 'travel')?.ms ?? STEP_MS.travel

/** 배틀 화면: 배경·캐릭터·무기·효과·HUD·(플레이어면) 입력 패널. 모든 값은 서버 상태에서 파생. */
export function BattleScreen({ state, you, playback, resolved, seconds, characterIds, prefs, stageWidth, send }: BattleScreenProps) {
  const match = state.match
  const isPlaying = resolved !== null && !playback.done
  const isInputOpen = match?.phase === 'ROUND_INPUT' && !isPlaying
  const banner = useRoundBanner(match?.roundId ?? 0, isInputOpen)
  const lang = useLang()
  const t = useT()
  if (!match) return null

  const attack = playback.attack
  const outcome = attack ? outcomeOf(attack) : 'NORMAL'
  const frozen = isFrozenAttack(attack)
  const fx = frozen ? { ...outcomeFx('MISS', lang), label: t.battle.frozen, targetShift: { x: 0, y: 0 } } : outcomeFx(outcome, lang)
  const isResult = playback.step === 'result' && !!attack
  const isFreeze = playback.step === 'freeze' && !!attack && !prefs.reducedMotion
  const isShaking = isResult && prefs.shakeOn && fx.shakePx > 0 && !prefs.reducedMotion
  const isPunching = isResult && !frozen && !prefs.reducedMotion && CAMERA_ZOOM[outcome] > 1
  const isDashing = !!attack && !frozen && attack.animation === 'DASH' && playback.step === 'travel' && outcome !== 'MISS' && !prefs.reducedMotion
  const travelMs = travelMsFor(playback, prefs.reducedMotion)

  const me = you ? match.players[you] : undefined
  const opponent = you ? match.players[you === 'A' ? 'B' : 'A'] : undefined

  const commentaryText = attack ? state.commentary[attack.eventId]?.text ?? null : null
  const showSubtitle = !!commentaryText && (playback.step === 'commentary' || playback.done)

  const submitTechnique = (techniqueId: string) => send({ type: 'action_submit', matchId: match.matchId, roundId: match.roundId, actionId: newId(), techniqueId })
  const submitFreeText = (text: string) => send({ type: 'action_submit', matchId: match.matchId, roundId: match.roundId, actionId: newId(), text })

  const playersForHud = {
    A: match.players.A ? { ...match.players.A, hp: displayedHp(playback, resolved, 'A', match.players.A.hp) } : undefined,
    B: match.players.B ? { ...match.players.B, hp: displayedHp(playback, resolved, 'B', match.players.B.hp) } : undefined,
  }

  const targetSide = attack ? sideOf(attack.target) : 'right'
  const stageCls = ['stage', `stage--focus-${targetSide}`]
  if (isShaking) stageCls.push('is-shaking')
  if (isPunching) stageCls.push('is-punching')
  if (isFreeze) stageCls.push('is-hitstop')
  const stageStyle = {
    ['--shake-px' as string]: `${fx.shakePx}px`,
    ['--shake-ms' as string]: `${fx.shakeMs}ms`,
    ['--zoom' as string]: String(CAMERA_ZOOM[outcome]),
  }
  // 그림 무기일 때만 기술명 컷인. 말풍선 모드는 말풍선 자체가 기술명이다.
  const showNameCutIn = !!attack && playback.step === 'name' && !!weaponImageUrlOf(match.players[attack.actor]?.weapon)

  return (
    <div className="arena">
      <div className={stageCls.join(' ')} style={stageStyle}>
        <div className="arena__floor" />
        {isDashing && attack && <div className={`speedlines speedlines--${sideOf(attack.actor)}`} style={{ ['--travel-ms' as string]: `${travelMs}ms` }} />}

        {(['A', 'B'] as const).map((slot) => {
          const player = match.players[slot]
          const v = visualFor(slot, playback, attack)
          const isActor = attack?.actor === slot
          const hasImage = !!weaponImageUrlOf(player?.weapon)
          // 말풍선 모드: 기술명 단계(2.2초) 동안 말풍선이 공격자 옆에 먼저 떠서 읽을 시간을 준다
          const phase = !hasImage && isActor && playback.step === 'name' ? 'windup' : weaponPhaseFor(playback.step, isActor, playback.done)
          return (
            <div key={slot} style={{ display: 'contents' }}>
              <CharacterSprite id={characterIds[slot]} pose={v.pose} side={sideOf(slot)} shiftX={v.shiftX} isLunging={v.isLunging} isFlashing={v.isFlashing} />
              {player?.weapon && (
                <WeaponSprite
                  imageUrl={weaponImageUrlOf(player.weapon)}
                  visualTag={player.weapon.visualTag}
                  side={sideOf(slot)}
                  phase={phase}
                  animation={attack && isActor ? attack.animation : 'DASH'}
                  isMiss={isActor && outcome === 'MISS' && !frozen}
                  isStatic={isActor && frozen}
                  text={isActor && attack ? attack.approvedActionText || attack.techniqueLabel : null}
                  travelMs={travelMs}
                  stageWidth={stageWidth}
                />
              )}
            </div>
          )
        })}

        {attack && isResult && !frozen && (
          <Impact outcome={outcome} targetSide={targetSide} seed={(resolved?.eventSeq ?? 0) * 2 + (playback.index ?? 0)} reducedMotion={prefs.reducedMotion} />
        )}
        {attack && isResult && (
          <Fx kind="result" text={fx.label} outcome={outcome} damage={attack.damage} targetSide={targetSide} showDamage={fx.showDamage} isFinishing={playback.isFinishing} />
        )}
      </div>

      {showNameCutIn && attack && <Fx kind="name" text={attack.techniqueLabel} />}
      <RoundBanner stage={isPlaying ? null : banner} roundId={match.roundId} />

      <Hud players={playersForHud} characterIds={characterIds} roundId={isPlaying && resolved ? resolved.roundId : match.roundId} seconds={isInputOpen ? seconds : null} />

      {showSubtitle && <div className={`subtitle${you ? ' is-raised' : ''}`}>🔊 {commentaryText}</div>}

      {you && (
        <ActionPanel
          me={me}
          opponentWeakness={opponent?.weapon?.weakness ?? null}
          suggestionSeed={`${match.matchId}:${match.roundId}:${you}`}
          isInputOpen={isInputOpen}
          isCollapsed={isPlaying}
          commentaryText={null}
          rejected={state.rejected}
          onFreeText={submitFreeText}
          onTechnique={submitTechnique}
        />
      )}
    </div>
  )
}
