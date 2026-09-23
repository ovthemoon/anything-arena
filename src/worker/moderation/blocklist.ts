import { DEFAULT_LANG, type Lang } from '../../shared/i18n/lang'

/**
 * 금칙어 1차 방어. Jev 호출 전에 값싸게 걸러낸다.
 * 정규화(띄어쓰기·특수문자 제거, 초성 확장)를 먼저 거친 뒤 부분일치로 검사한다.
 * 언어별 목록을 따로 두되, 한글 목록은 언어와 무관하게 항상 검사한다 (영어 방에서 한국어 욕설도 막는다).
 */

// 자모 초성만으로 쓰인 욕설도 잡는다 (예: 'ㅅㅂ').
const CHOSEONG_ALIASES: Record<string, string> = {
  'ㅅㅂ': '씨발',
  'ㅆㅂ': '씨발',
  'ㅄ': '병신',
  'ㅂㅅ': '병신',
  'ㄲㅈ': '꺼져',
  'ㅈㄹ': '지랄',
  'ㅗ': '엿',
}

const normalizeCore = (text: string): string =>
  text
    .toLowerCase()
    // 공백·특수문자·문장부호 제거. 한글·영문·숫자만 남긴다.
    .replace(/[^\p{L}\p{N}]+/gu, '')

/** 검사용 정규화: 공백·특수문자 제거 후 초성 은어를 풀어 쓴 문자열로 치환. */
export const normalize = (text: string): string => {
  let normalized = normalizeCore(text)
  for (const [alias, expanded] of Object.entries(CHOSEONG_ALIASES)) {
    normalized = normalized.split(alias).join(expanded)
  }
  return normalized
}

/**
 * 약 20개 내외 항목. 실제 참가자·가족을 향한 모욕·혐오 표현 위주.
 * '엄마의 잠깐 와봐', '젖은 양말' 처럼 무해하게 부분 문자열을 포함하는 문장은 걸리지 않도록
 * 정규화 후에도 오탐이 나지 않는 항목만 고른다.
 */
const BLOCKLIST_KO: string[] = [
  '씨발',
  '씨팔',
  '시발',
  '병신',
  '지랄',
  '개새끼',
  '개새',
  '느금',
  '니엄마',
  '너희엄마',
  '느그엄마',
  '창녀',
  '걸레년',
  '죽여버린다',
  '죽여버려',
  '자살해',
  '꺼져병신',
  '한남충',
  '김치년',
  '틀딱',
  '급식충',
]

/**
 * English list. Slurs, family insults and real-harm threats only.
 * Every entry is checked as a substring after normalization, so short words that hide inside
 * harmless ones (e.g. "ass" in "class", "hell" in "shell") are deliberately left out.
 */
const BLOCKLIST_EN: string[] = [
  'fuck',
  'motherfucker',
  'bitch',
  'cunt',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'yourmom',
  'yourmother',
  'yomama',
  'killyourself',
  'kys',
  'gokillyourself',
  'illkillyou',
  'iwillkillyou',
  'whore',
  'slut',
  'chink',
  'spic',
  'kike',
  'tranny',
]

const BLOCKLIST_BY_LANG: Record<Lang, string[]> = { ko: BLOCKLIST_KO, en: BLOCKLIST_EN }

const hitsList = (normalized: string, list: string[]): boolean => list.some((word) => normalized.includes(normalizeCore(word)))

/** 한글 목록은 항상, 영어 목록은 영어 방에서 추가로 검사한다. */
export const hitsBlocklist = (text: string, lang: Lang = DEFAULT_LANG): boolean => {
  const normalized = normalize(text)
  if (hitsList(normalized, BLOCKLIST_KO)) return true
  return lang !== 'ko' && hitsList(normalized, BLOCKLIST_BY_LANG[lang])
}
