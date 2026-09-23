# TESTLOG

## 2026-09-23 — mock 모드, 브라우저 3탭 (localhost=중계, 127.0.0.1=A, LAN IP=B)

- 방 생성 → QR/링크 표시 → A·B 참가 → 프리셋 캐릭터로 무기 생성 → 준비 → 1라운드 시작(15초) ✅
- A 기술 버튼(국자 돌진) NORMAL 30, B 자유 입력("무관심한 표정으로…") STRONG 40 → 즉시 정산, HP A 60 / B 70, 해설 자막 중계 화면 표시 ✅
- 미입력 3라운드 → 기본 공격 30×3 → 무승부 10/10 → 재대결 → 새 경기 ✅
- 고친 버그: (1) React StrictMode 이중 참가 요청으로 좌석 A·B 가 한 브라우저에 잡히던 문제 → 참가 1회 보장 후 소켓 연결. (2) http://내부IP 는 비보안 컨텍스트라 `crypto.randomUUID` 없음 → `newId()` 대체. 휴대폰 LAN 접속 필수 수정.
- 남은 표시 문제: 결과 화면 "재대결 대기: A Y / B Y" 가 준비 플래그를 그대로 보여줌(서버 rematch 상태 미노출). 기능엔 영향 없음.
- 실제 AI: Jev(TypeSafe) 0.7초 STRONG 판정 확인. OpenRouter TTS `minimax/speech-2.8-turbo` + `Korean_SweetGirl` 2.2초 mp3 확인. Gemini TTS 는 PCM 전용이라 제외.
