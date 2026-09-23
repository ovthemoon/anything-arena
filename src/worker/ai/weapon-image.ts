import type { PlayerSlot } from '../../shared/schemas/enums'
import type { WeaponProfile } from '../../shared/schemas/weapon'
import type { OpenRouterClient } from './openrouter'

export const IMAGE_TIMEOUT_MS = 8_000
export const IMAGE_ROUTE_PREFIX = '/api/images/'

/** 연출 설계 §5: 단일 물건, 정면, 두꺼운 외곽선, 한국 웹툰 톤, 순수 초록 배경(클라이언트가 오려냄), 글자 없음. */
export const buildWeaponImagePrompt = (profile: WeaponProfile): string =>
  [
    `A single object: "${profile.displayName}" (${profile.tagline}).`,
    'Front view, centered, one object only, no hands, no people, no text, no letters, no watermark.',
    'Korean comic webtoon style, thick bold black outlines, flat vivid colors, exaggerated and funny.',
    'Background must be solid pure green #00FF00 with nothing else.',
  ].join(' ')

const decodeDataUrl = (dataUrl: string): { bytes: Uint8Array; contentType: string } => {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl)
  if (!m) throw new Error('weapon image: unsupported data url')
  const bin = atob(m[2])
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { bytes, contentType: m[1] }
}

/**
 * 무기 그림 1장을 만들어 R2 에 저장하고 동일 출처 경로를 돌려준다.
 * 실패·타임아웃은 null. 전투 진행을 절대 막지 않는다.
 */
export const generateWeaponImageToR2 = async (
  or: OpenRouterClient,
  bucket: R2Bucket,
  model: string,
  profile: WeaponProfile,
  ctx: { matchId: string; slot: PlayerSlot },
): Promise<string | null> => {
  try {
    const dataUrl = await or.chatImage({ model, prompt: buildWeaponImagePrompt(profile), timeoutMs: IMAGE_TIMEOUT_MS })
    const { bytes, contentType } = decodeDataUrl(dataUrl)
    const key = `img/${ctx.matchId}-${ctx.slot}-${profile.version}.png`
    await bucket.put(key, bytes, { httpMetadata: { contentType } })
    return `${IMAGE_ROUTE_PREFIX}${key.slice('img/'.length)}`
  } catch (e) {
    console.warn('[ai/image] weapon image failed', String(e).slice(0, 120))
    return null
  }
}
