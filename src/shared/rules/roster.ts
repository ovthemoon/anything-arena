import type { CharacterId } from '../schemas/enums'

/** 고정 출연진 설명. 설정 생성 프롬프트와 화면 소개에 같은 문장을 쓴다 (v0.2 연출 설계 §7). */
export const ROSTER: Record<CharacterId, { name: string; description: string }> = {
  grandma: { name: '욕쟁이 할머니', description: '순대국밥 20년차 욕쟁이 할머니. 국자와 국물, 거친 입담이 무기.' },
  jaemmin: { name: '이잼민', description: '내 나이 15 이잼민. "응?" 한마디 말대꾸와 키보드가 무기.' },
}

export const rosterDescription = (id: CharacterId | null | undefined): string => (id ? ROSTER[id].description : '')
