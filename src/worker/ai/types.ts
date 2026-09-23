import type { PlayerSlot, ModerationDecision } from '../../shared/schemas/enums'
import type { AttackEvent } from '../../shared/schemas/match'
import type { JudgeResult } from '../../shared/schemas/judge'
import type { WeaponInput, WeaponProfile } from '../../shared/schemas/weapon'
import type { Lang } from '../../shared/i18n/lang'

export interface JudgeRequest {
  attacker: WeaponProfile
  defender: WeaponProfile
  actionText: string
  rulesetVersion: string
  /** 경기 언어. 없으면 ko. 프롬프트·판정 기준·금칙어가 이 값으로 갈린다. */
  lang?: Lang
}

/**
 * 모든 AI 호출은 이 인터페이스 뒤에 있다.
 * AI 는 의미만 판단한다. 숫자(HP·피해·승패)는 game/engine 이 결정한다.
 */
export interface AiAdapters {
  generateWeapon(input: WeaponInput, ctx: { matchId: string; slot: PlayerSlot; lang?: Lang }): Promise<WeaponProfile>
  judgeAction(req: JudgeRequest): Promise<JudgeResult>
  generateCommentary(event: AttackEvent, weapons: Record<PlayerSlot, WeaponProfile>, lang?: Lang): Promise<string>
  /** 무기 그림 1장. 성공 시 동일 출처 경로(/api/images/...), 실패·타임아웃·미지원이면 null. 전투를 막지 않는다. */
  generateWeaponImage(profile: WeaponProfile, ctx: { matchId: string; slot: PlayerSlot }): Promise<string | null>
  /** 성공 시 클라이언트가 GET 할 수 있는 경로(/api/audio/...), 실패·미지원이면 null */
  synthesize(text: string, key: string, lang?: Lang): Promise<string | null>
  /** 닉네임·무기명·생성 출력 검사 */
  checkText(text: string, lang?: Lang): Promise<ModerationDecision>
}
