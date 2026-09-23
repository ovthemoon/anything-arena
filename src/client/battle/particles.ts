export interface Particle {
  /** 방향 벡터. 길이 0.55~1 */
  dx: number
  dy: number
  /** 상대 크기 0.5~1 */
  size: number
  delayMs: number
  rotateDeg: number
}

const MIN_REACH = 0.55
const MAX_DELAY_MS = 60

/** 작은 결정적 난수 (mulberry32). 같은 seed 면 같은 파편. */
const rng = (seed: number) => {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** 충돌 지점에서 사방으로 튀는 파편. 각도는 고르게 나누고 거리·크기만 흔든다. */
export const burstParticles = (count: number, seed: number): readonly Particle[] => {
  const next = rng(seed + 1)
  return Array.from({ length: count }, (_, i) => {
    const angle = ((i + next() * 0.8) / count) * Math.PI * 2
    const reach = MIN_REACH + next() * (1 - MIN_REACH)
    return {
      dx: Math.cos(angle) * reach,
      dy: Math.sin(angle) * reach,
      size: 0.5 + next() * 0.5,
      delayMs: Math.round(next() * MAX_DELAY_MS),
      rotateDeg: Math.round(next() * 360),
    }
  })
}
