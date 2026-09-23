import { describe, expect, test } from 'vitest'
import { isKeyGreen, keyOutGreen } from '../../../src/client/battle/chroma-key'

describe('isKeyGreen', () => {
  test('pure green and near-green are keyed, other colors are not', () => {
    expect(isKeyGreen(0, 255, 0)).toBe(true)
    expect(isKeyGreen(20, 240, 30)).toBe(true)
    expect(isKeyGreen(120, 200, 120)).toBe(false)
    expect(isKeyGreen(255, 255, 255)).toBe(false)
    expect(isKeyGreen(0, 0, 0)).toBe(false)
  })
})

describe('keyOutGreen', () => {
  test('sets alpha to 0 on green pixels and returns a new array', () => {
    const input = new Uint8ClampedArray([0, 255, 0, 255, 200, 30, 30, 255])
    const out = keyOutGreen(input)
    expect(out).not.toBe(input)
    expect(Array.from(out)).toEqual([0, 255, 0, 0, 200, 30, 30, 255])
    expect(Array.from(input)).toEqual([0, 255, 0, 255, 200, 30, 30, 255])
  })
})

import { alphaBounds } from '../../../src/client/battle/chroma-key'

describe('alphaBounds', () => {
  test('returns the bounding box of non-transparent pixels', () => {
    // 4x3 image, opaque pixels at (1,1) and (2,1)
    const w = 4
    const h = 3
    const data = new Uint8ClampedArray(w * h * 4)
    const set = (x: number, y: number) => {
      data[(y * w + x) * 4 + 3] = 255
    }
    set(1, 1)
    set(2, 1)
    expect(alphaBounds(data, w, h)).toEqual({ x: 1, y: 1, width: 2, height: 1 })
  })

  test('fully transparent image falls back to the whole canvas', () => {
    expect(alphaBounds(new Uint8ClampedArray(2 * 2 * 4), 2, 2)).toEqual({ x: 0, y: 0, width: 2, height: 2 })
  })
})
