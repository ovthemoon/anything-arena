import { RULES } from '../../shared/rules/constants'
import { ConnectionRole } from '../../shared/schemas/enums'

export const SEAT_COOKIE = 'seat'
const SEAT_TOKEN_TTL_MS = RULES.IDLE_ROOM_TTL_MS * 6
const COOKIE_MAX_AGE_S = SEAT_TOKEN_TTL_MS / 1000
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LENGTH = 6
const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`)

/** role 이 'SCREEN' 이면 PC 방송 화면, 'A'/'B' 면 휴대폰 컨트롤러 좌석. */
export type Seat = { roomCode: string; role: ConnectionRole }

const enc = new TextEncoder()
const b64u = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const hmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

const sign = async (secret: string, payload: string): Promise<string> =>
  b64u(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload)))

const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const generateRoomCode = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH))
  return Array.from(bytes, (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('')
}

export const isValidRoomCode = (code: string): boolean => ROOM_CODE_PATTERN.test(code)

export const issueSeatToken = async (secret: string, roomCode: string, role: ConnectionRole, now = Date.now()): Promise<string> => {
  if (!secret) throw new Error('issueSeatToken: SESSION_SECRET missing')
  const payload = `${roomCode}.${role}.${now}`
  return `${payload}.${await sign(secret, payload)}`
}

export const verifySeatToken = async (secret: string, token: string, now = Date.now()): Promise<Seat | null> => {
  if (!secret) return null
  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [roomCode, rawRole, issuedAt, sig] = parts
  const role = ConnectionRole.safeParse(rawRole)
  if (!role.success) return null
  const issued = Number(issuedAt)
  if (!Number.isFinite(issued) || now - issued > SEAT_TOKEN_TTL_MS) return null
  const expected = await sign(secret, `${roomCode}.${role.data}.${issuedAt}`)
  return safeEqual(expected, sig) ? { roomCode, role: role.data } : null
}

export const seatCookie = (token: string, secure: boolean): string =>
  `${SEAT_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=${COOKIE_MAX_AGE_S}`

export const readSeatCookie = (request: Request): string | null =>
  request.headers.get('Cookie')?.match(new RegExp(`(?:^|;\\s*)${SEAT_COOKIE}=([^;]+)`))?.[1] ?? null

/** Origin 헤더가 없으면(비브라우저) 허용, 있으면 목록과 정확히 일치해야 한다. */
export const isAllowedOrigin = (request: Request, allowed: string[]): boolean => {
  const origin = request.headers.get('Origin')
  if (origin === null) return true
  // 같은 호스트에서 온 요청은 항상 허용 (배포 도메인을 미리 몰라도 됨). 목록은 추가 허용용.
  const self = new URL(request.url)
  if (origin === `${self.protocol}//${self.host}`) return true
  return allowed.map((o) => o.trim()).filter(Boolean).includes(origin)
}
