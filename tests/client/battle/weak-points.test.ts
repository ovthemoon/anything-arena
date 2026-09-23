import { describe, expect, test } from 'vitest'
import { splitWeakPoints } from '../../../src/client/battle/weak-points'

describe('splitWeakPoints', () => {
  test('splits a comma list and trims each piece', () => {
    expect(splitWeakPoints(' 요즘 것들·MZ 말투, 무릎·허리 ,스마트폰·키오스크')).toEqual(['요즘 것들·MZ 말투', '무릎·허리', '스마트폰·키오스크'])
  })
  test('returns empty for null, undefined or blanks', () => {
    expect(splitWeakPoints(null)).toEqual([])
    expect(splitWeakPoints(undefined)).toEqual([])
    expect(splitWeakPoints(' , ,')).toEqual([])
  })
})
