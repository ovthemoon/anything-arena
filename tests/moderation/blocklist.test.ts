import { describe, expect, test } from 'vitest'
import { hitsBlocklist, normalize } from '../../src/worker/moderation/blocklist'

describe('blocklist', () => {
  test('detects choseong slang', () => {
    expect(hitsBlocklist('ㅅㅂ')).toBe(true)
  })
  test('detects spaced-out slurs after normalization', () => {
    expect(hitsBlocklist('씨 발')).toBe(true)
  })
  test('detects direct family insult', () => {
    expect(hitsBlocklist('니엄마')).toBe(true)
  })
  test('does not false-positive on innocuous phrases containing 엄마', () => {
    expect(hitsBlocklist('엄마의 잠깐 와봐')).toBe(false)
  })
  test('does not false-positive on unrelated weapon names', () => {
    expect(hitsBlocklist('젖은 양말')).toBe(false)
  })
  test('normalize strips spaces and punctuation', () => {
    expect(normalize('씨. 발!')).toContain('씨발')
  })
})
