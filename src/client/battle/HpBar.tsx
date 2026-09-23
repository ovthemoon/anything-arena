interface HpBarProps {
  label: string
  hp: number
  maxHp?: number
}

/** Minimal HP bar. Width transitions on change; server HP value is shown as-is, no client math. */
export function HpBar({ label, hp, maxHp = 100 }: HpBarProps) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const color = pct > 30 ? '#4caf50' : '#e53935'

  return (
    <div style={{ marginBottom: 8 }}>
      <div>
        {label}: {hp} HP
      </div>
      <div style={{ background: '#333', width: 200, height: 12 }}>
        <div style={{ background: color, width: `${pct}%`, height: '100%', transition: 'width .6s' }} />
      </div>
    </div>
  )
}
