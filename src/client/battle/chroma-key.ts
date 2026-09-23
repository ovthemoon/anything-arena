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

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** 알파가 0 보다 큰 픽셀의 경계 상자. 전부 투명이면 전체 캔버스. */
export const alphaBounds = (data: Uint8ClampedArray, width: number, height: number): Bounds => {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return { x: 0, y: 0, width, height }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/** 경계 상자를 정사각형 + 여백(비율)으로 넓힌다. 캔버스 밖으로 나가면 잘라낸다. */
const squareAround = (b: Bounds, width: number, height: number, pad: number): Bounds => {
  const side = Math.round(Math.max(b.width, b.height) * (1 + pad * 2))
  const cx = b.x + b.width / 2
  const cy = b.y + b.height / 2
  const x = Math.max(0, Math.round(cx - side / 2))
  const y = Math.max(0, Math.round(cy - side / 2))
  return { x, y, width: Math.min(side, width - x), height: Math.min(side, height - y) }
}

const CROP_PAD = 0.08

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
        const keyedData = keyOutGreen(src.data) as Uint8ClampedArray<ArrayBuffer>
        ctx.putImageData(new ImageData(keyedData, canvas.width, canvas.height), 0, 0)
        // 물건 부분만 정사각형으로 잘라내 스프라이트 상자를 꽉 채운다 (가로로 넓게 생성된 그림 대응)
        const crop = squareAround(alphaBounds(keyedData, canvas.width, canvas.height), canvas.width, canvas.height, CROP_PAD)
        const out = document.createElement('canvas')
        out.width = crop.width
        out.height = crop.height
        const octx = out.getContext('2d')
        if (!octx) return resolve(url)
        octx.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
        out.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : url), 'image/png')
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
