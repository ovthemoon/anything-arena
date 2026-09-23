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

/** 미입력·판정 실패 시 코드가 정의한 안전한 대체 행동 (PRD 4.3). 피해 30. */
export const DEFAULT_ATTACK = {
  label: '기본 공격',
  actionText: '무기를 힘껏 휘두른다',
  animation: 'DASH',
} as const
