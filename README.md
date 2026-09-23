# Anything Arena — 아무거나 무기 배틀

브라우저 1대1 파티 배틀. 기획서: [docs/PRD_v0.1.md](docs/PRD_v0.1.md)

## 구성

| 영역 | 위치 | 역할 |
|---|---|---|
| 화면 | `src/client/` | React + Vite. 시작·대기실·배틀·결과 |
| 서버 | `src/worker/` | Cloudflare Worker. API, WebSocket 라우팅, AI 호출 |
| 방 | `src/worker/rooms/battle-room.ts` | BattleRoom Durable Object (방 하나 = 객체 하나) |
| 공용 규칙 | `src/shared/` | 피해표, 설정값, 메시지 스키마 |
| 테스트 | `tests/` | vitest |

## 시작하기

```bash
npm install
cp .env.example .env     # AI 키 채우기 (없어도 서버는 뜸)
npm run dev              # http://localhost:5173
```

- 헬스체크: `GET /api/health`
- 키 설정 확인: `GET /api/ai/status` (값은 안 보여주고 있는지 여부만)
- WebSocket: `/ws/room/<방코드>`

## 검사

```bash
npm run typecheck
npm test
npm run build
```

## 배포 (Cloudflare Workers)

처음 한 번:

```bash
npx wrangler login
npx wrangler r2 bucket create anything-arena-audio
npx wrangler secret put OPENROUTER_API_KEY   # 쓰는 키마다 반복
```

배포:

```bash
npm run deploy
```

`main` 브랜치에 push 하면 GitHub Actions 가 자동 배포한다.
GitHub 저장소 Secrets 에 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` 를 넣어야 한다.

## 비밀 키 규칙

- 로컬: `.env` (git 제외). 배포: `wrangler secret put`.
- 키는 Worker 안에서만 읽는다. 브라우저 코드(`src/client`)에서 절대 참조하지 않는다.
- 공개 설정값(HP, 라운드 수, 모델명)은 `wrangler.jsonc` 의 `vars`.
