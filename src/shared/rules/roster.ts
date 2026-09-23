import type { CharacterId, PlayerSlot } from '../schemas/enums'
import type { WeaponProfile } from '../schemas/weapon'

/**
 * 고정 출연진. "긁기 배틀" 모드: 무기를 미리 정하지 않는다.
 * 라운드마다 입력하는 한 마디가 곧 즉석 무기이고, 상대의 weakPoints 를 찌를수록 강하다.
 */
export interface RosterEntry {
  name: string
  description: string
  /** 성격·말투. 판정 모델이 '이 사람답게 긁었는지' 볼 때 쓴다. */
  persona: [string, string]
  /** 이걸 찌르면 STRONG. 화면에도 힌트로 보여준다. */
  weakPoints: [string, string, string]
  /** 말이 안 떠오를 때 누르는 추천 한 마디 2개. */
  suggestedRoasts: [{ label: string; text: string; animation: WeaponProfile['techniques'][0]['animation'] }, { label: string; text: string; animation: WeaponProfile['techniques'][0]['animation'] }]
  visualTag: WeaponProfile['visualTag']
}

export const ROSTER: Record<CharacterId, RosterEntry> = {
  grandma: {
    name: '욕쟁이 할머니',
    description: '순대국밥 20년차 욕쟁이 할머니. 국자와 국물, 거친 입담이 무기.',
    persona: ['20년 장사 짬바로 후려치는 입담', '국물처럼 뜨겁고 끈적한 잔소리'],
    weakPoints: ['요즘 것들·MZ 말투', '무릎·허리', '스마트폰·키오스크'],
    suggestedRoasts: [
      { label: '국물 회오리', text: '너 같은 건 순대국밥 국물에 말아 먹어도 간이 안 맞겠다', animation: 'SHOCKWAVE' },
      { label: '국자 후려치기', text: '숙제는 했냐? 국자로 등짝 스매싱 들어간다', animation: 'DASH' },
    ],
    visualTag: 'HEAVY',
  },
  jaemmin: {
    name: '이잼민',
    description: '내 나이 15 이잼민. "응?" 한마디 말대꾸와 키보드가 무기.',
    persona: ['"응? 아닌데?" 무한 말대꾸', '키보드 워리어 급 타이핑 속도'],
    weakPoints: ['엄마·숙제·용돈', '학원·시험', '구닥다리·옛날 사람 소리'],
    suggestedRoasts: [
      { label: '응? 반사', text: '응? 할머니 그거 요즘 아무도 안 씀 ㅋㅋ 구닥다리 인증', animation: 'PSYCHIC' },
      { label: '키보드 연타', text: '할머니 키오스크 앞에서 10분 서 있던 거 다 봤음', animation: 'PROJECTILE' },
    ],
    visualTag: 'ELECTRIC',
  },
}

export const rosterDescription = (id: CharacterId | null | undefined): string => (id ? ROSTER[id].description : '')

export const DEFAULT_CHARACTER_FOR_SLOT: Record<PlayerSlot, CharacterId> = { A: 'grandma', B: 'jaemmin' }

/** 출연진 카드. WeaponProfile 형태를 그대로 써서 엔진·화면·판정 계약을 바꾸지 않는다. */
export const characterCard = (id: CharacterId, matchId: string): WeaponProfile => {
  const r = ROSTER[id]
  return {
    id: `${matchId}-${id}`,
    version: 1,
    characterName: r.name,
    characterId: id,
    imageUrl: null,
    displayName: r.name,
    tagline: r.description,
    capabilities: [...r.persona],
    weakness: r.weakPoints.join(', '),
    visualTag: r.visualTag,
    techniques: [
      { id: `${id}-r1`, name: r.suggestedRoasts[0].label, actionText: r.suggestedRoasts[0].text, animation: r.suggestedRoasts[0].animation },
      { id: `${id}-r2`, name: r.suggestedRoasts[1].label, actionText: r.suggestedRoasts[1].text, animation: r.suggestedRoasts[1].animation },
    ],
  }
}
