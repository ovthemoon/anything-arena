import { z } from 'zod'
import { ActionStatus, AnimationType, CharacterId, Effectiveness, FallbackReason, MatchPhase, PlayerSlot } from './enums'
import { WeaponProfile } from './weapon'
import { Lang } from '../i18n/lang'

export const AttackEvent = z.object({
  eventId: z.string(),
  actor: PlayerSlot,
  target: PlayerSlot,
  techniqueLabel: z.string(),
  approvedActionText: z.string(),
  effectiveness: Effectiveness,
  damage: z.union([z.literal(0), z.literal(20), z.literal(30), z.literal(40)]),
  animation: AnimationType,
  cosmeticTags: z.array(z.string()),
  reasonCode: z.string(),
  fallbackReason: FallbackReason.optional(),
})
export type AttackEvent = z.infer<typeof AttackEvent>

export const RoundResolved = z.object({
  type: z.literal('round_resolved'),
  matchId: z.string(),
  roundId: z.number().int(),
  eventSeq: z.number().int(),
  rulesetVersion: z.string(),
  hpBefore: z.record(PlayerSlot, z.number()),
  hpAfter: z.record(PlayerSlot, z.number()),
  attacks: z.tuple([AttackEvent, AttackEvent]),
  playbackOrder: z.tuple([PlayerSlot, PlayerSlot]),
  resolvedAt: z.number(),
})
export type RoundResolved = z.infer<typeof RoundResolved>

export const PublicPlayer = z.object({
  slot: PlayerSlot,
  nickname: z.string().nullable(),
  /** 선택한 고정 출연진. 미선택이면 null. */
  characterId: CharacterId.nullable().optional(),
  connected: z.boolean(),
  ready: z.boolean(),
  weapon: WeaponProfile.nullable(),
  hp: z.number(),
  actionStatus: ActionStatus,
  fouls: z.number().int(),
  presetOnly: z.boolean(),
})
export type PublicPlayer = z.infer<typeof PublicPlayer>

export const PublicMatchState = z.object({
  roomCode: z.string(),
  matchId: z.string(),
  phase: MatchPhase,
  roundId: z.number().int(),
  deadlineAt: z.number().nullable(),
  players: z.record(PlayerSlot, PublicPlayer),
  history: z.array(RoundResolved),
  winner: PlayerSlot.nullable().optional(),
  /** 공용 중계 화면이 연결돼 있는지 */
  screenConnected: z.boolean().optional(),
  eventSeq: z.number().int(),
  rulesetVersion: z.string(),
  /** 방 언어. 카드·AI·화면 문구가 모두 따른다. 옛 스냅샷엔 없을 수 있어 ko 기본. */
  lang: Lang.default('ko'),
})
export type PublicMatchState = z.infer<typeof PublicMatchState>
