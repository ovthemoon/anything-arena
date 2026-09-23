import type { CharacterId } from '../schemas/enums'
import type { Lang } from '../i18n/lang'
import type { Roast } from './roster'
import { MATCHUP_ROASTS_KO } from './matchups-ko'

export type MatchupTable = Record<CharacterId, Partial<Record<CharacterId, Roast[]>>>

/** 언어별 매치업 표. 없는 언어·조합은 빈 배열 → 카드는 자기 목소리 풀만 싣는다. */
const TABLES: Partial<Record<Lang, MatchupTable>> = { ko: MATCHUP_ROASTS_KO }

export const matchupRoasts = (attacker: CharacterId, defender: CharacterId, lang: Lang): Roast[] =>
  attacker === defender ? [] : TABLES[lang]?.[attacker]?.[defender] ?? []
