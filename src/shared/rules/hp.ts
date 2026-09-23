const MIN_HP = 0

/** 피해를 적용한 새 HP 를 돌려준다. 0 아래로 내려가지 않는다. 입력은 바꾸지 않는다. */
export const applyDamage = (currentHp: number, damage: number): number => {
  if (!Number.isFinite(currentHp) || !Number.isFinite(damage)) {
    throw new Error(`applyDamage: invalid input hp=${currentHp} damage=${damage}`)
  }
  if (damage < 0) {
    throw new Error(`applyDamage: damage must be >= 0, got ${damage}`)
  }
  return Math.max(MIN_HP, currentHp - damage)
}
