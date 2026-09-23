import type { PlayerSlot, ModerationDecision } from '../../shared/schemas/enums'
import type { AttackEvent } from '../../shared/schemas/match'
import type { JudgeResult } from '../../shared/schemas/judge'
import type { WeaponInput, WeaponProfile } from '../../shared/schemas/weapon'

export interface JudgeRequest {
  attacker: WeaponProfile
  defender: WeaponProfile
  actionText: string
  rulesetVersion: string
}

/**
 * 모든 AI 호출은 이 인터페이스 뒤에 있다.
 * AI 는 의미만 판단한다. 숫자(HP·피해·승패)는 game/engine 이 결정한다.
 */
export interface AiAdapters {
  generateWeapon(input: WeaponInput, ctx: { matchId: string; slot: PlayerSlot }): Promise<WeaponProfile>
  judgeAction(req: JudgeRequest): Promise<JudgeResult>
  generateCommentary(event: AttackEvent, weapons: Record<PlayerSlot, WeaponProfile>): Promise<string>
  /** 성공 시 클라이언트가 GET 할 수 있는 경로(/api/audio/...), 실패·미지원이면 null */
  synthesize(text: string, key: string): Promise<string | null>
  /** 닉네임·무기명·생성 출력 검사 */
  checkText(text: string): Promise<ModerationDecision>
}
