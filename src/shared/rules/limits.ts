export const LIMITS = {
  NICKNAME: 12,
  WEAPON_NAME: 30,
  WEAPON_DESCRIPTION: 50,
  ACTION_TEXT: 60,
  REQUEST_BYTES: 4096,
} as const

/** 유니코드 코드포인트 기준. 클라이언트와 서버가 같은 함수를 쓴다 (PRD 5). */
export const countChars = (text: string): number => Array.from(text.trim()).length

export const isWithinLimit = (text: string, max: number): boolean => countChars(text) <= max
