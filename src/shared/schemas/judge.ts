import { z } from 'zod'
import { AnimationType, Effectiveness, ModerationDecision, ReasonCode, Validity } from './enums'

export const JudgeResult = z.object({
  moderation: ModerationDecision,
  moderationReason: z.string(),
  validity: Validity,
  effectiveness: Effectiveness,
  animation: AnimationType,
  reasonCode: ReasonCode,
})
export type JudgeResult = z.infer<typeof JudgeResult>
