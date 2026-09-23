import { z } from 'zod'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { AttackEvent } from '../../shared/schemas/match'
import type { WeaponProfile } from '../../shared/schemas/weapon'
import { countChars } from '../../shared/rules/limits'
import type { OpenRouterClient } from './openrouter'
import { COMMENTARY_SYSTEM_BY_LANG, buildCommentaryUser } from './prompts/commentary'
import { DEFAULT_LANG, type Lang } from '../../shared/i18n/lang'

const COMMENTARY_MAX_CHARS = 60
/** 해설이 말하면 안 되는 상태 변화 (PRD 7). 영어는 단어 경계로 잡아 'heals'·'stunned' 같은 변형까지 막는다. */
const BANNED_WORDS_BY_LANG: Record<Lang, RegExp> = {
  ko: /(기절|회복|즉사|회피)/,
  en: /\b(stun|stunned|stuns|heal|heals|healed|healing|dodge|dodges|dodged|instant kill|one-shot|oneshot)\b/i,
}

/** 실제 호출 실패·검증 실패 시 순환으로 쓰는 고정 해설 (PRD 7). */
export const FALLBACK_COMMENTARY_BY_LANG: Record<Lang, string[]> = {
  ko: ['들어갔습니다! 정통으로 꽂혔어요!', '경기장이 뒤집어집니다! 이건 큽니다!', '아, 이건 아프겠는데요! 제대로 들어갔어요!'],
  en: ['What a hit!', 'The crowd is buzzing!', 'That one has to sting!'],
}
export const FALLBACK_COMMENTARY = FALLBACK_COMMENTARY_BY_LANG.ko

const CommentaryOutput = z.object({ text: z.string() })
const COMMENTARY_JSON_SCHEMA = z.toJSONSchema(CommentaryOutput)

const hash = (s: string): number => Array.from(s).reduce((h, c) => (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0, 7)

/** eventId 를 시드로 고정 해설 배열을 순환한다 (AttackEvent 엔 eventSeq 필드가 없다 — RoundResolved 쪽에 있음). */
const fallbackFor = (eventId: string, lang: Lang): string => {
  const pool = FALLBACK_COMMENTARY_BY_LANG[lang]
  return pool[hash(eventId) % pool.length]
}

/**
 * 해설 한 문장을 생성한다. 60자를 넘거나 금지어(기절·회복·즉사·회피)를 포함하면
 * 잘라내지 않고 고정 해설로 대체한다.
 */
export const generateCommentaryWithOpenRouter = async (
  or: OpenRouterClient,
  model: string,
  event: AttackEvent,
  weapons: Record<PlayerSlot, WeaponProfile>,
  lang: Lang = DEFAULT_LANG,
): Promise<string> => {
  try {
    const output = await or.chatJson({
      model,
      system: COMMENTARY_SYSTEM_BY_LANG[lang],
      user: buildCommentaryUser(event, weapons, lang),
      schema: CommentaryOutput,
      jsonSchema: COMMENTARY_JSON_SCHEMA,
      timeoutMs: 4000,
    })
    const text = output.text.trim()
    if (countChars(text) > COMMENTARY_MAX_CHARS || BANNED_WORDS_BY_LANG[lang].test(text)) {
      return fallbackFor(event.eventId, lang)
    }
    return text
  } catch (e) {
    console.warn('[ai/commentary] generation failed', String(e).slice(0, 200))
    return fallbackFor(event.eventId, lang)
  }
}
