import type { OpenRouterClient } from './openrouter'

const TTS_TIMEOUT_MS = 2500

/**
 * 해설 텍스트를 음성으로 합성해 R2 에 저장한다.
 * 성공 시 클라이언트가 GET 할 경로(`/api/audio/${key}.mp3`), 실패·타임아웃(2.5초)이면 null.
 */
export const synthesizeToR2 = async (
  or: OpenRouterClient,
  bucket: R2Bucket,
  model: string,
  voice: string | undefined,
  text: string,
  key: string,
): Promise<string | null> => {
  try {
    const buf = await or.speech({ model, input: text, voice, timeoutMs: TTS_TIMEOUT_MS })
    await bucket.put(`${key}.mp3`, buf, { httpMetadata: { contentType: 'audio/mpeg' } })
    return `/api/audio/${key}.mp3`
  } catch {
    return null
  }
}
