import { jsonResponse } from '../lib/response'

/** GET /api/images/:name.png — R2 `img/<name>.png` 제공. 검증된 생성물만 있으므로 좌석 검사 없음. */
export const handleImageRoute = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url)
  const match = /^\/api\/images\/([A-Za-z0-9._-]+\.png)$/.exec(url.pathname)
  if (!match) return jsonResponse({ success: false, data: null, error: 'Not found' }, 404)
  const object = await env.AUDIO.get(`img/${match[1]}`)
  if (!object) return jsonResponse({ success: false, data: null, error: 'Image not available' }, 404)
  return new Response(object.body, {
    status: 200,
    headers: { 'content-type': object.httpMetadata?.contentType ?? 'image/png', 'cache-control': 'private, max-age=86400' },
  })
}
