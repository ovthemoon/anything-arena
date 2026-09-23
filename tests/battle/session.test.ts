import { describe, expect, test } from 'vitest'
import { issueSeatToken, verifySeatToken } from '../../src/worker/security/session'

describe('seat token', () => {
  test('round-trips room and slot', async () => {
    const t = await issueSeatToken('secret', 'ROOM1', 'B')
    expect(await verifySeatToken('secret', t)).toEqual({ roomCode: 'ROOM1', role: 'B' })
  })
  test('accepts SCREEN role and rejects unknown roles', async () => {
    const t = await issueSeatToken('secret', 'ROOM1', 'SCREEN')
    expect(await verifySeatToken('secret', t)).toEqual({ roomCode: 'ROOM1', role: 'SCREEN' })
    expect(await verifySeatToken('secret', t.replace('SCREEN', 'ADMIN'))).toBeNull()
  })
  test('rejects tampered token and wrong secret', async () => {
    const t = await issueSeatToken('secret', 'ROOM1', 'B')
    expect(await verifySeatToken('other', t)).toBeNull()
    expect(await verifySeatToken('secret', t.replace('B', 'A'))).toBeNull()
  })
})

import { generateRoomCode, isAllowedOrigin, isValidRoomCode, readSeatCookie, seatCookie } from '../../src/worker/security/session'

describe('session helpers', () => {
  test('expired token is rejected', async () => {
    const t = await issueSeatToken('secret', 'ROOM1', 'A', 0)
    expect(await verifySeatToken('secret', t, 10 * 60 * 60 * 1000)).toBeNull()
  })
  test('malformed token is rejected', async () => {
    expect(await verifySeatToken('secret', 'garbage')).toBeNull()
    expect(await verifySeatToken('secret', 'R.C.1.x')).toBeNull()
  })
  test('room code uses the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) expect(isValidRoomCode(generateRoomCode())).toBe(true)
    expect(isValidRoomCode('ABCDE0')).toBe(false)
    expect(isValidRoomCode('abcdef')).toBe(false)
  })
  test('cookie round-trips through a request', async () => {
    const t = await issueSeatToken('secret', 'ROOM1', 'A')
    const cookie = seatCookie(t, false).split(';')[0]
    const req = new Request('http://x/', { headers: { Cookie: `foo=1; ${cookie}` } })
    expect(readSeatCookie(req)).toBe(t)
  })
  test('origin check', () => {
    const allowed = ['http://localhost:5173']
    expect(isAllowedOrigin(new Request('http://x/'), allowed)).toBe(true)
    expect(isAllowedOrigin(new Request('http://x/', { headers: { Origin: 'http://localhost:5173' } }), allowed)).toBe(true)
    expect(isAllowedOrigin(new Request('http://x/', { headers: { Origin: 'http://evil.test' } }), allowed)).toBe(false)
  })
})
