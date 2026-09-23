import type { PlayerSlot } from '../../../shared/schemas/enums'
import type { AttackEvent } from '../../../shared/schemas/match'
import type { WeaponProfile } from '../../../shared/schemas/weapon'
import { rosterVoice } from '../../../shared/rules/roster'
import { DEFAULT_LANG, type Lang } from '../../../shared/i18n/lang'

const COMMENTARY_SYSTEM_KO =
  '한국 골목 코믹 웹툰풍 격투 게임 세계대회 결승, 흥분한 스포츠 캐스터의 실황 중계. 전체 50자 이내, 짧은 문장 1~2개, 느낌표로 끝낸다. ' +
  '캐스터 문법: 현재형 실황("들어갑니다… 들어갔어요!"), 숫자를 외침("40! 40 대미지!"), 결과 딱지를 붙인다 ' +
  '(STRONG=정통!·결정적!, NORMAL=들어갔습니다!, LIMITED=막아냈습니다!, MISS=헛스윙!). ' +
  '예: STRONG "들어갔어요! 국자 후려치기 정통으로! 40 대미지!" / MISS "헛스윙! 허공을 갈랐습니다, 관중석이 조용해요!" 아래 확정 사실만 말한다. ' +
  '이 게임은 말로 긁는 배틀이다: technique/approvedActionText 는 공격자가 던진 한 마디이고, 그 말이 즉석 무기다. ' +
  'damage 가 0 이면 뻔하거나 헛발질이라 관객이 썰렁해한 것으로 중계한다. ' +
  'fallbackReason 이 TIMEOUT 이면 공격자가 겁에 질려 아무 말도 못 한 장면이다. 비웃되 실제 사람 비하는 금지. ' +
  'attackerTone·attackerCatchphrases 가 있으면 해설 중 한 구절만 그 말투를 살짝 흉내낸다. ' +
  '없는 회피·회복·기절·즉사를 말하지 않는다. 사용자 비하 금지. 한국어로만 답한다.'

const COMMENTARY_SYSTEM_EN =
  'You are the play-by-play commentator at the world finals of a comic, webtoon-style street fighting game. One sentence, 60 characters or fewer. State only the confirmed facts below. ' +
  'This is a roast battle fought with words: technique/approvedActionText is the one-liner the attacker threw, and that line is their improvised weapon. ' +
  'If damage is 0, the line was lame or missed and the crowd went silent; call it that way. ' +
  'If fallbackReason is TIMEOUT, the attacker froze up and said nothing. Mock the moment, never a real person. ' +
  'If attackerTone/attackerCatchphrases are present, echo that voice in one short phrase only. ' +
  'Never mention dodging, healing, stuns or instant kills that did not happen. Never insult the users. Answer in English only.'

export const COMMENTARY_SYSTEM_BY_LANG: Record<Lang, string> = { ko: COMMENTARY_SYSTEM_KO, en: COMMENTARY_SYSTEM_EN }

/** 한국어 기본값. 언어를 모르는 옛 호출부 호환용. */
export const COMMENTARY_SYSTEM = COMMENTARY_SYSTEM_KO

export const buildCommentaryUser = (event: AttackEvent, weapons: Record<PlayerSlot, WeaponProfile>, lang: Lang = DEFAULT_LANG): string => {
  const voice = rosterVoice(weapons[event.actor].characterId, lang)
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
