import type { WeaponProfile } from '../../shared/schemas/weapon'

/** 설정 생성 실패 시 쓰는 검수된 기본 무기 (PRD 5). */
export const DEFAULT_WEAPONS: [WeaponProfile, WeaponProfile] = [
  {
    id: 'default-wet-sock', version: 1, displayName: '젖은 양말', tagline: '하루 종일 따라다니는 축축함',
    capabilities: ['수분 전달', '휘두르기'], weakness: '열', visualTag: 'WET',
    techniques: [
      { id: 'wet-1', name: '축축한 최후의 일격', actionText: '양말을 휘둘러 상대를 흠뻑 적신다', animation: 'DASH' },
      { id: 'wet-2', name: '젖은 회전타', actionText: '물방울을 흩뿌리며 회전한다', animation: 'PROJECTILE' },
    ],
  },
  {
    id: 'default-phone-1pct', version: 1, displayName: '배터리 1% 스마트폰', tagline: '마지막 순간까지 꺼지지 않는 집념',
    capabilities: ['진동', '화면 빛'], weakness: '수분', visualTag: 'ELECTRIC',
    techniques: [
      { id: 'phone-1', name: '방전 직전 진동파', actionText: '남은 힘을 모아 격렬하게 진동한다', animation: 'SHOCKWAVE' },
      { id: 'phone-2', name: '마지막 화면 섬광', actionText: '최대 밝기로 상대의 눈을 찌른다', animation: 'PSYCHIC' },
    ],
  },
]
