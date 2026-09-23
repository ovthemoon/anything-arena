import type { Outcome } from './outcome'

export interface FxProps {
  kind: 'name' | 'result' | 'none'
  text?: string
  outcome?: Outcome
  damage?: number
  /** 피격자가 있는 쪽 */
  targetSide?: 'left' | 'right'
  showDamage?: boolean
}

/** 기술명·만화 글씨·피해 숫자. 순수 표시 컴포넌트. */
export function Fx({ kind, text = '', outcome = 'NORMAL', damage = 0, targetSide = 'right', showDamage = false }: FxProps) {
  if (kind === 'none') return null
  if (kind === 'name') return <div className="fx fx--name">{text}</div>

  const labelCls = ['fx', 'fx--label', `fx--on-${targetSide}`]
  if (outcome === 'STRONG') labelCls.push('is-big')
  if (outcome === 'LIMITED') labelCls.push('is-soft')
  if (outcome === 'MISS') labelCls.push('is-miss')

  const dmgCls = ['fx', 'fx--damage', `fx--on-${targetSide}`]
  if (outcome === 'STRONG') dmgCls.push('is-big')

  const isHit = outcome === 'STRONG' || outcome === 'NORMAL'
  return (
    <>
      {isHit && <div className={`hit-burst hit-burst--${targetSide}${outcome === 'STRONG' ? ' is-big' : ''}`} />}
      <div className={labelCls.join(' ')}>{text}</div>
      {showDamage && <div className={dmgCls.join(' ')}>-{damage}</div>}
    </>
  )
}
