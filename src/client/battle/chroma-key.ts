const DEFAULT_TOLERANCE = 40

/** 순수 초록(#00FF00) 근방인지. 허용치는 채널별 절대 차이. */
export const isKeyGreen = (r: number, g: number, b: number, tol = DEFAULT_TOLERANCE): boolean =>
  r <= tol && g >= 255 - tol && b <= tol

/** RGBA 배열에서 초록 픽셀의 알파를 0 으로. 새 배열을 돌려주고 입력은 건드리지 않는다. */
export const keyOutGreen = (data: Uint8ClampedArray, tol = DEFAULT_TOLERANCE): Uint8ClampedArray<ArrayBuffer> => {
  const out = new Uint8ClampedArray(new ArrayBuffer(data.length))
  out.set(data)
  for (let i = 0; i + 3 < out.length; i += 4) {
    if (isKeyGreen(out[i], out[i + 1], out[i + 2], tol)) out[i + 3] = 0
  }
  return out
}

const cutoutCache = new Map<string, Promise<string>>()

/**
 * 생성된 무기 그림(초록 배경)을 투명 PNG 의 blob URL 로 바꾼다.
 * canvas 접근이 막히거나(다른 출처) 실패하면 원본 URL 을 그대로 돌려준다.
 */
export const loadCutout = (url: string): Promise<string> => {
  const cached = cutoutCache.get(url)
  if (cached) return cached

  const job = new Promise<string>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(url)
        ctx.drawImage(img, 0, 0)
        const src = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const keyed = new ImageData(keyOutGreen(src.data) as Uint8ClampedArray<ArrayBuffer>, canvas.width, canvas.height)
        ctx.putImageData(keyed, 0, 0)
        canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : url), 'image/png')
      } catch {
        resolve(url)
      }
    }
    img.onerror = () => resolve(url)
    img.src = url
  })
  cutoutCache.set(url, job)
  return job
}
