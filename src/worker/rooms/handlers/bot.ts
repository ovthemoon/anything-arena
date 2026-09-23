import type { PlayerSlot } from '../../../shared/schemas/enums'
import { DEFAULT_CHARACTER_FOR_SLOT, ROSTER, characterCard } from '../../../shared/rules/roster'
import { type EngineState, setConnected, setReady, setWeapon } from '../../game/engine'
import type { RoomCtx } from '../room-context'
import { handleActionSubmit } from './action'

/** AI 대전 봇은 항상 B 좌석. 사람은 A 로 들어온다. */
export const BOT_SLOT: PlayerSlot = 'B'

export const botNickname = (slot: PlayerSlot): string => `AI ${ROSTER[DEFAULT_CHARACTER_FOR_SLOT[slot]].name}`

/** 봇 좌석에 출연진 카드를 쥐여 주고 준비 완료로 만든다. 이미 준비됐으면 그대로. */
export const armBot = (s: EngineState, now: number): EngineState => {
  const bot = s.botSlot
  if (!bot || s.players[bot].ready) return s
  const card = characterCard(DEFAULT_CHARACTER_FOR_SLOT[bot], s.matchId)
  return setReady(setConnected(setWeapon(s, bot, card, botNickname(bot)), bot, true), bot, now)
}

/** 라운드마다 추천 한 마디 2개를 번갈아 던진다. 판정·캐시는 사람과 같은 경로. */
export const pickBotTechniqueId = (s: EngineState, bot: PlayerSlot): string | null => {
  const techniques = s.players[bot].weapon?.techniques
  if (!techniques) return null
  return techniques[(s.roundId - 1) % techniques.length]?.id ?? null
}

export const submitBotAction = async (ctx: RoomCtx): Promise<void> => {
  const s = ctx.getState()
  const bot = s.botSlot
  if (!bot || s.phase !== 'ROUND_INPUT' || s.pending[bot] !== null) return
  const techniqueId = pickBotTechniqueId(s, bot)
  if (!techniqueId) { console.warn('[bot] no technique to submit', { roundId: s.roundId }); return }
  try {
    await handleActionSubmit(ctx, bot, { type: 'action_submit', matchId: s.matchId, roundId: s.roundId, actionId: `bot-${s.matchId}-r${s.roundId}`, techniqueId })
  } catch (e) {
    console.error('[bot] action failed', { roundId: s.roundId, error: String(e) })
  }
}
