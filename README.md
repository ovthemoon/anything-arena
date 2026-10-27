# Anything Arena — 아무말 대난투

Claude Build Day에서 제작한 1대1 AI 웹 게임입니다. 자유 문장으로 공격하면 AI가 의미와 효과를 판정하고, 서버 규칙이 피해량, HP와 승패를 결정합니다.

[직접 플레이](https://anything-arena.ohmygame2024.workers.dev/)

## 구성

| 영역 | 위치 | 역할 |
|---|---|---|
| 화면 | `src/client/` | React + Vite, 캐릭터 선택, 대기실, 배틀과 결과 |
| 서버 | `src/worker/` | Cloudflare Worker, API, WebSocket과 AI 호출 |
| 방 | `src/worker/rooms/battle-room.ts` | 방별 상태를 관리하는 Durable Object |
| 공통 규칙 | `src/shared/` | 메시지 스키마와 피해량, 라운드 규칙 |
| 테스트 | `tests/` | Vitest 테스트 |

## 로컬 실행

```bash
npm ci
cp .env.example .env
npm run dev
```

`.env.example`은 빈 키와 로컬 예시 설정만 포함합니다. 기본 `AI_MODE=mock`에서는 실제 AI 키 없이 실행할 수 있습니다. 실제 AI 호출은 필요한 키를 `.env`에 넣고 `AI_MODE=real`로 바꿉니다.

중계 화면에서 방을 만들고 두 참가자가 코드로 접속하거나, 시작 화면에서 AI 대전을 선택합니다.

## 검사

```bash
npm test
npm run typecheck
npm run build
```

## 배포

Cloudflare 계정에 로그인하고 R2 버킷 `anything-arena-audio`를 준비합니다. `OPENROUTER_API_KEY`, `TYPESAFE_API_KEY`, `SESSION_SECRET`은 `wrangler secret put`으로 등록합니다. `SESSION_SECRET`에는 로컬 예시 값 대신 충분히 긴 난수를 사용합니다.

```bash
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put TYPESAFE_API_KEY
npx wrangler secret put SESSION_SECRET
npm run deploy
```

GitHub의 `main` 푸시는 테스트와 빌드를 검사합니다. Actions에서 수동 배포하려면 저장소 Secrets에 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`를 설정하고 워크플로를 직접 실행합니다.

## 비밀정보 관리

- 실제 `.env`, `.dev.vars`, 인증서, 로컬 배포 캐시와 빌드 산출물은 Git에서 제외합니다.
- API 키는 Worker에서만 읽고 브라우저 코드에 넣지 않습니다.
- 공개 설정은 `wrangler.jsonc`, 배포 비밀값은 Cloudflare Secrets로 구분합니다.

기획과 검증 기록은 [docs/README.md](docs/README.md)에서 볼 수 있습니다.
