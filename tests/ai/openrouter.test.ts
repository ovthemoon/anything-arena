import { describe, expect, test, vi } from 'vitest'
import { z } from 'zod'
import { createOpenRouter } from '../../src/worker/ai/openrouter'

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

describe('openrouter client', () => {
  test('chatJson parses message content with schema', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: '{"x":1}' } }] }))
    const or = createOpenRouter('k', fetchImpl)
    const out = await or.chatJson({ model: 'm', system: 's', user: 'u', schema: z.object({ x: z.number() }), jsonSchema: {}, timeoutMs: 1000 })
    expect(out).toEqual({ x: 1 })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(JSON.parse(init.body).response_format.type).toBe('json_schema')
  })

  test('chatJson throws on schema mismatch', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: '{"x":"no"}' } }] }))
    await expect(
      createOpenRouter('k', fetchImpl).chatJson({ model: 'm', system: 's', user: 'u', schema: z.object({ x: z.number() }), jsonSchema: {}, timeoutMs: 1000 }),
    ).rejects.toThrow()
  })

  test('chatJson throws on non-2xx with status only, no prompt leak', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('server error', { status: 500 }))
    await expect(
      createOpenRouter('k', fetchImpl).chatJson({ model: 'm', system: 'SECRET_SYSTEM', user: 'SECRET_USER', schema: z.object({ x: z.number() }), jsonSchema: {}, timeoutMs: 1000 }),
    ).rejects.toThrow(/500/)
    try {
      await createOpenRouter('k', fetchImpl).chatJson({ model: 'm', system: 'SECRET_SYSTEM', user: 'SECRET_USER', schema: z.object({ x: z.number() }), jsonSchema: {}, timeoutMs: 1000 })
    } catch (e) {
      expect(String((e as Error).message)).not.toContain('SECRET')
    }
  })

  test('speech posts to /audio/speech and returns bytes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
    const buf = await createOpenRouter('k', fetchImpl).speech({ model: 't', input: '안녕', timeoutMs: 1000 })
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 2, 3]))
    expect(fetchImpl.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/audio/speech')
  })
})
