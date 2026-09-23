import type { PlayerSlot, ModerationDecision } from '../../shared/schemas/enums'
import type { AttackEvent } from '../../shared/schemas/match'
import type { WeaponProfile } from '../../shared/schemas/weapon'
import { hitsBlocklist } from '../moderation/blocklist'
import { createMockAdapters } from './mock'
import { createOpenRouter } from './openrouter'
import { generateWeaponWithOpenRouter } from './weapon-gen'
import { checkTextWithJev, judgeWithJev } from './jev'
import { generateCommentaryWithOpenRouter } from './commentary'
import { synthesizeToR2 } from './tts'
import { generateWeaponImageToR2 } from './weapon-image'
import type { AiAdapters, JudgeRequest } from './types'

const JEV_TIMEOUT_MS = 1500

const FOUL_JUDGE_RESULT = {
  moderation: 'FOUL' as const,
  moderationReason: 'BLOCKLIST',
  validity: 'VALID' as const,
  effectiveness: 'NORMAL' as const,
  animation: 'DASH' as const,
  reasonCode: 'NORMAL' as const,
}

/**
 * 실제 AI 어댑터. 키가 비어 있는 기능은 mock 의 해당 기능으로 대체하고 console.warn 한 줄만 남긴다
 * (원문은 절대 로그에 남기지 않는다 — PRD 8, CLAUDE.md).
 */
export const createRealAdapters = (env: Env): AiAdapters => {
  const mock = createMockAdapters()
  const hasOpenRouter = Boolean(env.OPENROUTER_API_KEY)
  const hasTypesafe = Boolean(env.TYPESAFE_API_KEY)

  if (!hasOpenRouter) console.warn('[ai/real] OPENROUTER_API_KEY missing — falling back to mock for weapon/commentary/tts')
  if (!hasTypesafe) console.warn('[ai/real] TYPESAFE_API_KEY missing — falling back to mock for judge/checkText')

  const or = hasOpenRouter ? createOpenRouter(env.OPENROUTER_API_KEY) : null
  const textModel = env.TEXT_MODEL || 'openai/gpt-5-mini'
  const jevModel = env.JEV_MODEL || 'jev-latest'
  const ttsModel = env.TTS_MODEL
  const ttsVoice = env.TTS_VOICE || undefined
  const imageModel = env.IMAGE_MODEL || 'google/gemini-3.1-flash-lite-image'
  const jevOptions = { apiKey: env.TYPESAFE_API_KEY, model: jevModel, timeoutMs: JEV_TIMEOUT_MS }

  return {
    async generateWeapon(input, ctx) {
      if (!or) return mock.generateWeapon(input, ctx)
      return generateWeaponWithOpenRouter(or, textModel, input, ctx)
    },

    async judgeAction(req: JudgeRequest) {
      if (hitsBlocklist(req.actionText)) return FOUL_JUDGE_RESULT
      if (!hasTypesafe) return mock.judgeAction(req)
      return judgeWithJev(jevOptions, req)
    },

    async generateCommentary(event: AttackEvent, weapons: Record<PlayerSlot, WeaponProfile>) {
      if (!or) return mock.generateCommentary(event, weapons)
      return generateCommentaryWithOpenRouter(or, textModel, event, weapons)
    },

    async generateWeaponImage(profile, ctx) {
      if (!or) return mock.generateWeaponImage(profile, ctx)
      return generateWeaponImageToR2(or, env.AUDIO, imageModel, profile, ctx)
    },

    async synthesize(text: string, key: string) {
      if (!or || !ttsModel) return mock.synthesize(text, key)
      return synthesizeToR2(or, env.AUDIO, ttsModel, ttsVoice, text, key)
    },

    async checkText(text: string): Promise<ModerationDecision> {
      if (hitsBlocklist(text)) return 'FOUL'
      if (!hasTypesafe) return mock.checkText(text)
      return checkTextWithJev(jevOptions, text)
    },
  }
}
