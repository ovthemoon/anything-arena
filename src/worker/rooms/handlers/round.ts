import { RULES } from '../../../shared/rules/constants'
import type { AttackEvent } from '../../../shared/schemas/match'
import type { WeaponProfile } from '../../../shared/schemas/weapon'
import type { PlayerSlot } from '../../../shared/schemas/enums'
import { resolveRound, startRound, toPublic } from '../../game/engine'
import { type RoomCtx, withTimeout } from '../room-context'

const PLAYBACK_DELAY_MS = 3_000
const COMMENTARY_VALID_MS = 6_000
const COMMENTARY_TIMEOUT_MS = 5_000
const TTS_TIMEOUT_MS = 8_000

export const beginRound = async (ctx: RoomCtx, now: number): Promise<void> => {
  const next = startRound(ctx.getState(), now)
  await ctx.commit(next)
  await ctx.setAlarm((next.deadlineAt ?? now) + RULES.JUDGE_GRACE_MS)
  ctx.broadcast({ type: 'round_started', matchId: next.matchId, roundId: next.roundId, deadlineAt: next.deadlineAt ?? now })
  ctx.broadcastSnapshot()
}

/** 라운드 시작 알림 (setReady 가 이미 ROUND_INPUT 으로 바꾼 경우). */
export const announceRoundStarted = async (ctx: RoomCtx, now: number): Promise<void> => {
  const s = ctx.getState()
  await ctx.setAlarm((s.deadlineAt ?? now) + RULES.JUDGE_GRACE_MS)
  ctx.broadcast({ type: 'round_started', matchId: s.matchId, roundId: s.roundId, deadlineAt: s.deadlineAt ?? now })
}

const commentaryFor = async (ctx: RoomCtx, matchId: string, attack: AttackEvent, weapons: Record<PlayerSlot, WeaponProfile>): Promise<void> => {
  try {
    const text = await withTimeout(ctx.ai.generateCommentary(attack, weapons), COMMENTARY_TIMEOUT_MS)
    const verdict = await withTimeout(ctx.ai.checkText(text), COMMENTARY_TIMEOUT_MS)
    if (verdict !== 'ALLOW') return
    const audioPath = await withTimeout(ctx.ai.synthesize(text, attack.eventId), TTS_TIMEOUT_MS).catch((e: unknown) => {
      console.warn('[room] tts failed', { eventId: attack.eventId, error: String(e) })
      return null
    })
    ctx.broadcast({ type: 'commentary_ready', matchId, eventId: attack.eventId, text, audioPath, validUntil: Date.now() + COMMENTARY_VALID_MS })
  } catch (e) {
    console.warn('[room] commentary skipped', { eventId: attack.eventId, error: String(e) })
  }
}

/** ROUND_INPUT 일 때만 정산. 정산 → 브로드캐스트 → 다음 알람 → 해설 순. */
export const resolveAndAnnounce = async (ctx: RoomCtx, now: number): Promise<void> => {
  const current = ctx.getState()
  if (current.phase !== 'ROUND_INPUT') return
  const { state, resolved } = resolveRound(current, now)
  await ctx.commit(state)
  if (state.phase === 'FINISHED') await ctx.clearAlarm()
  else await ctx.setAlarm(now + PLAYBACK_DELAY_MS)
  ctx.broadcast(resolved)

  const { A, B } = state.players
  if (A.weapon && B.weapon) {
    const weapons = { A: A.weapon, B: B.weapon }
    for (const actor of resolved.playbackOrder) {
      const attack = resolved.attacks.find((a) => a.actor === actor)
      if (attack) await commentaryFor(ctx, state.matchId, attack, weapons)
    }
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
