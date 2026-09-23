/** 문자열을 32비트 정수 씨앗으로 (FNV-1a). */
const hashSeed = (s: string): number => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** 작은 결정적 난수기 (mulberry32). 같은 씨앗이면 같은 순서. */
const makeRandom = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const SUGGESTION_COUNT = 3

/**
 * 추천 한 마디 10개 중 몇 개만 보여준다. 씨앗(경기·라운드·좌석)이 같으면 새로고침해도
 * 같은 묶음이 나오고, "다른 거"를 누를 때마다 offset 이 올라가 다른 묶음이 된다. 입력은 바꾸지 않는다.
 */
export const pickSuggestions = <T>(items: readonly T[], seed: string, offset: number, count = SUGGESTION_COUNT): T[] => {
  if (items.length <= count) return [...items]
  const random = makeRandom(hashSeed(`${seed}#${offset}`))
  const order = items.map((item, i) => ({ item, key: random(), i })).sort((a, b) => a.key - b.key || a.i - b.i)
  return order.slice(0, count).map((o) => o.item)
}
