import { jsonResponse } from '../lib/response'

/**
 * GET /api/audio/:key.mp3 — R2 에 저장된 해설 음성 제공.
 * Lane C 가 구현한다. 지금은 404 스텁. 좌석 쿠키의 roomCode 가 key 의 매치와 일치할 때만 내려준다.
 */
export const handleAudioRoute = async (_request: Request, _env: Env): Promise<Response> =>
  jsonResponse({ success: false, data: null, error: 'Audio not available' }, 404)
