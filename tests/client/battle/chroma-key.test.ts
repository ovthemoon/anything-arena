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
