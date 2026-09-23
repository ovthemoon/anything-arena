import type { PlayerSlot } from '../../shared/schemas/enums'
import type { AttackEvent } from '../../shared/schemas/match'
import type { ClientMessage } from '../../shared/schemas/messages'
import type { ClientState } from '../state/match-reducer'
import { newId } from '../lib/ids'
import { ActionPanel } from '../battle/ActionPanel'
import { CharacterSprite } from '../battle/CharacterSprite'
import { Fx } from '../battle/Fx'
import { Hud } from '../battle/Hud'
import { WeaponSprite, type WeaponPhase } from '../battle/WeaponSprite'
import { displayedHp } from '../battle/hp-display'
import { outcomeFx, outcomeOf, weaponImageUrlOf } from '../battle/outcome'
import { STEP_MS, type StepKind } from '../battle/timeline'
import type { PlaybackState } from '../battle/usePlayback'
import type { Pose, CharacterId } from '../battle/characters'
import type { Prefs } from '../battle/usePrefs'

export interface BattleScreenProps {
  state: ClientState
  you: PlayerSlot | null
  playback: PlaybackState
  seconds: number | null
  characterIds: Record<PlayerSlot, CharacterId | null>
  prefs: Prefs
  stageWidth: number
  send: (m: ClientMessage) => void
}

const sideOf = (slot: PlayerSlot): 'left' | 'right' => (slot === 'A' ? 'left' : 'right')

const ACTOR_ATTACK_STEPS: readonly StepKind[] = ['windup', 'travel', 'freeze', 'result']

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

/** 배틀 화면: 배경·캐릭터·무기·효과·HUD·(플레이어면) 입력 패널. 모든 값은 서버 상태에서 파생. */
export function BattleScreen({ state, you, playback, seconds, characterIds, prefs, stageWidth, send }: BattleScreenProps) {
  const match = state.match
  if (!match) return null

  const attack = playback.attack
  const outcome = attack ? outcomeOf(attack) : 'NORMAL'
  const fx = outcomeFx(outcome)
  const isResult = playback.step === 'result' && !!attack
  const isShaking = isResult && prefs.shakeOn && fx.shakePx > 0 && !prefs.reducedMotion
  const travelMs = prefs.reducedMotion ? 200 : STEP_MS.travel

  const isPlaying = match.phase === 'ROUND_PLAYBACK' && !playback.done
  const isInputOpen = match.phase === 'ROUND_INPUT'
  const me = you ? match.players[you] : undefined

  const commentaryText = attack ? state.commentary[attack.eventId]?.text ?? null : null
  const showSubtitle = !!commentaryText && (playback.step === 'commentary' || playback.done)

  const submitTechnique = (techniqueId: string) => send({ type: 'action_submit', matchId: match.matchId, roundId: match.roundId, actionId: newId(), techniqueId })
  const submitFreeText = (text: string) => send({ type: 'action_submit', matchId: match.matchId, roundId: match.roundId, actionId: newId(), text })

  const playersForHud = {
    A: match.players.A ? { ...match.players.A, hp: displayedHp(playback, state.playback, 'A', match.players.A.hp) } : undefined,
    B: match.players.B ? { ...match.players.B, hp: displayedHp(playback, state.playback, 'B', match.players.B.hp) } : undefined,
  }

  const arenaStyle = { ['--shake-px' as string]: `${fx.shakePx}px`, ['--shake-ms' as string]: `${fx.shakeMs}ms` }

  return (
    <div className={`arena${isShaking ? ' is-shaking' : ''}`} style={arenaStyle}>
      <div className="arena__floor" />

      {(['A', 'B'] as const).map((slot) => {
        const player = match.players[slot]
        const v = visualFor(slot, playback, attack)
        const isActor = attack?.actor === slot
        return (
          <div key={slot} style={{ display: 'contents' }}>
            <CharacterSprite id={characterIds[slot]} pose={v.pose} side={sideOf(slot)} shiftX={v.shiftX} isLunging={v.isLunging} isFlashing={v.isFlashing} />
            {player?.weapon && (
              <WeaponSprite
                imageUrl={weaponImageUrlOf(player.weapon)}
                visualTag={player.weapon.visualTag}
                side={sideOf(slot)}
                phase={weaponPhaseFor(playback.step, isActor, playback.done)}
                animation={attack && isActor ? attack.animation : 'DASH'}
                isMiss={isActor && outcome === 'MISS'}
                travelMs={travelMs}
                stageWidth={stageWidth}
              />
            )}
          </div>
        )
      })}

      {attack && playback.step === 'name' && <Fx kind="name" text={attack.techniqueLabel} />}
      {attack && isResult && <Fx kind="result" text={fx.label} outcome={outcome} damage={attack.damage} targetSide={sideOf(attack.target)} showDamage={fx.showDamage} />}

      <Hud players={playersForHud} characterIds={characterIds} roundId={match.roundId} seconds={isInputOpen ? seconds : null} />

      {showSubtitle && <div className={`subtitle${you ? ' is-raised' : ''}`}>🔊 {commentaryText}</div>}

      {you && (
        <ActionPanel
          me={me}
          isInputOpen={isInputOpen}
          isCollapsed={isPlaying}
          commentaryText={null}
          rejected={state.rejected}
          onTechnique={submitTechnique}
          onFreeText={submitFreeText}
        />
      )}
    </div>
  )
}
