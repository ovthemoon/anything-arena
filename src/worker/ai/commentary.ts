import { z } from 'zod'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { AttackEvent } from '../../shared/schemas/match'
import type { WeaponProfile } from '../../shared/schemas/weapon'
import { countChars } from '../../shared/rules/limits'
import type { OpenRouterClient } from './openrouter'
import { COMMENTARY_SYSTEM, buildCommentaryUser } from './prompts/commentary'

const COMMENTARY_MAX_CHARS = 60
const BANNED_WORDS_PATTERN = /(기절|회복|즉사|회피)/

/** 실제 호출 실패·검증 실패 시 순환으로 쓰는 고정 해설 (PRD 7). */
export const FALLBACK_COMMENTARY = ['강렬한 한 방입니다!', '경기장이 술렁입니다!', '이건 아프겠는데요!']

const CommentaryOutput = z.object({ text: z.string() })
const COMMENTARY_JSON_SCHEMA = z.toJSONSchema(CommentaryOutput)

const hash = (s: string): number => Array.from(s).reduce((h, c) => (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0, 7)

/** eventId 를 시드로 고정 해설 배열을 순환한다 (AttackEvent 엔 eventSeq 필드가 없다 — RoundResolved 쪽에 있음). */
const fallbackFor = (eventId: string): string => FALLBACK_COMMENTARY[hash(eventId) % FALLBACK_COMMENTARY.length]

/**
 * 해설 한 문장을 생성한다. 60자를 넘거나 금지어(기절·회복·즉사·회피)를 포함하면
 * 잘라내지 않고 고정 해설로 대체한다.
 */
export const generateCommentaryWithOpenRouter = async (
  or: OpenRouterClient,
  model: string,
  event: AttackEvent,
  weapons: Record<PlayerSlot, WeaponProfile>,
): Promise<string> => {
  try {
    const output = await or.chatJson({
      model,
      system: COMMENTARY_SYSTEM,
      user: buildCommentaryUser(event, weapons),
      schema: CommentaryOutput,
      jsonSchema: COMMENTARY_JSON_SCHEMA,
      timeoutMs: 4000,
    })
    const text = output.text.trim()
    if (countChars(text) > COMMENTARY_MAX_CHARS || BANNED_WORDS_PATTERN.test(text)) {
      return fallbackFor(event.eventId)
    }
    return text
  } catch (e) {
    console.warn('[ai/commentary] generation failed', String(e).slice(0, 200))
    return fallbackFor(event.eventId)
  }
}
