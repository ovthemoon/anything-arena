# Anything Arena

- 기획서: `docs/PRD_v0.1.md`. 모듈 경계는 부록 B, 설정값은 부록 C 를 따른다.
- 스택: React + Vite (`src/client`), Cloudflare Worker + Durable Object (`src/worker`), 공용 규칙 (`src/shared`).
- 원칙: AI 는 의미를 판단하고 서버 코드가 숫자(HP·피해·승패)를 결정한다. 모델 응답이 HP 를 직접 바꾸지 않는다.
- 비밀 키는 `.env`(로컬) / `wrangler secret`(배포). `src/client` 에서 키를 읽지 않는다.
- 검증: `npm run typecheck && npm test && npm run build`.
- `wrangler.jsonc` 를 바꾸면 `npm run types` 로 `worker-configuration.d.ts` 재생성.
