import { z } from 'zod'

export const PlayerSlot = z.enum(['A', 'B'])
export type PlayerSlot = z.infer<typeof PlayerSlot>

/** WebSocket 연결의 역할. SCREEN 은 공용 중계 화면: 모든 방송을 받지만 행동은 못 한다. */
export const ConnectionRole = z.enum(['A', 'B', 'SCREEN'])
export type ConnectionRole = z.infer<typeof ConnectionRole>

export const Effectiveness = z.enum(['LIMITED', 'NORMAL', 'STRONG'])
export type Effectiveness = z.infer<typeof Effectiveness>

export const AnimationType = z.enum(['DASH', 'PROJECTILE', 'SHOCKWAVE', 'PSYCHIC'])
export type AnimationType = z.infer<typeof AnimationType>

/** 검수된 시각 태그 목록. 이미지 대신 색·형태·아이콘 조합에 쓴다 (PRD 9). */
export const VisualTag = z.enum(['WET', 'ELECTRIC', 'SHAKY', 'FIRE', 'ICE', 'SHADOW', 'SHINY', 'SOFT', 'HEAVY', 'ABSTRACT'])
export type VisualTag = z.infer<typeof VisualTag>

export const ModerationDecision = z.enum(['ALLOW', 'REWRITE', 'FOUL', 'UNCERTAIN'])
export type ModerationDecision = z.infer<typeof ModerationDecision>

export const Validity = z.enum(['VALID', 'OUTSIDE_CAPABILITY', 'SYSTEM_INSTRUCTION'])
export type Validity = z.infer<typeof Validity>

export const ReasonCode = z.enum(['WEAKNESS_MATCH', 'RESISTANCE_MATCH', 'OFF_THEME', 'NORMAL'])
export type ReasonCode = z.infer<typeof ReasonCode>

export const MatchPhase = z.enum(['LOBBY', 'PREPARING', 'ROUND_INPUT', 'ROUND_RESOLVING', 'ROUND_PLAYBACK', 'FINISHED', 'CLOSED'])
export type MatchPhase = z.infer<typeof MatchPhase>

export const ActionStatus = z.enum(['NONE', 'VALIDATING', 'ACCEPTED', 'REJECTED'])
export type ActionStatus = z.infer<typeof ActionStatus>

export const FallbackReason = z.enum(['TIMEOUT', 'JUDGE_FAILED', 'INVALID_RESULT', 'SYSTEM_INSTRUCTION', 'MODERATION'])
export type FallbackReason = z.infer<typeof FallbackReason>
