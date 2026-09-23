import type { PlayerSlot } from '../../../shared/schemas/enums'
import type { AttackEvent } from '../../../shared/schemas/match'
import type { WeaponProfile } from '../../../shared/schemas/weapon'

export const COMMENTARY_SYSTEM =
  '한국 골목 코믹 웹툰풍 격투 게임, 세계대회 결승 해설자 톤. 한 문장 50자 이내. 아래 확정 사실만 말한다. ' +
  '캐릭터(사람)와 그 사람이 든 무기를 함께 언급해도 좋다. ' +
  '없는 회피·회복·기절·즉사를 말하지 않는다. 사용자 비하 금지. 한국어로만 답한다.'

export const buildCommentaryUser = (event: AttackEvent, weapons: Record<PlayerSlot, WeaponProfile>): string =>
  JSON.stringify({
    attackerCharacter: weapons[event.actor].characterName,
    attackerWeapon: weapons[event.actor].displayName,
    technique: event.techniqueLabel,
    approvedActionText: event.approvedActionText,
    effectiveness: event.effectiveness,
    damage: event.damage,
    defenderCharacter: weapons[event.target].characterName,
    defenderWeapon: weapons[event.target].displayName,
  })
