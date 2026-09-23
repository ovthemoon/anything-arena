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
import { DEFAULT_LANG, type Lang } from '../../shared/i18n/lang'

const JEV_TIMEOUT_MS = 1500
/** 영어 방 해설 목소리 기본값 (MiniMax). wrangler vars TTS_VOICE_EN 으로 바꾼다. */
const DEFAULT_TTS_VOICE_EN = 'English_expressive_narrator'

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
  /** 해설 목소리는 방 언어를 따른다. */
  const ttsVoiceByLang: Record<Lang, string | undefined> = { ko: env.TTS_VOICE || undefined, en: env.TTS_VOICE_EN || DEFAULT_TTS_VOICE_EN }
  const imageModel = env.IMAGE_MODEL || 'google/gemini-3.1-flash-lite-image'
  const jevOptions = { apiKey: env.TYPESAFE_API_KEY, model: jevModel, timeoutMs: JEV_TIMEOUT_MS }

  return {
    async generateWeapon(input, ctx) {
      if (!or) return mock.generateWeapon(input, ctx)
      return generateWeaponWithOpenRouter(or, textModel, input, ctx)
    },

    async judgeAction(req: JudgeRequest) {
      if (hitsBlocklist(req.actionText, req.lang ?? DEFAULT_LANG)) return FOUL_JUDGE_RESULT
      if (!hasTypesafe) return mock.judgeAction(req)
      return judgeWithJev(jevOptions, req)
    },

    async generateCommentary(event: AttackEvent, weapons: Record<PlayerSlot, WeaponProfile>, lang: Lang = DEFAULT_LANG) {
      if (!or) return mock.generateCommentary(event, weapons, lang)
      return generateCommentaryWithOpenRouter(or, textModel, event, weapons, lang)
    },

    async generateWeaponImage(profile, ctx) {
      if (!or) return mock.generateWeaponImage(profile, ctx)
      return generateWeaponImageToR2(or, env.AUDIO, imageModel, profile, ctx)
    },

    async synthesize(text: string, key: string, lang: Lang = DEFAULT_LANG) {
      if (!or || !ttsModel) return mock.synthesize(text, key, lang)
      return synthesizeToR2(or, env.AUDIO, ttsModel, ttsVoiceByLang[lang], text, key)
    },

    async checkText(text: string, lang: Lang = DEFAULT_LANG): Promise<ModerationDecision> {
      if (hitsBlocklist(text, lang)) return 'FOUL'
      if (!hasTypesafe) return mock.checkText(text, lang)
      return checkTextWithJev(jevOptions, text, lang)
    },
  }
}
