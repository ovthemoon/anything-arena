import { DEFAULT_LANG, langFromLocale, parseLang, type Lang } from '../../shared/i18n/lang'

const STORAGE_KEY = 'lang'

/** 저장된 언어 → 없으면 브라우저 언어 → 그것도 없으면 기본값. 비공개 모드 등 저장소 예외는 무시한다. */
export const readLangPref = (): Lang => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return parseLang(stored)
  } catch {
    /* private mode / blocked storage */
  }
  if (typeof navigator === 'undefined') return DEFAULT_LANG
  return langFromLocale(navigator.language)
}

export const writeLangPref = (lang: Lang): void => {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* ignore */
  }
}
