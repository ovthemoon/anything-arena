import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { DEFAULT_LANG, type Lang } from '../../shared/i18n/lang'
import { stringsFor, type Strings } from './strings'

const LangContext = createContext<Lang>(DEFAULT_LANG)

/** 방 언어(스냅샷의 match.lang) 또는 시작 화면의 로컬 선택을 하위 화면에 공급한다. 문서 제목·html lang 도 맞춘다. */
export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = stringsFor(lang).appTitle
  }, [lang])
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>
}

export const useLang = (): Lang => useContext(LangContext)

export const useT = (): Strings => stringsFor(useContext(LangContext))
