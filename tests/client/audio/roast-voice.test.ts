import { describe, expect, test } from 'vitest'
import { roastVoicePath } from '../../../src/client/audio/roast-voice'

const techniques = [
  { id: 'grandma-r1', name: '국물 회오리', actionText: '너 같은 건 순대국밥 국물에 말아 먹어도 간이 안 맞겠다', animation: 'SHOCKWAVE' as const },
  { id: 'grandma-r2', name: '국자 후려치기', actionText: '숙제는 했냐? 국자로 등짝 스매싱 들어간다', animation: 'DASH' as const },
]

describe('roastVoicePath', () => {
  test('maps an unedited suggested line to its pre-recorded file', () => {
    expect(roastVoicePath(techniques, '숙제는 했냐? 국자로 등짝 스매싱 들어간다')).toBe('/audio/roasts/grandma-r2.mp3')
  })
  test('ignores surrounding whitespace', () => {
    expect(roastVoicePath(techniques, '  숙제는 했냐? 국자로 등짝 스매싱 들어간다 ')).toBe('/audio/roasts/grandma-r2.mp3')
  })
  test('edited or free text has no recording', () => {
    expect(roastVoicePath(techniques, '숙제는 했냐? 국자로 등짝 스매싱!')).toBeNull()
  })
  test('no techniques (weapon not loaded) → null', () => {
    expect(roastVoicePath(undefined, '숙제는 했냐? 국자로 등짝 스매싱 들어간다')).toBeNull()
  })
})
