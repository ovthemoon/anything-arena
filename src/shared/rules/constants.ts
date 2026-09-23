import type { Lang } from '../i18n/lang'

/** PRD 부록 C 설정값. 배포 환경에서는 wrangler.jsonc vars 가 우선한다. */
export const RULES = {
  RULESET_VERSION: 'v0.1',
  MAX_PLAYERS: 2,
  INITIAL_HP: 100,
  MAX_ROUNDS: 3,
  INPUT_WINDOW_MS: 15_000,
  JUDGE_GRACE_MS: 1_500,
  ACTION_TEXT_MAX_CHARS: 60,
  MAX_CUSTOM_ATTEMPTS_PER_PLAYER_PER_ROUND: 2,
  MAX_FOULS_BEFORE_PRESET_ONLY: 2,
  RECONNECT_GRACE_MS: 30_000,
  IDLE_ROOM_TTL_MS: 600_000,
} as const

export interface FallbackAction {
  label: string
  actionText: string
  animation: 'DASH' | 'PROJECTILE' | 'SHOCKWAVE' | 'PSYCHIC'
}

/** 시간 초과로 아무 말도 못 한 경우. 피해 0 (사용자 결정 2026-09-23). 언어는 경기(state.lang)를 따른다. */
export const FROZEN_ACTION_BY_LANG: Record<Lang, FallbackAction> = {
  ko: { label: '얼어붙음', actionText: '겁에 질려 아무 말도 하지 못했다', animation: 'PSYCHIC' },
  en: { label: 'Frozen', actionText: 'Too scared to say a single word', animation: 'PSYCHIC' },
}

/** 판정 실패·시스템 지시 등 플레이어 잘못이 아닌 대체 행동 (PRD 4.3). 피해 30. */
export const DEFAULT_ATTACK_BY_LANG: Record<Lang, FallbackAction> = {
  ko: { label: '기본 공격', actionText: '무기를 힘껏 휘두른다', animation: 'DASH' },
  en: { label: 'Basic Attack', actionText: 'Swings the weapon with all their might', animation: 'DASH' },
}

/** 한국어 기본값. 언어를 모르는 옛 호출부 호환용. */
export const FROZEN_ACTION = FROZEN_ACTION_BY_LANG.ko
export const DEFAULT_ATTACK = DEFAULT_ATTACK_BY_LANG.ko
