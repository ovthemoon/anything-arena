import { RULES, DEFAULT_ATTACK_BY_LANG, FROZEN_ACTION_BY_LANG } from '../../shared/rules/constants'
import { DEFAULT_LANG, type Lang } from '../../shared/i18n/lang'
import { DEFAULT_ATTACK_DAMAGE, damageFor } from '../../shared/rules/damage'
import { applyDamage } from '../../shared/rules/hp'
import { characterCard } from '../../shared/rules/roster'
import type { FallbackReason, PlayerSlot } from '../../shared/schemas/enums'
import type { JudgeResult } from '../../shared/schemas/judge'
import type { AttackEvent, PublicMatchState, PublicPlayer, RoundResolved } from '../../shared/schemas/match'
import type { WeaponProfile } from '../../shared/schemas/weapon'

export type PendingAction = { actionId: string; label: string; text: string; judge: JudgeResult | null; fallbackReason?: FallbackReason }
/** botSlot: AI 대전이면 봇이 앉은 좌석. 서버 전용, toPublic 에서 빠진다. */
export type EngineState = PublicMatchState & { pending: Record<PlayerSlot, PendingAction | null>; customAttempts: Record<PlayerSlot, number>; botSlot: PlayerSlot | null }

export const SLOTS: readonly PlayerSlot[] = ['A', 'B']
export const other = (s: PlayerSlot): PlayerSlot => (s === 'A' ? 'B' : 'A')

const emptyPlayer = (slot: PlayerSlot): PublicPlayer => ({ slot, nickname: null, characterId: null, connected: false, ready: false, weapon: null, hp: RULES.INITIAL_HP, actionStatus: 'NONE', fouls: 0, presetOnly: false })

export const createMatch = (roomCode: string, matchId: string, _now: number, botSlot: PlayerSlot | null = null, lang: Lang = DEFAULT_LANG): EngineState => ({
  roomCode, matchId, phase: 'LOBBY', roundId: 0, deadlineAt: null, lang,
  players: { A: emptyPlayer('A'), B: emptyPlayer('B') }, history: [], winner: null, eventSeq: 0,
  rulesetVersion: RULES.RULESET_VERSION, pending: { A: null, B: null }, customAttempts: { A: 0, B: 0 }, botSlot,
})

export const patchPlayer = (s: EngineState, slot: PlayerSlot, patch: Partial<PublicPlayer>): EngineState =>
  ({ ...s, players: { ...s.players, [slot]: { ...s.players[slot], ...patch } } })

export const setConnected = (s: EngineState, slot: PlayerSlot, connected: boolean): EngineState =>
  patchPlayer(s, slot, { connected })

export const setWeapon = (s: EngineState, slot: PlayerSlot, weapon: WeaponProfile, nickname: string): EngineState =>
  patchPlayer({ ...s, phase: s.phase === 'LOBBY' ? 'PREPARING' : s.phase }, slot, { weapon, nickname, characterId: weapon.characterId ?? null })

export const startRound = (s: EngineState, now: number): EngineState => ({
  ...s, phase: 'ROUND_INPUT', roundId: s.roundId + 1, deadlineAt: now + RULES.INPUT_WINDOW_MS,
  pending: { A: null, B: null }, customAttempts: { A: 0, B: 0 },
  players: { A: { ...s.players.A, actionStatus: 'NONE' }, B: { ...s.players.B, actionStatus: 'NONE' } },
})

const isPreMatch = (s: EngineState): boolean => s.phase === 'LOBBY' || s.phase === 'PREPARING'

/**
 * 둘 다 정해진 뒤, 출연진 카드의 추천 한 마디를 "이번 상대의 아픈 곳" 기준으로 다시 싣는다.
 * 자유 입력(AI 생성) 무기는 그대로. 닉네임·그림은 유지.
 */
export const retargetCards = (s: EngineState): EngineState =>
  SLOTS.reduce((acc, slot) => {
    const mine = acc.players[slot].weapon
    const theirs = acc.players[other(slot)].weapon
    if (!mine?.characterId || !theirs?.characterId) return acc
    const card = characterCard(mine.characterId, acc.matchId, acc.lang, theirs.characterId)
    return patchPlayer(acc, slot, { weapon: { ...card, imageUrl: mine.imageUrl } })
  }, s)

export const setReady = (s: EngineState, slot: PlayerSlot, now: number): EngineState => {
  if (!isPreMatch(s)) return s
  const next = patchPlayer(s, slot, { ready: true })
  const bothReady = SLOTS.every((p) => next.players[p].ready && next.players[p].weapon)
  return bothReady ? startRound(retargetCards(next), now) : next
}

export const canSubmitCustom = (s: EngineState, slot: PlayerSlot): boolean =>
  !s.players[slot].presetOnly && s.customAttempts[slot] < RULES.MAX_CUSTOM_ATTEMPTS_PER_PLAYER_PER_ROUND

export const countCustomAttempt = (s: EngineState, slot: PlayerSlot): EngineState =>
  ({ ...s, customAttempts: { ...s.customAttempts, [slot]: s.customAttempts[slot] + 1 } })

export const acceptAction = (s: EngineState, slot: PlayerSlot, action: PendingAction): EngineState => {
  if (s.phase !== 'ROUND_INPUT') return s
  if (s.pending[slot]?.actionId === action.actionId) return s
  return patchPlayer({ ...s, pending: { ...s.pending, [slot]: action } }, slot, { actionStatus: 'ACCEPTED' })
}

export const bothAccepted = (s: EngineState): boolean => SLOTS.every((p) => s.pending[p] !== null)

export const applyFoul = (s: EngineState, slot: PlayerSlot): EngineState => {
  const fouls = s.players[slot].fouls + 1
  return patchPlayer(s, slot, { fouls, presetOnly: fouls >= RULES.MAX_FOULS_BEFORE_PRESET_ONLY })
}

const fallbackFor = (p: PendingAction | null, usable: boolean): FallbackReason | undefined => {
  if (!p) return 'TIMEOUT'
  if (p.fallbackReason) return p.fallbackReason
  if (usable) return undefined
  return p.judge?.validity === 'SYSTEM_INSTRUCTION' ? 'SYSTEM_INSTRUCTION' : 'INVALID_RESULT'
}

const toAttack = (s: EngineState, actor: PlayerSlot, seq: number): AttackEvent => {
  const p = s.pending[actor]
  const judge = p?.judge ?? null
  const usable = Boolean(p && judge && judge.moderation === 'ALLOW' && judge.validity === 'VALID' && !p.fallbackReason)
  const fallbackReason = fallbackFor(p, usable)
  const weapon = s.players[actor].weapon
  const base = {
    eventId: `${s.matchId}-r${s.roundId}-${actor}-${seq}`, actor, target: other(actor),
    cosmeticTags: weapon ? [weapon.visualTag] : [],
  }
  const frozen = FROZEN_ACTION_BY_LANG[s.lang]
  const basic = DEFAULT_ATTACK_BY_LANG[s.lang]
  const attack: AttackEvent = usable && p && judge
    ? { ...base, techniqueLabel: p.label, approvedActionText: p.text, effectiveness: judge.effectiveness, damage: damageFor(judge.effectiveness), animation: judge.animation, reasonCode: judge.reasonCode }
    : fallbackReason === 'TIMEOUT'
    ? { ...base, techniqueLabel: frozen.label, approvedActionText: frozen.actionText, effectiveness: 'MISS', damage: 0, animation: frozen.animation, reasonCode: 'OFF_THEME' }
    : { ...base, techniqueLabel: basic.label, approvedActionText: basic.actionText, effectiveness: 'NORMAL', damage: DEFAULT_ATTACK_DAMAGE, animation: basic.animation, reasonCode: 'NORMAL' }
  return fallbackReason ? { ...attack, fallbackReason } : attack
}

const pickWinner = (hp: Record<PlayerSlot, number>): PlayerSlot | null =>
  hp.A === hp.B ? null : hp.A > hp.B ? 'A' : 'B'

export const resolveRound = (s: EngineState, now: number): { state: EngineState; resolved: RoundResolved } => {
  const seq = s.eventSeq + 1
  const attacks: [AttackEvent, AttackEvent] = [toAttack(s, 'A', seq), toAttack(s, 'B', seq)]
  const hpBefore = { A: s.players.A.hp, B: s.players.B.hp }
  const hpAfter = { A: applyDamage(hpBefore.A, attacks[1].damage), B: applyDamage(hpBefore.B, attacks[0].damage) }
  const playbackOrder: [PlayerSlot, PlayerSlot] = s.roundId % 2 === 1 ? ['A', 'B'] : ['B', 'A']
  const resolved: RoundResolved = { type: 'round_resolved', matchId: s.matchId, roundId: s.roundId, eventSeq: seq, rulesetVersion: s.rulesetVersion, hpBefore, hpAfter, attacks, playbackOrder, resolvedAt: now }
  const finished = hpAfter.A === 0 || hpAfter.B === 0 || s.roundId >= RULES.MAX_ROUNDS
  const state: EngineState = {
    ...s, eventSeq: seq, history: [...s.history, resolved], deadlineAt: null,
    phase: finished ? 'FINISHED' : 'ROUND_PLAYBACK', winner: finished ? pickWinner(hpAfter) : null,
    players: { A: { ...s.players.A, hp: hpAfter.A, actionStatus: 'NONE' }, B: { ...s.players.B, hp: hpAfter.B, actionStatus: 'NONE' } },
    pending: { A: null, B: null },
  }
  return { state, resolved }
}

export const toPublic = (s: EngineState): PublicMatchState => {
  const { pending: _p, customAttempts: _c, botSlot: _b, ...pub } = s
  return pub
}
