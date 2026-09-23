import type { PlayerSlot } from '../../shared/schemas/enums'
import { DEFAULT_LANG, type Lang } from '../../shared/i18n/lang'

export type CharacterId = 'grandma' | 'jaemmin' | 'daeri' | 'alba' | 'chongmu' | 'wonjang'
export type Pose = 'idle' | 'attack' | 'hit' | 'win' | 'lose'

export interface Character {
  id: CharacterId
  name: string
  /** 설정 생성 프롬프트와 대기실에 쓰는 한 줄 소개 */
  blurb: string
  /** idle 그림에서 얼굴을 잘라내는 위치 (0~100%, 배율) */
  portrait: { x: number; y: number; zoom: number }
}

type Names = Pick<Character, 'name' | 'blurb'>
interface CharacterBase {
  id: CharacterId
  portrait: Character['portrait']
  names: Record<Lang, Names>
}

/** 짧은 표시 이름(HUD 폭에 맞춘 것)과 한 줄 소개. 카드의 긴 이름은 shared/rules/roster 가 갖는다. */
const BASE: readonly CharacterBase[] = [
  { id: 'grandma', portrait: { x: 58, y: 18, zoom: 2.6 }, names: { ko: { name: '욕쟁이 할머니', blurb: '순대국밥 20년차 욕쟁이 할머니' }, en: { name: 'Soup Granny', blurb: 'Foul-mouthed soup granny, 20 years at the counter' } } },
  { id: 'jaemmin', portrait: { x: 44, y: 14, zoom: 2.6 }, names: { ko: { name: '이잼민', blurb: '내 나이 15 이잼민' }, en: { name: 'Jaemin', blurb: 'Jaemin, age 15' } } },
  { id: 'daeri', portrait: { x: 52, y: 16, zoom: 2.6 }, names: { ko: { name: '김대리', blurb: '퇴근 1분 전 김대리' }, en: { name: 'Office Kim', blurb: 'Kim, one minute to clock-out' } } },
  { id: 'alba', portrait: { x: 54, y: 18, zoom: 2.6 }, names: { ko: { name: '편의점 알바', blurb: '야간 300일차 편의점 알바' }, en: { name: 'Night Clerk', blurb: 'Night-shift clerk, day 300' } } },
  { id: 'chongmu', portrait: { x: 47, y: 23, zoom: 2.6 }, names: { ko: { name: '산악회 총무', blurb: '단톡방 지배자 산악회 총무' }, en: { name: 'Club Treasurer', blurb: 'Hiking club treasurer, group chat overlord' } } },
  { id: 'wonjang', portrait: { x: 41, y: 16, zoom: 2.6 }, names: { ko: { name: '미용실 원장님', blurb: '동네 소문 다 아는 미용실 원장님' }, en: { name: 'Salon Owner', blurb: 'Salon owner who knows every rumor' } } },
]

const localize = (c: CharacterBase, lang: Lang): Character => ({ id: c.id, portrait: c.portrait, ...c.names[lang] })

/** 언어별 출연진 목록. 순서는 고정. */
export const rosterFor = (lang: Lang = DEFAULT_LANG): readonly Character[] => BASE.map((c) => localize(c, lang))

/** 한국어 기본 목록. 언어를 모르는 옛 호출부 호환용. */
export const ROSTER: readonly Character[] = rosterFor(DEFAULT_LANG)

const SLOT_DEFAULT: Record<PlayerSlot, CharacterId> = { A: 'grandma', B: 'jaemmin' }

const isCharacterId = (v: unknown): v is CharacterId => ROSTER.some((c) => c.id === v)

/**
 * 서버 계약에 characterId 가 아직 없을 수 있어 느슨하게 읽는다.
 * 없거나 모르는 값이면 좌석 기본값(A=할머니, B=잼민).
 */
export const characterIdFor = (player: { characterId?: unknown } | undefined, slot: PlayerSlot): CharacterId => {
  const id = player?.characterId
  return isCharacterId(id) ? id : SLOT_DEFAULT[slot]
}

export const characterOf = (id: CharacterId, lang: Lang = DEFAULT_LANG): Character => localize(BASE.find((c) => c.id === id) ?? BASE[0], lang)

/** 6명 모두 5자세 PNG 가 있다. 그림 없는 캐릭터를 다시 넣을 때 여기서 제외한다. */
export const hasCharacterArtwork = (_id: CharacterId): boolean => true

export const poseUrl = (id: CharacterId, pose: Pose): string =>
  hasCharacterArtwork(id) ? `/assets/characters/${id}/${pose}.png` : '/assets/characters/placeholder.svg'
