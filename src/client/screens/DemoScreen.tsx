import { useEffect, useState } from 'react'
import type { AnimationType, Effectiveness, PlayerSlot } from '../../shared/schemas/enums'
import type { AttackEvent, PublicMatchState, RoundResolved } from '../../shared/schemas/match'
import type { WeaponProfile } from '../../shared/schemas/weapon'
import type { ClientState } from '../state/match-reducer'
import { usePlayback } from '../battle/usePlayback'
import { usePrefs } from '../battle/usePrefs'
import { totalMs, buildAttackTimeline } from '../battle/timeline'
import { BattleScreen } from './BattleScreen'
import { ResultScreen } from './ResultScreen'
import '../battle/animations.css'
import '../battle/ui.css'
import './screens.css'

/**
 * /demo — 서버 없이 연출만 반복 재생하는 미리보기. /demo?result 는 결과 화면.
 * 네 가지 결과(정통·일반·막아냄·빗나감)와 네 가지 이동 유형을 돌아가며 보여준다.
 */

const DAMAGE: Record<Effectiveness, 0 | 20 | 30 | 40> = { MISS: 0, LIMITED: 20, NORMAL: 30, STRONG: 40 }
const ANIMATIONS: AnimationType[] = ['DASH', 'PROJECTILE', 'SHOCKWAVE', 'PSYCHIC']
const OUTCOMES: Effectiveness[] = ['STRONG', 'MISS', 'NORMAL', 'LIMITED']
const LOOP_GAP_MS = 1200

const weapon = (id: string, name: string, tag: WeaponProfile['visualTag']): WeaponProfile => ({
  id,
  version: 1,
  characterName: '',
  displayName: name,
  tagline: `${name}의 위엄`,
  capabilities: ['휘두르기'],
  weakness: '엄마·숙제·용돈, 학원·시험, 틀딱 소리',
  visualTag: tag,
  techniques: [
    { id: 't1', name: '기술 1', actionText: 'a', animation: 'DASH' },
    { id: 't2', name: '기술 2', actionText: 'b', animation: 'DASH' },
  ],
  characterId: null,
  imageUrl: null,
})

const attack = (n: number, actor: PlayerSlot, effectiveness: Effectiveness, animation: AnimationType): AttackEvent => ({
  eventId: `demo-${n}-${actor}`,
  actor,
  target: actor === 'A' ? 'B' : 'A',
  techniqueLabel: actor === 'A' ? '국물 회오리' : '얼음 블록 투척',
  approvedActionText: actor === 'A' ? '숙제는 했냐? 국자로 등짝 스매싱 들어간다' : '응? 할머니 그거 요즘 아무도 안 씀 ㅋㅋ',
  effectiveness,
  damage: DAMAGE[effectiveness],
  animation,
  cosmeticTags: [],
  reasonCode: 'NORMAL',
})

const makeRound = (n: number): RoundResolved => {
  const a = attack(n, 'A', OUTCOMES[n % OUTCOMES.length], ANIMATIONS[n % ANIMATIONS.length])
  const b = attack(n, 'B', OUTCOMES[(n + 2) % OUTCOMES.length], ANIMATIONS[(n + 1) % ANIMATIONS.length])
  return {
    type: 'round_resolved',
    matchId: 'demo',
    roundId: (n % 3) + 1,
    eventSeq: n,
    rulesetVersion: 'demo',
    hpBefore: { A: 100, B: 100 },
    hpAfter: { A: 100 - b.damage, B: 100 - a.damage },
    attacks: [a, b],
    playbackOrder: n % 2 === 0 ? ['A', 'B'] : ['B', 'A'],
    resolvedAt: Date.now(),
  }
}

const makeMatch = (round: RoundResolved): PublicMatchState => ({
  roomCode: 'DEMO',
  matchId: 'demo',
  phase: 'ROUND_PLAYBACK',
  roundId: round.roundId,
  deadlineAt: null,
  players: {
    A: { slot: 'A', nickname: '할매', connected: true, ready: true, weapon: weapon('wa', '국자', 'HEAVY'), hp: round.hpAfter.A ?? 100, actionStatus: 'ACCEPTED', fouls: 1, presetOnly: false, characterId: 'grandma' },
    B: { slot: 'B', nickname: '잼민', connected: true, ready: true, weapon: weapon('wb', '얼음블록', 'ICE'), hp: round.hpAfter.B ?? 100, actionStatus: 'ACCEPTED', fouls: 0, presetOnly: false, characterId: 'jaemmin' },
  },
  history: [],
  winner: null,
  eventSeq: round.eventSeq,
  rulesetVersion: 'demo',
})

export function DemoScreen() {
  const prefs = usePrefs(false)
  const [n, setN] = useState(0)
  const round = makeRound(n)
  const playback = usePlayback(round, prefs.reducedMotion)

  useEffect(() => {
    const loop = totalMs(buildAttackTimeline(prefs.reducedMotion)) * 2 + LOOP_GAP_MS
    const t = window.setTimeout(() => setN((k) => k + 1), loop)
    return () => window.clearTimeout(t)
  }, [n, prefs.reducedMotion])

  const isResultPreview = window.location.search.includes('result')
  const match = makeMatch(round)
  const state: ClientState = {
    connection: 'open',
    you: 'SCREEN',
    match: isResultPreview ? { ...match, phase: 'FINISHED', winner: 'A', history: [round] } : match,
    playback: round,
    commentary: {
      [round.attacks[0].eventId]: { text: '충전 단자까지 젖었습니다!', audioPath: null, validUntil: Date.now() + 60_000 },
      [round.attacks[1].eventId]: { text: '얼음이 국자를 스쳐 지나갑니다!', audioPath: null, validUntil: Date.now() + 60_000 },
    },
    toast: null,
    lastActionId: null,
    rejected: null,
  }

  if (isResultPreview) {
    return <ResultScreen state={state} you={null} characterIds={{ A: 'grandma', B: 'jaemmin' }} send={() => undefined} />
  }

  return (
    <div style={{ position: 'relative' }}>
      <BattleScreen state={state} you={null} playback={playback} resolved={round} seconds={null} characterIds={{ A: 'grandma', B: 'jaemmin' }} prefs={prefs} stageWidth={window.innerWidth} send={() => undefined} />
      <div className="toast" style={{ top: 'auto', bottom: 8, fontSize: 12 }}>
        demo #{n} · {round.attacks[0].effectiveness}/{round.attacks[0].animation} → {round.attacks[1].effectiveness}/{round.attacks[1].animation}
      </div>
    </div>
  )
}
