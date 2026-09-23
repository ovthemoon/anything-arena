import type { Outcome } from './outcome'
import { burstParticles } from './particles'

export interface ImpactProps {
  outcome: Outcome
  /** 피격자가 있는 쪽 */
  targetSide: 'left' | 'right'
  /** 같은 공격 안에서 파편 배치가 바뀌지 않도록 하는 씨앗 */
  seed: number
  reducedMotion: boolean
}

const PARTICLE_COUNT: Record<Outcome, number> = { STRONG: 14, NORMAL: 10, LIMITED: 6, MISS: 0 }

/** 맞는 순간의 번쩍임과 파편. 순수 표시 컴포넌트, 결과 구간(result)에만 마운트한다. */
export function Impact({ outcome, targetSide, seed, reducedMotion }: ImpactProps) {
  if (outcome === 'MISS') return null
  const particles = reducedMotion ? [] : burstParticles(PARTICLE_COUNT[outcome], seed)
  return (
    <>
      <div className={`impact-flash impact-flash--${outcome}`} />
      <div className={`impact impact--${targetSide} impact--${outcome}`}>
        {particles.map((p, i) => (
          <span
            key={i}
            className="impact__shard"
            style={{
              ['--dx' as string]: String(p.dx),
              ['--dy' as string]: String(p.dy),
              ['--size' as string]: String(p.size),
              ['--rot' as string]: `${p.rotateDeg}deg`,
              animationDelay: `${p.delayMs}ms`,
            }}
          />
        ))}
      </div>
    </>
  )
}
