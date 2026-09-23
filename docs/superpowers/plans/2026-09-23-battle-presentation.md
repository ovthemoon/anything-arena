# Battle Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DebugArena` 를 대체하는 실제 연출 화면(시작·대기실·배틀·결과)을 만든다. 고정 배경 위에 5자세 캐릭터, 떠 있는 무기, 3초 공격 재생, 4단계 결과 분기, 경고 연출.

**Architecture:** 모든 상태는 `useMatch()` 의 `ClientState` 에서만 읽고 `send` 로만 쓴다. 재생은 순수 함수 `buildAttackTimeline` 이 만든 단계 목록을 `usePlayback` 훅이 시간 순서로 넘기고, 스프라이트 컴포넌트는 "현재 단계" 만 보고 그린다. 로직 세션의 계약 변경(MISS·characterId·imageUrl)이 아직 main 에 없어도 동작하도록 느슨한 접근자(`characterIdFor`, `weaponImageUrlOf`)로 감싼다.

**Tech Stack:** React 19, CSS 애니메이션(라이브러리 없음), vitest(node env, `tests/**`), Canvas 2D(오려내기).

**Spec:** `docs/superpowers/specs/2026-09-23-battle-presentation-design.md`

## Global Constraints

- 건드리지 않는 것: `src/worker/**`, `src/shared/**`, `src/client/network/**`, `src/client/state/**`, `src/client/audio/**`, `wrangler.jsonc`. `DebugArena.tsx` 도 수정하지 않는다(다른 세션 작업 중).
- 입력은 `useMatch()` 의 `ClientState` 와 `send` 만. 서버 HP 값을 그대로 표시하고 클라이언트가 계산하지 않는다.
- 공격 1회 재생 ≈ 3000ms: 기술명 400 → 준비 300 → 이동 600 → 정지 80 → 결과 700 → 해설 900.
- 결과 분기: STRONG 40 / NORMAL 30 / LIMITED 20 / MISS 0 (스펙 §3.1).
- `prefers-reduced-motion` 이면 이동을 페이드로 대체. 흔들림 끄기 토글은 `localStorage('shake')`.
- 차단된 문장은 어떤 화면·음성에도 나오지 않는다. 경고는 고정 문구만.
- 테스트는 `tests/client/battle/*.test.ts` (vitest node env). DOM 이 필요한 컴포넌트는 `npm run typecheck && npm run build` 와 브라우저 확인으로 검증.

---

## 파일 구조

```
src/client/battle/characters.ts     roster, characterIdFor(player, slot), portraitStyle
src/client/battle/outcome.ts        effectivenessOf(attack), outcomeFx(outcome)
src/client/battle/timeline.ts       buildAttackTimeline(attack, reducedMotion) → PlaybackStep[]
src/client/battle/usePlayback.ts    usePlayback(playback) → { step, attack, index, done }
src/client/battle/chroma-key.ts     keyOutGreen(data, w, h), loadCutout(url) → Promise<string>
src/client/battle/CharacterSprite.tsx
src/client/battle/WeaponSprite.tsx
src/client/battle/Fx.tsx            만화 글씨·피해 숫자·잔상
src/client/battle/Hud.tsx           상단: 초상화·이름·tagline·HP·카드 칸·타이머
src/client/battle/ActionPanel.tsx   하단: 해설·기술 2개·자유 입력·공격
src/client/battle/animations.css
src/client/battle/usePrefs.ts       soundOn/shakeOn localStorage
src/client/screens/StartScreen.tsx  App.tsx 에서 추출
src/client/screens/LobbyScreen.tsx  캐릭터 선택·무기 입력·QR·선수 입장
src/client/screens/BattleScreen.tsx 배경+캐릭터+무기+Fx+Hud+(플레이어면)ActionPanel
src/client/screens/ResultScreen.tsx
src/client/screens/Arena.tsx        join 흐름 + 역할·phase 별 화면 선택
src/client/App.tsx                  /screen,/play → Arena; /debug/screen,/debug/play → DebugArena
public/assets/tag-<VisualTag>.svg   10개 실루엣
```

---

### Task 1: 출연진과 결과 매핑 (순수)

**Files:** Create `src/client/battle/characters.ts`, `src/client/battle/outcome.ts`; Test `tests/client/battle/characters.test.ts`, `tests/client/battle/outcome.test.ts`

**Produces:**
```ts
export type CharacterId = 'grandma' | 'jaemmin'
export type Pose = 'idle' | 'attack' | 'hit' | 'win' | 'lose'
export interface Character { id: CharacterId; name: string; blurb: string; portrait: { x: number; y: number; zoom: number } }
export const ROSTER: readonly Character[]
export const characterIdFor = (player: { characterId?: unknown; slot: PlayerSlot } | undefined, slot: PlayerSlot): CharacterId
export const poseUrl = (id: CharacterId, pose: Pose): string   // `/assets/characters/${id}/${pose}.png`

export type Outcome = 'STRONG' | 'NORMAL' | 'LIMITED' | 'MISS'
export const outcomeOf = (attack: { effectiveness: string; damage: number }): Outcome  // damage 0 → MISS
export interface OutcomeFx { targetPose: Pose; label: string; shakePx: number; shakeMs: number; showDamage: boolean; targetShift: { x: number; y: number } }
export const outcomeFx = (o: Outcome): OutcomeFx
export const weaponImageUrlOf = (weapon: { imageUrl?: unknown } | null | undefined): string | null
```

- [ ] 테스트 작성 → 실패 확인 → 구현 → 통과 → 커밋 `feat(client): roster and outcome mapping`

### Task 2: 타임라인과 재생 훅

**Files:** Create `src/client/battle/timeline.ts`, `src/client/battle/usePlayback.ts`; Test `tests/client/battle/timeline.test.ts`

**Produces:**
```ts
export type StepKind = 'name' | 'windup' | 'travel' | 'freeze' | 'result' | 'commentary'
export interface PlaybackStep { kind: StepKind; ms: number }
export const STEP_MS: Record<StepKind, number>  // 400,300,600,80,700,900
export const buildAttackTimeline = (reducedMotion: boolean): PlaybackStep[]  // reduced: travel 200, freeze 0
export const totalMs = (steps: PlaybackStep[]): number
// usePlayback(playback: RoundResolved | null): { index: 0|1|null; attack: AttackEvent|null; step: StepKind|null; done: boolean }
```
훅은 `playbackOrder` 순서로 attacks 를 골라 setTimeout 체인으로 단계를 넘긴다. `playback` 이 바뀌면(새 roundId) 처음부터. 언마운트·변경 시 타이머 정리.

- [ ] 타임라인 테스트(합계 2980, reduced 합계, 순서) → 구현 → 커밋 `feat(client): attack timeline + playback hook`

### Task 3: 초록 오려내기

**Files:** Create `src/client/battle/chroma-key.ts`; Test `tests/client/battle/chroma-key.test.ts`

**Produces:**
```ts
export const isKeyGreen = (r: number, g: number, b: number, tol = 40): boolean  // |r-0|,|g-255|,|b-0| ≤ tol
export const keyOutGreen = (data: Uint8ClampedArray, tol?: number): Uint8ClampedArray  // 새 배열 반환(불변)
export const loadCutout = (url: string): Promise<string>  // canvas → blob URL, 실패 시 url 그대로
```

- [ ] 픽셀 함수 테스트 → 구현 → 커밋 `feat(client): chroma key cutout`

### Task 4: 스프라이트·효과·CSS

**Files:** Create `CharacterSprite.tsx`, `WeaponSprite.tsx`, `Fx.tsx`, `animations.css`, `usePrefs.ts`

- `CharacterSprite({ id, pose, side: 'left'|'right', shift, shakePx, shakeMs })` — `<img>` 하나, side=right 면 `scaleX(-1)`, shift 는 transform translate, shake 는 CSS 변수로 keyframes.
- `WeaponSprite({ src, side, phase: 'float'|'windup'|'travel'|'return'|'hidden', animation: AnimationType, miss })` — float: 2.4s 부유 keyframes; windup: scale 1.3 + 떨림; travel: `--travel-x` 로 상대 쪽 이동(DASH 직선, PROJECTILE 포물선은 translateY keyframes, SHOCKWAVE 는 바닥 파동 div 추가, PSYCHIC 는 흐림+잔상); miss 면 목표 지나 화면 밖.
- `Fx({ kind: 'name'|'label'|'damage'|'none', text, big, side })` — 등장 keyframes.
- `usePrefs()` → `{ soundOn, shakeOn, setSoundOn, setShakeOn, reducedMotion }`.

- [ ] 작성 → `npm run typecheck` → 커밋 `feat(client): battle sprites and fx`

### Task 5: HUD 와 입력 패널

**Files:** Create `Hud.tsx`, `ActionPanel.tsx`

- `Hud({ players, you, roundId, seconds, characterIds })` — 양쪽 초상화(포즈 idle 의 머리 crop: `background-position` + zoom), 닉네임, tagline, HpBar 재사용 대신 자체 큰 바(700ms transition), 카드 칸 2개(fouls), 중앙 라운드/타이머.
- `ActionPanel({ me, match, rejected, commentaryText, collapsed, onTechnique, onFreeText })` — 기술 버튼 2개, 자유 입력(60자 카운트, presetOnly 면 잠금+안내), 공격 버튼, `rejected` 면 고정 안내(REWRITE: "표현을 바꿔주세요"). collapsed 면 높이 0.

- [ ] 작성 → typecheck → 커밋 `feat(client): hud and action panel`

### Task 6: 화면 4개와 라우팅

**Files:** Create `StartScreen.tsx`, `LobbyScreen.tsx`, `BattleScreen.tsx`, `ResultScreen.tsx`, `Arena.tsx`; Modify `src/client/App.tsx`

- `Arena({ roomCode, autoJoin })` — DebugArena 의 join 흐름을 옮겨 적음(같은 `joinInFlight` 패턴). `useMatch`, `usePrefs`, 해설 오디오(`createBrowserAudioManager`), foul 호루라기(`new Audio('/audio/whistle.mp3')` 실패 무시). phase 별: LOBBY/PREPARING → Lobby, ROUND_* → Battle, FINISHED → Result. SCREEN 역할은 입력 패널 없이.
- `LobbyScreen` — 초상화 선택(ROSTER), 닉네임·무기·설명 입력, `weapon_submit` 에 `{ nickname, character: 선택한 캐릭터의 blurb, weaponName, description }` (+ `characterId` 는 스키마에 생기면 추가), `ready`. PREPARING 이면 "선수 입장 중" 카드, 무기 카드 공개(이름·tagline·능력·약점·기술).
- `BattleScreen` — 배경(`/assets/arena-bg.png`, 없으면 CSS 그라디언트), 캐릭터 2, 무기 2, Fx, Hud, ActionPanel(플레이어만). `usePlayback(state.playback)` 의 step 으로 자세·무기·Fx 결정. 경고 카드 오버레이(foul 변화 감지).
- `ResultScreen` — win/lose 자세, 최고 피해 공격 텍스트, 재대결.
- `App.tsx` — StartScreen 추출, `/screen/:code` `/play/:code` → Arena, `/debug/screen/:code` `/debug/play/:code` → DebugArena.

- [ ] 작성 → `npm run typecheck && npm test && npm run build` → 브라우저에서 /screen 과 /play 두 탭으로 mock 경기 1판 → 커밋 `feat(client): presentation screens replace debug arena`

### Task 7: 실루엣 SVG 10개

**Files:** Create `public/assets/tag-{WET,ELECTRIC,SHAKY,FIRE,ICE,SHADOW,SHINY,SOFT,HEAVY,ABSTRACT}.svg`

- 단색 흰 실루엣 + 태그별 단순 도형(물방울·번개·파동·불꽃·얼음·그림자·별·구름·추·소용돌이). 무기 이미지 없을 때 `WeaponSprite` 가 사용.
- [ ] 작성 → 커밋 `feat(assets): visual tag silhouettes`
