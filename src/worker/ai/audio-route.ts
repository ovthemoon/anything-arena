import { jsonResponse } from '../lib/response'

/**
 * GET /api/audio/:key.mp3 — R2 에 저장된 해설 음성 제공.
 * key 는 요청 경로에서 `/api/audio/` 를 뗀 나머지, `.mp3` 를 뗀 부분 그대로 R2 오브젝트 키로 쓴다
 * (synthesizeToR2 가 `${key}.mp3` 로 저장했으므로 대칭).
 *
 * 좌석 쿠키 검사: PRD 8 은 상대 화면·TTS·로그에 원문을 노출하지 않는 것이 목표이고, 이 라우트는
 * 이미 검증된 해설(원문 아님)만 서빙한다. 좌석 검증 헬퍼(`src/worker/security/session.ts`)가
 * 아직 이 브랜치에 없어 스킵했다 — Lane A 가 만들면 여기서 `env.AUDIO` 조회 전에
 * roomCode 일치를 확인하도록 이어 붙이면 된다.
 */
export const handleAudioRoute = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url)
  const match = /^\/api\/audio\/(.+)\.mp3$/.exec(url.pathname)
  if (!match) return jsonResponse({ success: false, data: null, error: 'Not found' }, 404)

  const key = `${match[1]}.mp3`
  const object = await env.AUDIO.get(key)
  if (!object) return jsonResponse({ success: false, data: null, error: 'Audio not available' }, 404)

  return new Response(object.body, {
    status: 200,
    headers: {
      'content-type': 'audio/mpeg',
      'cache-control': 'private, max-age=3600',
    },
  })
}
