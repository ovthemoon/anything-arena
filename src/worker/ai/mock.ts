import type { AiAdapters } from './types'
import type { WeaponProfile } from '../../shared/schemas/weapon'
import { AnimationType, VisualTag } from '../../shared/schemas/enums'
import { DEFAULT_LANG, type Lang } from '../../shared/i18n/lang'

/** 언어별 결정적 패턴. 한국어는 원래 규칙, 영어는 같은 뜻의 단어 목록. */
const SYSTEM_INSTRUCTION_PATTERN: Record<Lang, RegExp> = {
  ko: /(시스템|프롬프트|규칙|hp|체력).*(무시|바꿔|바꾸|0으로|조작)/i,
  en: /(system|prompt|rules?|hp|health).*(ignore|change|set|to 0|zero|override)/i,
}
const FOUL_PATTERN: Record<Lang, RegExp> = {
  ko: /(니\s*엄마|느금|씨\s*발|병신)/,
  en: /(your\s*mom|your\s*mother|f+u+c+k|bitch|retard)/i,
}
/** 뻔한 실제 무기·폭력 묘사 → MISS (피해 0). */
const GENERIC_VIOLENCE_PATTERN: Record<Lang, RegExp> = {
  ko: /(칼|총|주먹|발차기|찌른다|찔러|벤다|베어|쏜다|쏴|때린다|패버|죽인다|죽여)/,
  en: /\b(knife|gun|fist|punch|punches|kick|kicks|stab|stabs|slash|shoot|shoots|hit|hits|beat|beats|kill|kills)\b/i,
}
const MOCK_TEXT: Record<Lang, { tagline: (w: string) => string; capabilities: [string, string]; weakness: string; charge: (w: string) => [string, string]; wave: (w: string) => [string, string]; commentary: (who: string, tech: string, dmg: number) => string }> = {
  ko: {
    tagline: (w) => `${w}의 기묘한 집념`,
    capabilities: ['휘두르기', '존재감'],
    weakness: '무관심',
    charge: (w) => [`${w} 돌진`, `${w}을(를) 들고 돌진한다`],
    wave: (w) => [`${w} 파동`, `${w}의 기운을 내뿜는다`],
    commentary: (who, tech, dmg) => `${who}의 ${tech}! ${dmg} 피해입니다!`,
  },
  en: {
    tagline: (w) => `The strange obsession of the ${w}`,
    capabilities: ['swinging', 'presence'],
    weakness: 'indifference',
    charge: (w) => [`${w} Charge`, `Charges in holding the ${w}`],
    wave: (w) => [`${w} Wave`, `Unleashes the aura of the ${w}`],
    commentary: (who, tech, dmg) => `${who} lands ${tech}! ${dmg} damage!`,
  },
}

const hash = (s: string): number => Array.from(s).reduce((h, c) => (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0, 7)

/** 결정적 가짜 AI. 같은 입력이면 같은 답. 실제 모델처럼 위장하지 않는다 (PRD 부록 B). */
export const createMockAdapters = (): AiAdapters => ({
  async generateWeapon(input, ctx) {
    const h = hash(input.weaponName)
    const tag = VisualTag.options[h % VisualTag.options.length]
    const anim = AnimationType.options
    const text = MOCK_TEXT[ctx.lang ?? DEFAULT_LANG]
    const [chargeName, chargeText] = text.charge(input.weaponName)
    const [waveName, waveText] = text.wave(input.weaponName)
    const profile: WeaponProfile = {
      id: `${ctx.matchId}-${ctx.slot}-${h}`, version: 1, characterName: input.character || input.nickname, characterId: input.characterId ?? null, imageUrl: null, displayName: input.weaponName,
      tagline: input.description || text.tagline(input.weaponName),
      capabilities: [...text.capabilities], weakness: text.weakness, visualTag: tag,
      techniques: [
        { id: `${h}-1`, name: chargeName.slice(0, 20), actionText: chargeText, animation: anim[h % 4] },
        { id: `${h}-2`, name: waveName.slice(0, 20), actionText: waveText, animation: anim[(h + 1) % 4] },
      ],
    }
    return profile
  },
  async judgeAction({ defender, actionText, lang = DEFAULT_LANG }) {
    if (SYSTEM_INSTRUCTION_PATTERN[lang].test(actionText)) {
      return { moderation: 'ALLOW', moderationReason: 'NORMAL', validity: 'SYSTEM_INSTRUCTION', effectiveness: 'NORMAL', animation: 'DASH', reasonCode: 'NORMAL' }
    }
    if (FOUL_PATTERN[lang].test(actionText)) {
      return { moderation: 'FOUL', moderationReason: 'PERSONAL_ATTACK', validity: 'VALID', effectiveness: 'NORMAL', animation: 'DASH', reasonCode: 'NORMAL' }
    }
    if (GENERIC_VIOLENCE_PATTERN[lang].test(actionText)) {
      return { moderation: 'ALLOW', moderationReason: 'NORMAL', validity: 'VALID', effectiveness: 'MISS', animation: 'DASH', reasonCode: 'OFF_THEME' }
    }
    const weakPoints = defender.weakness.split(/[,·&]/).map((w) => w.trim()).filter(Boolean)
    const haystack = actionText.toLowerCase()
    const strong = weakPoints.some((w) => w && haystack.includes(w.toLowerCase()))
    return {
      moderation: 'ALLOW', moderationReason: 'NORMAL', validity: 'VALID',
      effectiveness: strong ? 'STRONG' : 'NORMAL',
      animation: AnimationType.options[hash(actionText) % 4],
      reasonCode: strong ? 'WEAKNESS_MATCH' : 'NORMAL',
    }
  },
  async generateCommentary(event, weapons, lang = DEFAULT_LANG) {
    return MOCK_TEXT[lang].commentary(weapons[event.actor].displayName, event.techniqueLabel, event.damage)
  },
  async generateWeaponImage() { return null },
  async synthesize() { return null },
  async checkText(text, lang = DEFAULT_LANG) { return FOUL_PATTERN[lang].test(text) ? 'FOUL' : 'ALLOW' },
})
