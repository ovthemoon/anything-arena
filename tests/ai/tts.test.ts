import { describe, expect, test, vi } from 'vitest'
import { synthesizeToR2 } from '../../src/worker/ai/tts'

describe('synthesizeToR2', () => {
  test('puts bytes into the bucket and returns the audio path on success', async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer
    const or = { chatJson: vi.fn(), speech: vi.fn().mockResolvedValue(bytes) }
    const put = vi.fn().mockResolvedValue(undefined)
    const bucket = { put } as unknown as R2Bucket

    const path = await synthesizeToR2(or as never, bucket, 'tts-model', 'voice-1', '해설 문장', 'm1-e1')

    expect(path).toBe('/api/audio/m1-e1.mp3')
    expect(put).toHaveBeenCalledWith('m1-e1.mp3', bytes, { httpMetadata: { contentType: 'audio/mpeg' } })
  })

  test('returns null when the speech call rejects', async () => {
    const or = { chatJson: vi.fn(), speech: vi.fn().mockRejectedValue(new Error('timeout')) }
    const bucket = { put: vi.fn() } as unknown as R2Bucket

    const path = await synthesizeToR2(or as never, bucket, 'tts-model', undefined, '해설 문장', 'm1-e2')

    expect(path).toBeNull()
    expect(bucket.put).not.toHaveBeenCalled()
  })
})
