import type { PlayerSlot } from '../../../shared/schemas/enums'
import type { ClientMessage } from '../../../shared/schemas/messages'
import type { WeaponProfile } from '../../../shared/schemas/weapon'
import { WeaponProfile as WeaponProfileSchema } from '../../../shared/schemas/weapon'
import { defaultWeaponsFor } from '../../game/default-weapons'
import { DEFAULT_CHARACTER_FOR_SLOT, characterCard } from '../../../shared/rules/roster'
import { SLOTS, createMatch, setConnected, setReady, setWeapon } from '../../game/engine'
import { type RoomCtx, errorMessage, withTimeout } from '../room-context'
import type { Lang } from '../../../shared/i18n/lang'
import { announceRoundStarted } from './round'
import { armBot, submitBotAction } from './bot'

type WeaponSubmit = Extract<ClientMessage, { type: 'weapon_submit' }>

const WEAPON_TIMEOUT_MS = 8_000
const IMAGE_TIMEOUT_MS = 8_000
const CHECK_TIMEOUT_MS = 3_000

/** 긁기 배틀: 무기 대신 출연진 카드. 구버전 기본 무기는 자유 입력 경로에서만 남는다. */
const defaultWeapon = (slot: PlayerSlot, lang: Lang, matchId?: string): WeaponProfile =>
  matchId ? characterCard(DEFAULT_CHARACTER_FOR_SLOT[slot], matchId, lang) : defaultWeaponsFor(lang)[slot === 'A' ? 0 : 1]
const isPreMatch = (ctx: RoomCtx): boolean => ['LOBBY', 'PREPARING'].includes(ctx.getState().phase)

const allAllowed = async (ctx: RoomCtx, texts: string[]): Promise<boolean> => {
  try {
    const lang = ctx.getState().lang
    const verdicts = await withTimeout(Promise.all(texts.map((t) => ctx.ai.checkText(t, lang))), CHECK_TIMEOUT_MS)
    return verdicts.every((v) => v === 'ALLOW')
  } catch (e) {
    console.warn('[room] checkText failed', String(e))
    return false
  }
}

const generateWeapon = async (ctx: RoomCtx, slot: PlayerSlot, msg: WeaponSubmit): Promise<WeaponProfile> => {
  try {
    const { matchId, lang } = ctx.getState()
    const raw = await withTimeout(ctx.ai.generateWeapon(msg.weapon, { matchId, slot, lang }), WEAPON_TIMEOUT_MS)
    const parsed = WeaponProfileSchema.safeParse(raw)
    if (parsed.success) return parsed.data
    console.warn('[room] generated weapon invalid', parsed.error.message)
  } catch (e) {
    console.warn('[room] weapon generation failed', String(e))
  }
  return defaultWeapon(slot, ctx.getState().lang)
}

const weaponInFlight = new WeakMap<RoomCtx, Set<PlayerSlot>>()
type WeaponBudget = { ids: string[]; nextAt: number }
const MAX_WEAPON_SUBMISSIONS = 5

export const handleWeaponSubmit = async (ctx: RoomCtx, slot: PlayerSlot, msg: WeaponSubmit): Promise<void> => {
  const busy = weaponInFlight.get(ctx) ?? new Set<PlayerSlot>()
  weaponInFlight.set(ctx, busy)
  const reject = (reasonCode: string, canRetry: boolean): void =>
    ctx.sendTo(slot, { type: 'input_rejected', actionId: msg.requestId, reasonCode, canRetry })
  if (busy.has(slot)) { reject('WEAPON_BUSY', true); return }
  if (!isPreMatch(ctx) || ctx.getState().players[slot].ready) { reject('NOT_IN_LOBBY', false); return }
  busy.add(slot)
  try {
    const matchId = ctx.getState().matchId
    const key = `weaponBudget:${matchId}:${slot}`
    const budget = (await ctx.cacheGet<WeaponBudget>(key)) ?? { ids: [], nextAt: 0 }
    if (budget.ids.includes(msg.requestId)) { ctx.broadcastSnapshot(); return }
    if (budget.ids.length >= MAX_WEAPON_SUBMISSIONS) { reject('WEAPON_LIMIT', false); return }
    if (Date.now() < budget.nextAt) { reject('WEAPON_COOLDOWN', true); return }
    await ctx.cachePut(key, { ids: [...budget.ids, msg.requestId], nextAt: Date.now() + 2000 })
    if (ctx.getState().matchId !== matchId) return
    await submitWeapon(ctx, slot, msg, matchId)
  } finally { busy.delete(slot) }
}

const submitWeapon = async (ctx: RoomCtx, slot: PlayerSlot, msg: WeaponSubmit, matchId: string): Promise<void> => {
  if (!isPreMatch(ctx) || ctx.getState().players[slot].ready) {
    ctx.sendTo(slot, { type: 'input_rejected', actionId: msg.requestId, reasonCode: 'NOT_IN_LOBBY', canRetry: false })
    return
  }
  const { nickname, character, weaponName, description } = msg.weapon
  const texts = [nickname.trim(), character.trim(), weaponName.trim(), description.trim()].filter((t) => t.length > 0)
  if (!(await allAllowed(ctx, texts))) {
    ctx.sendTo(slot, { type: 'input_rejected', actionId: msg.requestId, reasonCode: 'MODERATION', canRetry: true })
    return
  }
  if (ctx.getState().matchId !== matchId || !isPreMatch(ctx) || ctx.getState().players[slot].ready) return
  // 출연진을 골랐으면 AI 생성 없이 고정 카드. 즉석 무기는 라운드마다 입력하는 한 마디다.
  if (msg.weapon.characterId) {
    const { matchId, lang } = ctx.getState()
    await ctx.commit(setWeapon(ctx.getState(), slot, characterCard(msg.weapon.characterId, matchId, lang), nickname.trim()))
    ctx.broadcastSnapshot()
    return
  }
  const weapon = await generateWeapon(ctx, slot, msg)
  if (ctx.getState().matchId !== matchId || !isPreMatch(ctx) || ctx.getState().players[slot].ready) return
  await ctx.commit(setWeapon(ctx.getState(), slot, weapon, nickname.trim()))
  ctx.broadcastSnapshot()
  // 무기 그림은 카드가 뜬 뒤 따라온다. 전투를 기다리게 하지 않는다 (연출 설계 §7-4).
  await attachWeaponImage(ctx, slot, weapon, nickname.trim())
}

const attachWeaponImage = async (ctx: RoomCtx, slot: PlayerSlot, weapon: WeaponProfile, nickname: string): Promise<void> => {
  let imageUrl: string | null = null
  try {
    imageUrl = await withTimeout(ctx.ai.generateWeaponImage(weapon, { matchId: ctx.getState().matchId, slot }), IMAGE_TIMEOUT_MS)
  } catch (e) {
    console.warn('[room] weapon image failed', String(e).slice(0, 120))
  }
  if (!imageUrl) return
  const current = ctx.getState()
  // 그 사이 재대결·재생성으로 무기가 바뀌었으면 버린다.
  if (current.players[slot].weapon?.id !== weapon.id) return
  await ctx.commit(setWeapon(current, slot, { ...weapon, imageUrl }, nickname))
  ctx.broadcastSnapshot()
}

export const handleReady = async (ctx: RoomCtx, slot: PlayerSlot, matchId: string, now: number): Promise<void> => {
  const s = ctx.getState()
  if (matchId !== s.matchId) { ctx.sendTo(slot, errorMessage('STALE_MATCH', 'matchId mismatch')); return }
  if (!isPreMatch(ctx)) return
  // 디버그 편의: 무기 없이 ready 하면 기본 무기를 쓴다.
  const armed = s.players[slot].weapon ? s : setWeapon(s, slot, defaultWeapon(slot, s.lang, s.matchId), `Player ${slot}`)
  // AI 대전: 사람이 준비되면 봇도 같이 준비된다.
  const next = armBot(setReady(armed, slot, now), now)
  await ctx.commit(next)
  if (next.phase === 'ROUND_INPUT') await announceRoundStarted(ctx, now)
  ctx.broadcastSnapshot()
  if (next.phase === 'ROUND_INPUT') await submitBotAction(ctx)
}

export const handleRematch = async (ctx: RoomCtx, slot: PlayerSlot, matchId: string, now: number): Promise<void> => {
  const s = ctx.getState()
  if (s.phase !== 'FINISHED' || matchId !== s.matchId) { ctx.sendTo(slot, errorMessage('NOT_FINISHED', 'rematch only after finish')); return }
  const votes = Array.from(new Set([...ctx.getRematchVotes(), slot, ...(s.botSlot ? [s.botSlot] : [])]))
  if (votes.length < SLOTS.length) {
    await ctx.setRematchVotes(votes)
    return
  }
  const fresh = SLOTS.reduce((acc, p) => setConnected(acc, p, s.players[p].connected), armBot(createMatch(s.roomCode, crypto.randomUUID(), now, s.botSlot, s.lang), now))
  await ctx.setRematchVotes([])
  await ctx.resetProcessed()
  await ctx.commit(fresh)
  ctx.broadcastSnapshot()
}
