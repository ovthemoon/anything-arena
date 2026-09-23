import type { PlayerSlot } from '../../shared/schemas/enums'

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

export const ROSTER: readonly Character[] = [
  { id: 'grandma', name: '욕쟁이 할머니', blurb: '순대국밥 20년차 욕쟁이 할머니', portrait: { x: 58, y: 18, zoom: 2.6 } },
  { id: 'jaemmin', name: '이잼민', blurb: '내 나이 15 이잼민', portrait: { x: 56, y: 14, zoom: 2.6 } },
  // 아래 4명은 그림이 들어오면 portrait(얼굴 자르기 위치)를 idle.png 에 맞춰 조정한다.
  { id: 'daeri', name: '김대리', blurb: '퇴근 1분 전 김대리', portrait: { x: 50, y: 15, zoom: 2.6 } },
  { id: 'alba', name: '편의점 알바', blurb: '야간 300일차 편의점 알바', portrait: { x: 50, y: 15, zoom: 2.6 } },
  { id: 'chongmu', name: '산악회 총무', blurb: '단톡방 지배자 산악회 총무', portrait: { x: 50, y: 15, zoom: 2.6 } },
  { id: 'wonjang', name: '미용실 원장님', blurb: '동네 소문 다 아는 미용실 원장님', portrait: { x: 50, y: 15, zoom: 2.6 } },
]

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

export const characterOf = (id: CharacterId): Character => ROSTER.find((c) => c.id === id) ?? ROSTER[0]

export const poseUrl = (id: CharacterId, pose: Pose): string => `/assets/characters/${id}/${pose}.png`
