import { handleAiRoute } from './ai/routes'
import { handleAudioRoute } from './ai/audio-route'
import { jsonResponse } from './lib/response'
import { BattleRoom, INTERNAL_HEADER } from './rooms/battle-room'
import { generateRoomCode, isAllowedOrigin, isValidRoomCode, issueSeatToken, readSeatCookie, seatCookie, verifySeatToken } from './security/session'
import type { ConnectionRole } from '../shared/schemas/enums'

export { BattleRoom }

const API_PREFIX = '/api'
const WS_PREFIX = '/ws/room/'
const ROOMS_PREFIX = `${API_PREFIX}/rooms`
const ROOM_CREATE_ATTEMPTS = 5
const DO_ORIGIN = 'https://battle-room'

const roomStub = (env: Env, code: string) => env.BATTLE_ROOM.get(env.BATTLE_ROOM.idFromName(code))

/** Worker → DO 내부 호출. 클라이언트 요청을 그대로 /internal 로 보내지 않는다. */
const callInternal = (env: Env, code: string, action: 'create' | 'join' | 'state', method = 'POST', held: 'A' | 'B' | null = null): Promise<Response> => {
  const url = new URL(`${DO_ORIGIN}/internal/${action}`)
  url.searchParams.set('roomCode', code)
  if (held) url.searchParams.set('held', held)
  return roomStub(env, code).fetch(new Request(url, { method, headers: { [INTERNAL_HEADER]: '1' } }))
}

const fail = (error: string, status: number): Response => jsonResponse({ success: false, data: null, error }, status)

const withSeatCookie = async <T>(env: Env, request: Request, roomCode: string, role: ConnectionRole, data: T): Promise<Response> => {
  const token = await issueSeatToken(env.SESSION_SECRET, roomCode, role)
  const res = jsonResponse({ success: true, data, error: null })
  res.headers.append('Set-Cookie', seatCookie(token, new URL(request.url).protocol === 'https:'))
  return res
}

const createRoom = async (request: Request, env: Env): Promise<Response> => {
  for (let i = 0; i < ROOM_CREATE_ATTEMPTS; i++) {
    const code = generateRoomCode()
    const res = await callInternal(env, code, 'create')
    if (res.ok) return withSeatCookie(env, request, code, 'SCREEN', { roomCode: code, joinUrl: `${new URL(request.url).origin}/play/${code}` })
    if (res.status !== 409) return fail('Room creation failed', 500)
  }
  return fail('Room creation failed', 503)
}

/** 이미 이 방의 A/B 좌석 쿠키가 있으면 그 좌석을 돌려준다 (휴대폰 새로고침). */
const existingSeat = async (request: Request, env: Env, code: string): Promise<'A' | 'B' | null> => {
  const token = readSeatCookie(request)
  const seat = token ? await verifySeatToken(env.SESSION_SECRET, token) : null
  return seat && seat.roomCode === code && seat.role !== 'SCREEN' ? seat.role : null
}

const joinRoom = async (request: Request, env: Env, code: string): Promise<Response> => {
  const held = await existingSeat(request, env, code)
  const res = await callInternal(env, code, 'join', 'POST', held)
  if (res.status === 404) return fail('Room not found', 404)
  if (res.status === 409) return fail('Seat already taken', 409)
  if (!res.ok) return fail('Join failed', 500)
  const { slot } = await res.json<{ slot: 'A' | 'B' }>()
  return withSeatCookie(env, request, code, slot, { roomCode: code, slot })
}

const getRoom = async (env: Env, code: string): Promise<Response> => {
  const res = await callInternal(env, code, 'state', 'GET')
  if (res.status === 404) return fail('Room not found', 404)
  if (!res.ok) return fail('Lookup failed', 500)
  return jsonResponse({ success: true, data: await res.json(), error: null })
}

const handleRooms = async (request: Request, env: Env, path: string): Promise<Response> => {
  if (!isAllowedOrigin(request, env.ALLOWED_ORIGINS.split(','))) return fail('Forbidden origin', 403)
  if (!env.SESSION_SECRET) return fail('Server misconfigured', 500)
  if (path === ROOMS_PREFIX && request.method === 'POST') return createRoom(request, env)
  const [code, sub, ...rest] = path.slice(ROOMS_PREFIX.length + 1).split('/')
  if (!code || !isValidRoomCode(code) || rest.length > 0) return fail('Invalid room code', 400)
  if (sub === 'join' && request.method === 'POST') return joinRoom(request, env, code)
  if (sub === undefined && request.method === 'GET') return getRoom(env, code)
  return fail('Not found', 404)
}

const forwardWebSocket = (request: Request, env: Env, code: string): Promise<Response> => {
  const headers = new Headers(request.headers)
  headers.delete(INTERNAL_HEADER)
  return roomStub(env, code).fetch(new Request(request, { headers }))
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith(WS_PREFIX)) {
      const roomCode = url.pathname.slice(WS_PREFIX.length)
      if (!isValidRoomCode(roomCode)) return fail('Invalid room code', 400)
      return forwardWebSocket(request, env, roomCode)
    }

    if (!url.pathname.startsWith(API_PREFIX)) {
      return env.ASSETS.fetch(request)
    }

    if (url.pathname === `${API_PREFIX}/health`) {
      return jsonResponse({
        success: true,
        data: { status: 'ok', env: env.APP_ENV, ruleset: env.RULESET_VERSION },
        error: null,
      })
    }

    if (url.pathname === ROOMS_PREFIX || url.pathname.startsWith(`${ROOMS_PREFIX}/`)) {
      return handleRooms(request, env, url.pathname)
    }

    if (url.pathname.startsWith(`${API_PREFIX}/audio/`)) return handleAudioRoute(request, env)

    if (url.pathname.startsWith(`${API_PREFIX}/ai`)) {
      return handleAiRoute(request, env)
    }

    return fail('Not found', 404)
  },
} satisfies ExportedHandler<Env>
