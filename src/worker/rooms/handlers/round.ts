import { RULES } from '../../../shared/rules/constants'
import type { AttackEvent } from '../../../shared/schemas/match'
import type { WeaponProfile } from '../../../shared/schemas/weapon'
import type { PlayerSlot } from '../../../shared/schemas/enums'
import { damageFor } from '../../../shared/rules/damage'
import { other, resolveRound, startRound, toPublic, type PendingAction } from '../../game/engine'
import { type RoomCtx, withTimeout } from '../room-context'
import { submitBotAction } from './bot'

const PLAYBACK_DELAY_MS = 14_000 // 공격 1회 연출 ≈6.6초 × 2 (timeline.ts STEP_MS 합계). 입력 15초를 연출이 잡아먹지 않게 서버가 기다린다.
const COMMENTARY_VALID_MS = 20_000 // 라운드 재생(≈13초) 전체를 덮는다. 클라이언트가 장면 차례에 맞춰 튼다.
const COMMENTARY_TIMEOUT_MS = 5_000
const TTS_TIMEOUT_MS = 8_000

export const beginRound = async (ctx: RoomCtx, now: number): Promise<void> => {
  const next = startRound(ctx.getState(), now)
  await ctx.commit(next)
  await ctx.setAlarm((next.deadlineAt ?? now) + RULES.JUDGE_GRACE_MS)
  ctx.broadcast({ type: 'round_started', matchId: next.matchId, roundId: next.roundId, deadlineAt: next.deadlineAt ?? now })
  ctx.broadcastSnapshot()
  await submitBotAction(ctx)
}

/** 라운드 시작 알림 (setReady 가 이미 ROUND_INPUT 으로 바꾼 경우). */
export const announceRoundStarted = async (ctx: RoomCtx, now: number): Promise<void> => {
  const s = ctx.getState()
  await ctx.setAlarm((s.deadlineAt ?? now) + RULES.JUDGE_GRACE_MS)
  ctx.broadcast({ type: 'round_started', matchId: s.matchId, roundId: s.roundId, deadlineAt: s.deadlineAt ?? now })
}

type PreparedCommentary = { actionId: string; text: string; audioPath: string | null }

const preparedKey = (matchId: string, roundId: number, slot: PlayerSlot): string => `commentary:${matchId}:${roundId}:${slot}`

/** 해설 생성 → 출력 검사 → 음성. 방송은 하지 않는다. 검사 불통과·생성 실패는 null. */
const prepareCommentary = async (
  ctx: RoomCtx,
  attack: AttackEvent,
  weapons: Record<PlayerSlot, WeaponProfile>,
  audioKey: string,
): Promise<{ text: string; audioPath: string | null } | null> => {
  try {
    const text = await withTimeout(ctx.ai.generateCommentary(attack, weapons), COMMENTARY_TIMEOUT_MS)
    const verdict = await withTimeout(ctx.ai.checkText(text), COMMENTARY_TIMEOUT_MS)
    if (verdict !== 'ALLOW') return null
    const audioPath = await withTimeout(ctx.ai.synthesize(text, audioKey), TTS_TIMEOUT_MS).catch((e: unknown) => {
      console.warn('[room] tts failed', { audioKey, error: String(e) })
      return null
    })
    return { text, audioPath }
  } catch (e) {
    console.warn('[room] commentary skipped', { audioKey, error: String(e) })
    return null
  }
}

/**
 * 공격이 접수된 순간 미리 해설·음성을 만들어 둔다 (피해량은 판정에서 이미 확정).
 * 정산 때 바로 방송할 수 있어 음성이 장면보다 늦는 일이 줄어든다. 실패해도 정산에서 다시 시도한다.
 */
export const precomputeCommentary = async (ctx: RoomCtx, slot: PlayerSlot, action: PendingAction): Promise<void> => {
  const s = ctx.getState()
  const judge = action.judge
  if (!judge || action.fallbackReason || judge.moderation !== 'ALLOW' || judge.validity !== 'VALID') return
  const mine = s.players[slot].weapon
  const theirs = s.players[other(slot)].weapon
  if (!mine || !theirs) return
  const preview: AttackEvent = {
    eventId: `${s.matchId}-r${s.roundId}-${slot}-preview`, actor: slot, target: other(slot),
    techniqueLabel: action.label, approvedActionText: action.text,
    effectiveness: judge.effectiveness, damage: damageFor(judge.effectiveness), animation: judge.animation,
    cosmeticTags: [mine.visualTag], reasonCode: judge.reasonCode,
  }
  const weapons: Record<PlayerSlot, WeaponProfile> = slot === 'A' ? { A: mine, B: theirs } : { A: theirs, B: mine }
  const prepared = await prepareCommentary(ctx, preview, weapons, `${s.matchId}-r${s.roundId}-${slot}-${action.actionId}`)
  if (!prepared) return
  await ctx.cachePut<PreparedCommentary>(preparedKey(s.matchId, s.roundId, slot), { actionId: action.actionId, ...prepared })
}

const broadcastCommentary = (ctx: RoomCtx, matchId: string, eventId: string, c: { text: string; audioPath: string | null }): void =>
  ctx.broadcast({ type: 'commentary_ready', matchId, eventId, text: c.text, audioPath: c.audioPath, validUntil: Date.now() + COMMENTARY_VALID_MS })

/** 미리 만든 해설이 있으면 즉시, 없으면 지금 생성해서 방송. 두 공격은 병렬. */
const commentaryFor = async (
  ctx: RoomCtx,
  matchId: string,
  roundId: number,
  attack: AttackEvent,
  weapons: Record<PlayerSlot, WeaponProfile>,
  pendingActionId: string | undefined,
): Promise<void> => {
  const prepared = await ctx.cacheGet<PreparedCommentary>(preparedKey(matchId, roundId, attack.actor))
  if (prepared && !attack.fallbackReason && pendingActionId && prepared.actionId === pendingActionId) {
    broadcastCommentary(ctx, matchId, attack.eventId, prepared)
    return
  }
  const fresh = await prepareCommentary(ctx, attack, weapons, attack.eventId)
  if (fresh) broadcastCommentary(ctx, matchId, attack.eventId, fresh)
}

/** ROUND_INPUT 일 때만 정산. 정산 → 브로드캐스트 → 다음 알람 → 해설 순. */
export const resolveAndAnnounce = async (ctx: RoomCtx, now: number): Promise<void> => {
  const current = ctx.getState()
  if (current.phase !== 'ROUND_INPUT') return
  const pendingIds: Record<PlayerSlot, string | undefined> = { A: current.pending.A?.actionId, B: current.pending.B?.actionId }
  const { state, resolved } = resolveRound(current, now)
  await ctx.commit(state)
  if (state.phase === 'FINISHED') await ctx.clearAlarm()
  else await ctx.setAlarm(now + PLAYBACK_DELAY_MS)
  ctx.broadcast(resolved)

  const { A, B } = state.players
  if (A.weapon && B.weapon) {
    const weapons = { A: A.weapon, B: B.weapon }
    await Promise.all(
      resolved.attacks.map((attack) => commentaryFor(ctx, state.matchId, resolved.roundId, attack, weapons, pendingIds[attack.actor])),
    )
  }
  if (state.phase === 'FINISHED') ctx.broadcast({ type: 'match_finished', state: toPublic(ctx.getState()) })
}

export const onAlarm = async (ctx: RoomCtx, now: number): Promise<void> => {
  const s = ctx.getState()
  if (s.phase === 'ROUND_INPUT') {
    const due = (s.deadlineAt ?? 0) + RULES.JUDGE_GRACE_MS
    if (now < due) { await ctx.setAlarm(due); return }
    await resolveAndAnnounce(ctx, now)
    return
  }
  if (s.phase === 'ROUND_PLAYBACK') await beginRound(ctx, now)
}
