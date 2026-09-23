# 전투 연출 설계 (Battle Presentation) — 2026-09-23

**범위:** 배틀·대기실·결과 화면의 시각·청각 연출. 로직(서버·판정·엔진)은 다루지 않으며, 로직에 필요한 계약 변경만 §7 에 적는다.
**근거:** `docs/PRD_v0.1.md` §3, §7, §8, §9, §11. 충돌 시 이 문서가 연출을, PRD 가 규칙을 우선한다.
**결정 이력:** 이 세션의 브레인스토밍에서 확정. 이미지 생성 속도 실험 결과는 §5.

---

## 1. 핵심 결정

| 항목 | 결정 | 버린 대안 |
|---|---|---|
| 배경 | 고정 한 장 (`public/assets/arena-bg.png`, 16:9) | 무기 태그별 선택, 경기마다 생성 |
| 캐릭터 | 고정 출연진. 인물당 5자세 PNG (idle·attack·hit·win·lose), 투명 배경 | 실시간 생성 |
| 캐릭터 배정 | 대기실에서 플레이어가 초상화를 보고 선택 | AI 배정, 무작위 |
| 무기 그림 | 무기 입력 직후 준비 단계에서 1장 실시간 생성 | 공격마다 생성, 미리 제작 |
| 무기 위치 | 캐릭터 어깨 옆에 떠 있다가 공격 때 상대에게 날아감 | 손에 합성, 공격 때만 등장 |
| 판정 결과 | 정통 40 / 일반 30 / 막아냄 20 / **빗나감 0** | 3단계만, 상태 불능 추가 |
| 경고 음성 | 미리 녹음한 고정 음성. TTS 는 해설에만 | 경고까지 TTS |

---

## 2. 화면의 층 (뒤 → 앞)

1. **배경** — 고정 이미지. `object-fit: cover`.
2. **캐릭터** — A 는 왼쪽, B 는 오른쪽. 오른쪽은 `transform: scaleX(-1)`. 5자세 중 하나를 상태에 따라 교체. 원본은 800×800 투명 PNG, 화면 높이의 약 55% 로 표시. 발 위치(캔버스 88%)를 바닥선에 맞춘다.
3. **무기** — 생성된 정사각 그림을 캐릭터 어깨 높이 바깥쪽에 캐릭터 높이의 약 30% 크기로 띄운다. 대기 중 2.4초 주기로 ±6px 부유. 생성 실패 시 `visualTag` 별 범용 실루엣 아이콘(`public/assets/tag-<TAG>.svg`).
4. **효과** — 만화 글씨(쾅!·막았다!·휙!), 피해 숫자, 유형별 잔상. 전부 공통 재료(CSS·SVG). 무기 그림별 전용 효과 없음.
5. **HUD** — 위: 초상화(idle 의 머리 부분 crop)·이름·한 줄 설정(tagline)·체력 바·라운드/타이머·반칙 카드 칸 2개. 아래: 해설 자막 1줄, 기술 버튼 2개, 자유 입력창(60자), 공격 버튼. 재생 중엔 아래 영역을 접는다.

---

## 3. 공격 한 번의 재생 (≈3초)

`round_resolved` 의 두 `AttackEvent` 를 순서대로 재생한다. 서버 값이 기준이며 화면은 그 값을 뒤늦게 보여줄 뿐이다.

| 구간 | 시간 | 장면 |
|---|---|---|
| 기술명 | 0.0–0.4s | 기술명(`techniqueName` 또는 자유 입력 요약)이 화면 중앙에 크게 등장 후 위로 축소 |
| 준비 | 0.4–0.7s | 공격자 `attack` 자세로 교체. 무기가 1.3배로 커지며 떨림 |
| 이동 | 0.7–1.3s | 무기가 상대에게 이동. `animation` 별 궤적: DASH 직선 돌파(공격자도 20% 전진), PROJECTILE 포물선, SHOCKWAVE 바닥 원형 파동, PSYCHIC 화면 노이즈·잔상 |
| 충돌 정지 | 1.3s | 80ms 전체 정지 (`animation-play-state: paused`) |
| 결과 | 1.4–2.1s | §3.1 분기 |
| 해설 | 2.1–3.0s | `commentary_ready` 자막 표시, 오디오 있으면 재생. 무기는 주인 옆으로 복귀. 캐릭터 자세 `idle` 로 |

두 번째 공격 재생이 끝나야 다음 라운드 입력 영역이 펼쳐진다. 늦게 온 `commentary_ready` 는 `validUntil` 을 지나면 자막만 짧게 표시하고 음성은 버린다.

### 3.1 결과 분기

| effectiveness | 피격자 자세 | 글씨 | 흔들림 | 피해 숫자 | 체력 바 |
|---|---|---|---|---|---|
| STRONG (40) | hit | 쾅! (크게) | 강 (8px, 300ms) | 크게, 붉게 | 700ms 감소 |
| NORMAL (30) | hit | 쾅! | 중 (5px, 250ms) | 보통 | 700ms 감소 |
| LIMITED (20) | idle + 뒤로 40px 밀림 | 막았다! | 약 (2px, 150ms) | 작게 | 700ms 감소 |
| MISS (0) | idle + 옆으로 60px 미끄러짐 | 휙! | 없음 | 표시 안 함 | 변화 없음 |

MISS 는 무기가 피격자 자리를 지나쳐 화면 밖으로 나간 뒤 복귀한다.

---

## 4. 대기실·선수 입장·결과

**대기실:** 출연진 초상화 가로 나열(`characters.ts` 의 roster). 선택하면 내 자리에 idle 자세가 서고, 상대는 선택 전까지 실루엣. 그 아래 닉네임·무기 입력. 상대의 미검사 입력은 보이지 않는다.

**선수 입장 (PREPARING):** 무기 제출 후 "선수 입장 중" 카드. 서버는 설정 생성과 무기 그림 생성을 병렬로 돌린다(§5). 두 플레이어 모두 완료되거나 8초가 지나면 무기 카드가 뒤집히며 그림·이름·능력·약점·기술 2개 공개. 그림이 없으면 실루엣 아이콘.

**결과 (FINISHED):** 승자 `win`, 패자 `lose`, 무승부는 둘 다 `idle`. 최고 피해 공격 1건을 상단에 작게 재생(§3 의 축소판, 1.5초). 재대결 버튼.

**경고 연출 (`foul_warning`, `input_rejected`):**
- FOUL 1회: 본인 화면 상단에서 노란 카드가 내려오고 호루라기 고정 음성. 입력창 원문은 유지되어 남은 시간 안에 수정 가능. 상대 화면에도 노란 카드는 표시하되 원문·사유는 없다. HUD 카드 칸 1개 점등.
- FOUL 2회 (`presetOnly: true`): 카드 칸 2개 점등, 자유 입력창 잠금, "이번 경기는 준비된 기술만 사용할 수 있습니다". 기술 버튼 2개 유지.
- REWRITE: 카드 없음. 본인에게만 "표현을 바꿔주세요". 상대에게 아무것도 없음.
- UNCERTAIN·시스템 실패 (`fallbackReason`): 경고 없이 기본 공격. "연결 지연으로 기본 공격을 사용했습니다" 2초 토스트.

고정 음성 3개: `public/audio/whistle.mp3`, `foul.mp3`("삐익! 인신공격 반칙입니다. 무기로 승부하세요."), `round-start.mp3`. 차단된 문장은 어떤 음성으로도 읽지 않는다.

**접근성:** 흔들림 끄기 토글(로컬 저장), 자막 항상 표시, `prefers-reduced-motion` 이면 이동 연출을 페이드로 대체하고 정지 프레임을 유지.

---

## 5. 무기 그림 생성 (측정 근거)

2026-09-23 같은 프롬프트("젖은 양말 격투 캐릭터, 순수 초록 배경")로 모델별 2회 측정. 본문 수신 완료까지의 벽시계 시간.

| 모델 | 경로 | 시간 | 장당 비용 | 판단 |
|---|---|---|---|---|
| google/gemini-3.1-flash-lite-image | OpenRouter | 4.5–4.7s | $0.034 | **채택**. 초록 배경 정확, 톤 적합 |
| google/gemini-2.5-flash-image | OpenRouter | 6.5–6.8s | $0.039 | 예비. 배경색 부정확 |
| google/gemini-3.1-flash-image | OpenRouter | 11–12s | $0.067 | 탈락(느림) |
| openai/gpt-5-image-mini | OpenRouter | 46–48s | $0.043 | 탈락 |
| @cf/black-forest-labs/flux-1-schnell | Workers AI | 7.7–14s | ≈0 | 탈락(품질) |
| @cf/bytedance/stable-diffusion-xl-lightning | Workers AI | 5–6s | ≈0 | 탈락(프롬프트 무시) |

**호출 규격:** `POST https://openrouter.ai/api/v1/chat/completions`, `modalities: ["image","text"]`, 응답 `choices[0].message.images[0].image_url.url` (data URL). 정사각 비율 지정. 프롬프트는 "단일 물건, 정면, 두꺼운 외곽선, 한국 웹툰 톤, 순수 #00FF00 배경, 글자 없음". 결과는 R2 에 저장하고 경로만 클라이언트로.
**오려내기:** 클라이언트가 `<canvas>` 에서 #00FF00 근방(허용치 ±40)을 투명 처리해 `ImageBitmap` 으로 캐시. 실패해도 원본을 그대로 보여준다.
**예산:** 생성 8초 제한(PRD §10). 초과·실패 시 `imageUrl: null` → 실루엣 아이콘. 경기당 2장 ≈ $0.07.

---

## 6. 파일 계약 (이 세션이 만드는 것)

```
public/assets/arena-bg.png                      고정 배경 (ChatGPT 제작, 16:9)
public/assets/characters/<id>/{idle,attack,hit,win,lose}.png   800×800 투명
public/assets/tag-<VisualTag>.svg               무기 그림 실패 시 실루엣
public/audio/{whistle,foul,round-start}.mp3     고정 음성
src/client/battle/characters.ts                 roster: id·표시명·초상화 crop 좌표
src/client/battle/AttackPlayback.tsx            §3 타임라인
src/client/battle/WeaponSprite.tsx              부유·비행·복귀
src/client/battle/CharacterSprite.tsx           자세 교체·흔들림·밀림
src/client/battle/Fx.tsx                        만화 글씨·피해 숫자·잔상
src/client/battle/chroma-key.ts                 초록 제거
src/client/battle/animations.css
src/client/screens/{Start,Lobby,Battle,Result}Screen.tsx
```

현재 roster: `grandma`(욕쟁이 할머니), `jaemmin`(이잼민). 출연진 추가는 폴더 1개와 roster 항목 1개.

**건드리지 않는 것:** `src/worker/**`, `src/shared/**`, `src/client/network/**`, `src/client/state/**`, `src/client/audio/**`, `wrangler.jsonc`. 입력은 `useMatch()` 의 `ClientState` 와 `send` 만 쓴다.

---

## 7. 로직 세션에 요청하는 계약 변경

1. **`Effectiveness` 에 `MISS` 추가**, `damageFor(MISS) = 0`. `Damage` 타입에 0 포함. Jev 프롬프트·판정 스키마도 4단계로.
2. **`WeaponInput.characterId`** 추가: `z.enum(['grandma','jaemmin'])` (roster 는 `src/shared/schemas/enums.ts` 의 `CharacterId` 로 노출). `character` 자유 문장은 유지해도 되지만 설정 생성 프롬프트에 roster 의 고정 설명을 넣는다. `PublicPlayer` 에 `characterId` 노출.
3. **`WeaponProfile.imageUrl: string | null`** 추가. 서버가 생성·R2 저장 후 동일 출처 경로(`/api/assets/weapon/<matchId>/<slot>.png` 류)만 내려보낸다.
4. **`AiAdapters.generateWeaponImage(profile, ctx): Promise<string | null>`** 추가. `generateWeapon` 과 병렬 호출, 8초 타임아웃, 실패 시 null. 모델·호출 규격은 §5.
5. **에셋 계약 교체:** Lane D 의 `scripts/gen-assets.mjs` 와 16장 PNG 계획은 폐기. §6 의 경로로 대체.

경고·해설·TTS 계약(`foul_warning`, `input_rejected`, `commentary_ready`)은 현재 그대로 사용한다.
