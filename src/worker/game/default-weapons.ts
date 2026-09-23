import type { WeaponProfile } from '../../shared/schemas/weapon'
import { DEFAULT_LANG, type Lang } from '../../shared/i18n/lang'

/** 설정 생성 실패 시 쓰는 검수된 기본 무기 (PRD 5). 한국어. */
export const DEFAULT_WEAPONS: [WeaponProfile, WeaponProfile] = [
  {
    id: 'default-wet-sock', version: 1, characterName: '빨래 못 말린 자취생', characterId: null, imageUrl: null, displayName: '젖은 양말', tagline: '하루 종일 따라다니는 축축함',
    capabilities: ['수분 전달', '휘두르기'], weakness: '열', visualTag: 'WET',
    techniques: [
      { id: 'wet-1', name: '축축한 최후의 일격', actionText: '양말을 휘둘러 상대를 흠뻑 적신다', animation: 'DASH' },
      { id: 'wet-2', name: '젖은 회전타', actionText: '물방울을 흩뿌리며 회전한다', animation: 'PROJECTILE' },
    ],
  },
  {
    id: 'default-phone-1pct', version: 1, characterName: '충전기 잃어버린 대학생', characterId: null, imageUrl: null, displayName: '배터리 1% 스마트폰', tagline: '마지막 순간까지 꺼지지 않는 집념',
    capabilities: ['진동', '화면 빛'], weakness: '수분', visualTag: 'ELECTRIC',
    techniques: [
      { id: 'phone-1', name: '방전 직전 진동파', actionText: '남은 힘을 모아 격렬하게 진동한다', animation: 'SHOCKWAVE' },
      { id: 'phone-2', name: '마지막 화면 섬광', actionText: '최대 밝기로 상대의 눈을 찌른다', animation: 'PSYCHIC' },
    ],
  },
]

/** English twins of the reviewed default weapons. Same ids so judge caches line up per match. */
export const DEFAULT_WEAPONS_EN: [WeaponProfile, WeaponProfile] = [
  {
    id: 'default-wet-sock', version: 1, characterName: 'Student Who Never Dries Laundry', characterId: null, imageUrl: null, displayName: 'Wet Sock', tagline: 'A dampness that follows you all day',
    capabilities: ['moisture transfer', 'swinging'], weakness: 'heat', visualTag: 'WET',
    techniques: [
      { id: 'wet-1', name: 'Soggy Final Blow', actionText: 'Swings the sock and soaks the opponent through', animation: 'DASH' },
      { id: 'wet-2', name: 'Wet Spin', actionText: 'Spins around, spraying droplets everywhere', animation: 'PROJECTILE' },
    ],
  },
  {
    id: 'default-phone-1pct', version: 1, characterName: 'Student Who Lost the Charger', characterId: null, imageUrl: null, displayName: '1% Battery Phone', tagline: 'Refuses to die until the very last second',
    capabilities: ['vibration', 'screen glare'], weakness: 'moisture', visualTag: 'ELECTRIC',
    techniques: [
      { id: 'phone-1', name: 'Last-Gasp Buzz', actionText: 'Gathers its last power and vibrates violently', animation: 'SHOCKWAVE' },
      { id: 'phone-2', name: 'Final Screen Flash', actionText: 'Blinds the opponent at maximum brightness', animation: 'PSYCHIC' },
    ],
  },
]

export const defaultWeaponsFor = (lang: Lang = DEFAULT_LANG): [WeaponProfile, WeaponProfile] => (lang === 'en' ? DEFAULT_WEAPONS_EN : DEFAULT_WEAPONS)

/** 휴대폰 '추천 캐릭터' 목록. 고르면 이 값으로 weapon_submit 을 보낸다 (프리셋 = 미리 채운 입력). */
export const PRESET_CHARACTERS = [
  { character: '순대국밥 20년차 욕쟁이 할머니', weaponName: '국자', description: '국물 회오리를 일으킨다' },
  { character: '내 나이 15 이잼민', weaponName: '응? 키보드', description: '말대꾸로 방패를 만든다' },
  { character: '빨래 못 말린 자취생', weaponName: '젖은 양말', description: '하루 종일 따라다니는 축축함' },
  { character: '충전기 잃어버린 대학생', weaponName: '배터리 1% 스마트폰', description: '마지막까지 꺼지지 않는 집념' },
] as const
