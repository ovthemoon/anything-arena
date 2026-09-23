import type { PlayerSlot } from '../../../shared/schemas/enums'
import type { AttackEvent } from '../../../shared/schemas/match'
import type { WeaponProfile } from '../../../shared/schemas/weapon'
import { rosterVoice } from '../../../shared/rules/roster'

export const COMMENTARY_SYSTEM =
  '한국 골목 코믹 웹툰풍 격투 게임, 세계대회 결승 해설자 톤. 한 문장 50자 이내. 아래 확정 사실만 말한다. ' +
  '이 게임은 말로 긁는 배틀이다: technique/approvedActionText 는 공격자가 던진 한 마디이고, 그 말이 즉석 무기다. ' +
  'damage 가 0 이면 뻔하거나 헛발질이라 관객이 썰렁해한 것으로 중계한다. ' +
  'fallbackReason 이 TIMEOUT 이면 공격자가 겁에 질려 아무 말도 못 한 장면이다. 비웃되 실제 사람 비하는 금지. ' +
  'attackerTone·attackerCatchphrases 가 있으면 해설 중 한 구절만 그 말투를 살짝 흉내낸다. ' +
  '없는 회피·회복·기절·즉사를 말하지 않는다. 사용자 비하 금지. 한국어로만 답한다.'

export const buildCommentaryUser = (event: AttackEvent, weapons: Record<PlayerSlot, WeaponProfile>): string => {
  const voice = rosterVoice(weapons[event.actor].characterId)
  return JSON.stringify({
    attackerCharacter: weapons[event.actor].characterName,
    attackerWeapon: weapons[event.actor].displayName,
    attackerTone: voice?.tone ?? null,
    attackerCatchphrases: voice?.catchphrases ?? null,
    technique: event.techniqueLabel,
    approvedActionText: event.approvedActionText,
    effectiveness: event.effectiveness,
    damage: event.damage,
    fallbackReason: event.fallbackReason ?? null,
    defenderCharacter: weapons[event.target].characterName,
    defenderWeapon: weapons[event.target].displayName,
  })
}
