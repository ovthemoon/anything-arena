import type { AiAdapters } from './types'
import type { WeaponProfile } from '../../shared/schemas/weapon'
import { AnimationType, VisualTag } from '../../shared/schemas/enums'

const SYSTEM_INSTRUCTION_PATTERN = /(시스템|프롬프트|규칙|hp|체력).*(무시|바꿔|바꾸|0으로|조작)/i
const FOUL_PATTERN = /(니\s*엄마|느금|씨\s*발|병신)/

const hash = (s: string): number => Array.from(s).reduce((h, c) => (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0, 7)

/** 결정적 가짜 AI. 같은 입력이면 같은 답. 실제 모델처럼 위장하지 않는다 (PRD 부록 B). */
export const createMockAdapters = (): AiAdapters => ({
  async generateWeapon(input, ctx) {
    const h = hash(input.weaponName)
    const tag = VisualTag.options[h % VisualTag.options.length]
    const anim = AnimationType.options
    const profile: WeaponProfile = {
      id: `${ctx.matchId}-${ctx.slot}-${h}`, version: 1, characterName: input.character || input.nickname, characterId: input.characterId ?? null, imageUrl: null, displayName: input.weaponName,
      tagline: input.description || `${input.weaponName}의 기묘한 집념`,
      capabilities: ['휘두르기', '존재감'], weakness: '무관심', visualTag: tag,
      techniques: [
        { id: `${h}-1`, name: `${input.weaponName} 돌진`.slice(0, 20), actionText: `${input.weaponName}을(를) 들고 돌진한다`, animation: anim[h % 4] },
        { id: `${h}-2`, name: `${input.weaponName} 파동`.slice(0, 20), actionText: `${input.weaponName}의 기운을 내뿜는다`, animation: anim[(h + 1) % 4] },
      ],
    }
    return profile
  },
  async judgeAction({ defender, actionText }) {
    if (SYSTEM_INSTRUCTION_PATTERN.test(actionText)) {
      return { moderation: 'ALLOW', moderationReason: 'NORMAL', validity: 'SYSTEM_INSTRUCTION', effectiveness: 'NORMAL', animation: 'DASH', reasonCode: 'NORMAL' }
    }
    if (FOUL_PATTERN.test(actionText)) {
      return { moderation: 'FOUL', moderationReason: 'PERSONAL_ATTACK', validity: 'VALID', effectiveness: 'NORMAL', animation: 'DASH', reasonCode: 'NORMAL' }
    }
    const strong = actionText.includes(defender.weakness)
    return {
      moderation: 'ALLOW', moderationReason: 'NORMAL', validity: 'VALID',
      effectiveness: strong ? 'STRONG' : 'NORMAL',
      animation: AnimationType.options[hash(actionText) % 4],
      reasonCode: strong ? 'WEAKNESS_MATCH' : 'NORMAL',
    }
  },
  async generateCommentary(event, weapons) {
    return `${weapons[event.actor].displayName}의 ${event.techniqueLabel}! ${event.damage} 피해입니다!`
  },
  async generateWeaponImage() { return null },
  async synthesize() { return null },
  async checkText(text) { return FOUL_PATTERN.test(text) ? 'FOUL' : 'ALLOW' },
})
