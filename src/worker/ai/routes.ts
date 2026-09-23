import { jsonResponse } from '../lib/response'

/**
 * AI 관련 API (/api/ai/*)
 *
 * 외부 AI 키는 브라우저로 절대 내려보내지 않고 Worker 안에서만 읽는다.
 * 실제 어댑터(Jev·설정 생성·해설·TTS)는 이 폴더에 파일별로 추가한다.
 *
 *   GET /api/ai/status → 어떤 키가 설정돼 있는지 (값은 노출하지 않음)
 */
export const handleAiRoute = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url)

  if (url.pathname === '/api/ai/status' && request.method === 'GET') {
    return jsonResponse({
      success: true,
      data: {
        openrouter: Boolean(env.OPENROUTER_API_KEY),
        typesafe: Boolean(env.TYPESAFE_API_KEY),
        google: Boolean(env.GOOGLE_AI_API_KEY),
        openai: Boolean(env.OPENAI_API_KEY),
        anthropic: Boolean(env.ANTHROPIC_API_KEY),
        elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
        replicate: Boolean(env.REPLICATE_API_TOKEN),
        stability: Boolean(env.STABILITY_API_KEY),
        workersAi: Boolean(env.AI),
      },
      error: null,
    })
  }

  return jsonResponse({ success: false, data: null, error: 'Not found' }, 404)
}
