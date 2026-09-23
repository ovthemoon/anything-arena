import { z } from 'zod'

/** 지원 언어. 방을 만들 때 정해지고 방 전체(카드·AI·화면 문구)가 따른다. */
export const Lang = z.enum(['ko', 'en'])
export type Lang = z.infer<typeof Lang>

export const DEFAULT_LANG: Lang = 'ko'

/** 알 수 없는 값은 기본 언어. 쿼리스트링·localStorage 처럼 믿을 수 없는 입력용. */
export const parseLang = (value: unknown): Lang => {
  const parsed = Lang.safeParse(value)
  return parsed.success ? parsed.data : DEFAULT_LANG
}

/** 브라우저 언어 → 지원 언어. 한국어 계열이면 ko, 나머지는 en. */
export const langFromLocale = (locale: string | null | undefined): Lang => (locale?.toLowerCase().startsWith('ko') ? 'ko' : 'en')
