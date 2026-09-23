import { z } from 'zod'
import { WeaponInput } from './weapon'
import { PublicMatchState, RoundResolved } from './match'
import { PlayerSlot } from './enums'
import { LIMITS, countChars } from '../rules/limits'

const ActionSubmit = z
  .object({
    type: z.literal('action_submit'),
    matchId: z.string(),
    roundId: z.number().int(),
    actionId: z.string().min(1),
    techniqueId: z.string().min(1).optional(),
    text: z.string().refine((s) => countChars(s) > 0 && countChars(s) <= LIMITS.ACTION_TEXT).optional(),
  })
  .refine((m) => (m.techniqueId ? 1 : 0) + (m.text ? 1 : 0) === 1, { message: 'exactly one of techniqueId or text' })

export const ClientMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('weapon_submit'), requestId: z.string(), weapon: WeaponInput }),
  z.object({ type: z.literal('ready'), matchId: z.string() }),
  ActionSubmit,
  z.object({ type: z.literal('request_snapshot'), matchId: z.string(), lastEventSeq: z.number().int() }),
  z.object({ type: z.literal('rematch_ready'), matchId: z.string() }),
])
export type ClientMessage = z.infer<typeof ClientMessage>

export const ServerMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('room_snapshot'), state: PublicMatchState, you: PlayerSlot }),
  z.object({ type: z.literal('round_started'), matchId: z.string(), roundId: z.number().int(), deadlineAt: z.number() }),
  z.object({ type: z.literal('action_pending'), actionId: z.string() }),
  z.object({ type: z.literal('action_accepted'), actionId: z.string() }),
  z.object({ type: z.literal('opponent_ready'), ready: z.boolean() }),
  z.object({ type: z.literal('input_rejected'), actionId: z.string(), reasonCode: z.string(), canRetry: z.boolean() }),
  z.object({ type: z.literal('foul_warning'), fouls: z.number().int(), presetOnly: z.boolean() }),
  RoundResolved,
  z.object({ type: z.literal('commentary_ready'), matchId: z.string(), eventId: z.string(), text: z.string(), audioPath: z.string().nullable(), validUntil: z.number() }),
  z.object({ type: z.literal('match_finished'), state: PublicMatchState }),
  z.object({ type: z.literal('match_aborted'), reason: z.string() }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
])
export type ServerMessage = z.infer<typeof ServerMessage>
