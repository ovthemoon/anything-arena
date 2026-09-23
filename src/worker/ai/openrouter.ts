import type { z } from 'zod'

export interface ChatJsonOptions<T> {
  model: string
  system: string
  user: string
  schema: z.ZodType<T>
  jsonSchema: object
  timeoutMs: number
}

export interface SpeechOptions {
  model: string
  input: string
  voice?: string
  timeoutMs: number
}

const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'
const SPEECH_URL = 'https://openrouter.ai/api/v1/audio/speech'

/**
 * 얇은 OpenRouter 클라이언트. 프롬프트 원문은 어떤 에러 메시지에도 포함하지 않는다.
 * (상태 코드만 노출 — PRD 8, CLAUDE.md 키/원문 비노출 원칙과 동일한 취지)
 */
export const createOpenRouter = (apiKey: string, fetchImpl: typeof fetch = fetch) => {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://anything-arena.workers.dev',
    'X-Title': 'Anything Arena',
  }

  const chatJson = async <T>(opts: ChatJsonOptions<T>): Promise<T> => {
    const res = await fetchImpl(CHAT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: opts.model,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'output', strict: true, schema: opts.jsonSchema },
        },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs),
    })
    if (!res.ok) throw new Error(`openrouter chat failed: status ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`)
    const body = (await res.json()) as { choices: Array<{ message: { content: string } }> }
    const content = body.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('openrouter chat failed: missing content')
    const parsed: unknown = JSON.parse(content)
    return opts.schema.parse(parsed)
  }

  const speech = async (opts: SpeechOptions): Promise<ArrayBuffer> => {
    const res = await fetchImpl(SPEECH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: opts.model,
        input: opts.input,
        ...(opts.voice ? { voice: opts.voice } : {}),
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(opts.timeoutMs),
    })
    if (!res.ok) throw new Error(`openrouter speech failed: status ${res.status}`)
    return res.arrayBuffer()
  }

  /**
   * 이미지 출력 모델을 chat/completions 로 호출해 data URL 을 돌려준다.
   * 응답 위치: choices[0].message.images[0].image_url.url (연출 설계 §5 측정 규격).
   */
  const chatImage = async (opts: { model: string; prompt: string; timeoutMs: number }): Promise<string> => {
    const res = await fetchImpl(CHAT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: opts.model,
        messages: [{ role: 'user', content: opts.prompt }],
        modalities: ['image', 'text'],
        // 정사각형: 16:9 로 나오면 물건이 작게 잡힌다 (연출 세션 요청)
        image_config: { aspect_ratio: '1:1' },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs),
    })
    if (!res.ok) throw new Error(`openrouter image failed: status ${res.status}`)
    const body = (await res.json()) as { choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }> }
    const url = body.choices?.[0]?.message?.images?.[0]?.image_url?.url
    if (typeof url !== 'string' || !url.startsWith('data:image/')) throw new Error('openrouter image failed: no image')
    return url
  }

  return {
    chatImage, chatJson, speech }
}

export type OpenRouterClient = ReturnType<typeof createOpenRouter>
