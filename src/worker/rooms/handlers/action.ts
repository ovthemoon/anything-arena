import { JudgeResult } from '../../../shared/schemas/judge'
import type { PlayerSlot } from '../../../shared/schemas/enums'
import type { ClientMessage } from '../../../shared/schemas/messages'
import type { WeaponProfile } from '../../../shared/schemas/weapon'
import { acceptAction, applyFoul, bothAccepted, canSubmitCustom, countCustomAttempt, other, type PendingAction } from '../../game/engine'
import { type RoomCtx, TimeoutError, errorMessage, withTimeout } from '../room-context'
import { resolveAndAnnounce } from './round'

type ActionSubmit = Extract<ClientMessage, { type: 'action_submit' }>

const JUDGE_TIMEOUT_MS = 1_500
const CUSTOM_LABEL = '자유 공격'

type JudgeOutcome = { judge: JudgeResult } | { failed: 'JUDGE_FAILED' | 'INVALID_RESULT' }

const runJudge = async (ctx: RoomCtx, attacker: WeaponProfile, defender: WeaponProfile, actionText: string): Promise<JudgeOutcome> => {
  try {
    const raw = await withTimeout(ctx.ai.judgeAction({ attacker, defender, actionText, rulesetVersion: ctx.getState().rulesetVersion }), JUDGE_TIMEOUT_MS)
    const parsed = JudgeResult.safeParse(raw)
    return parsed.success ? { judge: parsed.data } : { failed: 'INVALID_RESULT' }
  } catch (e) {
    console.warn('[room] judge failed', { timeout: e instanceof TimeoutError, error: String(e) })
    return { failed: 'JUDGE_FAILED' }
  }
}

/** 판정 대기 중 라운드가 바뀌었으면 결과를 버린다. */
const stillOpen = (ctx: RoomCtx, msg: ActionSubmit, slot: PlayerSlot): boolean => {
  const s = ctx.getState()
  return s.phase === 'ROUND_INPUT' && s.roundId === msg.roundId && s.pending[slot] === null
}

const accept = async (ctx: RoomCtx, slot: PlayerSlot, action: PendingAction, now: number): Promise<void> => {
  await ctx.commit(acceptAction(ctx.getState(), slot, action))
  ctx.sendTo(slot, { type: 'action_accepted', actionId: action.actionId })
  ctx.sendTo(other(slot), { type: 'opponent_ready', ready: true })
  if (bothAccepted(ctx.getState())) await resolveAndAnnounce(ctx, now)
}

const fallbackAction = (actionId: string, fallbackReason: PendingAction['fallbackReason']): PendingAction =>
  ({ actionId, label: '', text: '', judge: null, fallbackReason })

const handleTechnique = async (ctx: RoomCtx, slot: PlayerSlot, msg: ActionSubmit, techniqueId: string): Promise<void> => {
  const s = ctx.getState()
  const mine = s.players[slot].weapon
  const theirs = s.players[other(slot)].weapon
  const technique = mine?.techniques.find((t) => t.id === techniqueId)
  if (!mine || !theirs || !technique) {
    ctx.sendTo(slot, { type: 'input_rejected', actionId: msg.actionId, reasonCode: 'UNKNOWN_TECHNIQUE', canRetry: true })
    return
  }
  const cacheKey = `judge:${mine.id}:${mine.version}:${technique.id}:${theirs.id}:${theirs.version}`
  const cached = await ctx.cacheGet<JudgeResult>(cacheKey)
  const outcome: JudgeOutcome = cached ? { judge: cached } : await runJudge(ctx, mine, theirs, technique.actionText)
  if ('judge' in outcome && !cached) await ctx.cachePut(cacheKey, outcome.judge)
  if (!stillOpen(ctx, msg, slot)) return
  const action: PendingAction = 'judge' in outcome
    ? { actionId: msg.actionId, label: technique.name, text: technique.actionText, judge: outcome.judge }
    : fallbackAction(msg.actionId, outcome.failed)
  await accept(ctx, slot, action, Date.now())
}

const handleCustom = async (ctx: RoomCtx, slot: PlayerSlot, msg: ActionSubmit, text: string): Promise<void> => {
  if (!canSubmitCustom(ctx.getState(), slot)) {
    ctx.sendTo(slot, { type: 'input_rejected', actionId: msg.actionId, reasonCode: 'PRESET_ONLY', canRetry: false })
    return
  }
  await ctx.commit(countCustomAttempt(ctx.getState(), slot))
  ctx.sendTo(slot, { type: 'action_pending', actionId: msg.actionId })
  const s = ctx.getState()
  const mine = s.players[slot].weapon
  const theirs = s.players[other(slot)].weapon
  if (!mine || !theirs) {
    ctx.sendTo(slot, errorMessage('NO_WEAPON', 'weapons not ready'))
    return
  }
  const outcome = await runJudge(ctx, mine, theirs, text)
  if (!stillOpen(ctx, msg, slot)) return
  if (!('judge' in outcome)) {
    await accept(ctx, slot, fallbackAction(msg.actionId, outcome.failed), Date.now())
    return
  }
  const { judge } = outcome
  if (judge.moderation === 'FOUL') {
    const next = applyFoul(ctx.getState(), slot)
    await ctx.commit(next)
    ctx.sendTo(slot, { type: 'foul_warning', fouls: next.players[slot].fouls, presetOnly: next.players[slot].presetOnly })
    ctx.sendTo(slot, { type: 'input_rejected', actionId: msg.actionId, reasonCode: 'FOUL', canRetry: canSubmitCustom(next, slot) })
    return
  }
  if (judge.moderation !== 'ALLOW') {
    ctx.sendTo(slot, { type: 'input_rejected', actionId: msg.actionId, reasonCode: 'REWRITE', canRetry: canSubmitCustom(ctx.getState(), slot) })
    return
  }
  const action: PendingAction = judge.validity === 'SYSTEM_INSTRUCTION'
    ? fallbackAction(msg.actionId, 'SYSTEM_INSTRUCTION')
    : { actionId: msg.actionId, label: CUSTOM_LABEL, text, judge }
  await accept(ctx, slot, action, Date.now())
}

export const handleActionSubmit = async (ctx: RoomCtx, slot: PlayerSlot, msg: ActionSubmit): Promise<void> => {
  const s = ctx.getState()
  if (ctx.isProcessed(msg.actionId)) return
  if (s.phase !== 'ROUND_INPUT' || msg.matchId !== s.matchId || msg.roundId !== s.roundId) {
    ctx.sendTo(slot, { type: 'input_rejected', actionId: msg.actionId, reasonCode: 'ROUND_CLOSED', canRetry: false })
    return
  }
  if (s.pending[slot] !== null) {
    ctx.sendTo(slot, { type: 'input_rejected', actionId: msg.actionId, reasonCode: 'ALREADY_ACCEPTED', canRetry: false })
    return
  }
  await ctx.markProcessed(msg.actionId)
  if (msg.techniqueId) await handleTechnique(ctx, slot, msg, msg.techniqueId)
  else if (msg.text) await handleCustom(ctx, slot, msg, msg.text.trim())
}
