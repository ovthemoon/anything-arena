import { DurableObject } from 'cloudflare:workers'
import { createAiAdapters, type AiAdapters } from '../ai'
import { type EngineState, createMatch, setConnected, toPublic } from '../game/engine'
import { isAllowedOrigin, readSeatCookie, verifySeatToken } from '../security/session'
import { LIMITS } from '../../shared/rules/limits'
import { parseLang } from '../../shared/i18n/lang'
import { ConnectionRole, PlayerSlot } from '../../shared/schemas/enums'
import { ClientMessage, type ServerMessage } from '../../shared/schemas/messages'
import { type RoomCtx, errorMessage } from './room-context'
import { handleActionSubmit } from './handlers/action'
import { handleReady, handleRematch, handleWeaponSubmit } from './handlers/lobby'
import { onAlarm } from './handlers/round'
import { BOT_SLOT, armBot } from './handlers/bot'

export const INTERNAL_HEADER = 'X-Internal'
export const INTERNAL_PREFIX = '/internal/'

type Seats = Record<PlayerSlot, boolean>
type Attachment = { role: ConnectionRole }
const SCREEN = 'SCREEN'

const REPLACED_CLOSE_CODE = 4000
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

/**
 * BattleRoom — 방 하나당 하나. 경기 상태의 유일한 기준 (PRD 12장 "서버 권위").
 * WebSocket Hibernation 을 쓰므로 모든 상태는 ctx.storage 에 둔다. 메모리는 캐시일 뿐.
 */
export class BattleRoom extends DurableObject<Env> {
  private state: EngineState | null = null
  private seats: Seats = { A: false, B: false }
  private processed = new Set<string>()
  private rematchVotes: PlayerSlot[] = []
  private readonly ai: AiAdapters
  private readonly roomCtx: RoomCtx

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.ai = createAiAdapters(env)
    this.roomCtx = this.buildRoomCtx()
    void ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<EngineState>('state')) ?? null
      this.seats = (await ctx.storage.get<Seats>('seats')) ?? { A: false, B: false }
      this.processed = new Set((await ctx.storage.get<string[]>('processedActionIds')) ?? [])
      this.rematchVotes = (await ctx.storage.get<PlayerSlot[]>('rematchVotes')) ?? []
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith(INTERNAL_PREFIX)) {
      if (request.headers.get(INTERNAL_HEADER) !== '1') return json({ error: 'forbidden' }, 403)
      return this.handleInternal(url.pathname.slice(INTERNAL_PREFIX.length), url)
    }
    return this.handleUpgrade(request, url)
  }

  // ---- internal (worker → DO) ----

  private async handleInternal(action: string, url: URL): Promise<Response> {
    if (action === 'create') {
      if (this.state) return json({ error: 'exists' }, 409)
      const roomCode = url.searchParams.get('roomCode') ?? ''
      // AI 대전: 봇이 B 좌석을 미리 차지한다. 사람은 A 로만 들어온다.
      const botSlot: PlayerSlot | null = url.searchParams.get('bot') === '1' ? BOT_SLOT : null
      const lang = parseLang(url.searchParams.get('lang'))
      this.seats = { A: false, B: botSlot === BOT_SLOT }
      await this.ctx.storage.put('seats', this.seats)
      await this.commit(armBot(createMatch(roomCode, crypto.randomUUID(), Date.now(), botSlot, lang), Date.now()))
      return json({ ok: true })
    }
    if (!this.state) return json({ error: 'not found' }, 404)
    if (action === 'join') return this.claimSeat(url.searchParams.get('held'))
    if (action === 'state') return json(toPublic(this.state))
    return json({ error: 'unknown' }, 404)
  }

  /** 이미 가진 좌석이면 그대로, 아니면 A → B 순으로 빈 좌석을 준다. */
  private async claimSeat(held: string | null): Promise<Response> {
    const heldSlot = PlayerSlot.safeParse(held)
    if (heldSlot.success && this.seats[heldSlot.data]) return json({ slot: heldSlot.data })
    const free = PlayerSlot.options.find((s) => !this.seats[s])
    if (!free) return json({ error: 'seats taken' }, 409)
    this.seats = { ...this.seats, [free]: true }
    await this.ctx.storage.put('seats', this.seats)
    return json({ slot: free })
  }

  // ---- WebSocket ----

  private async handleUpgrade(request: Request, url: URL): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 })
    if (!this.state) return new Response('Room not found', { status: 404 })
    if (!isAllowedOrigin(request, this.env.ALLOWED_ORIGINS.split(','))) return new Response('Forbidden origin', { status: 403 })
    const token = readSeatCookie(request)
    const seat = token ? await verifySeatToken(this.env.SESSION_SECRET, token) : null
    const pathCode = url.pathname.split('/').pop() ?? ''
    if (!seat || seat.roomCode !== this.state.roomCode || pathCode !== this.state.roomCode) {
      return new Response('Unauthorized', { status: 401 })
    }
    const { role } = seat
    if (role !== SCREEN && !this.seats[role]) return new Response('Seat not claimed', { status: 401 })
    if (role !== SCREEN) {
      for (const old of this.ctx.getWebSockets(role)) {
        try { old.close(REPLACED_CLOSE_CODE, 'replaced') } catch { /* already closed */ }
      }
    }
    const { 0: client, 1: server } = new WebSocketPair()
    this.ctx.acceptWebSocket(server, [role])
    server.serializeAttachment({ role } satisfies Attachment)
    if (role !== SCREEN) await this.commit(setConnected(this.requireState(), role, true))
    this.broadcastSnapshot()
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const role = this.roleOf(ws)
    if (!role || !this.state) { ws.close(1008, 'no seat'); return }
    const raw = typeof message === 'string' ? message : new TextDecoder().decode(message)
    if (raw.length > LIMITS.REQUEST_BYTES) { this.send(ws, errorMessage('TOO_LARGE', 'message too large')); return }
    const parsed = this.parse(raw)
    if (!parsed.success) { this.send(ws, errorMessage('BAD_MESSAGE', parsed.error)); return }
    if (role === SCREEN) {
      if (parsed.data.type === 'request_snapshot') this.send(ws, this.snapshotFor(SCREEN))
      else this.send(ws, errorMessage('SCREEN_READONLY', 'screen connections are read-only'))
      return
    }
    try {
      await this.dispatch(ws, role, parsed.data)
    } catch (e) {
      console.error('[room] handler failed', { role, type: parsed.data.type, error: String(e) })
      this.send(ws, errorMessage('INTERNAL', 'server error'))
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try { ws.close(code, reason) } catch { /* already closed */ }
    const role = this.roleOf(ws)
    if (!role || !this.state) return
    const stillOpen = this.openSockets(role).some((s) => s !== ws)
    if (role !== SCREEN && !stillOpen) await this.commit(setConnected(this.state, role, false))
    if (role === SCREEN || !stillOpen) this.broadcastSnapshot()
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.warn('[room] ws error', String(error))
    await this.webSocketClose(ws, 1011, 'error')
  }

  async alarm(): Promise<void> {
    if (!this.state) return
    await onAlarm(this.roomCtx, Date.now())
  }

  // ---- dispatch ----

  private parse(raw: string): { success: true; data: ClientMessage } | { success: false; error: string } {
    let data: unknown
    try { data = JSON.parse(raw) } catch { return { success: false, error: 'invalid JSON' } }
    const result = ClientMessage.safeParse(data)
    return result.success ? { success: true, data: result.data } : { success: false, error: result.error.issues[0]?.message ?? 'invalid message' }
  }

  private async dispatch(ws: WebSocket, slot: PlayerSlot, msg: ClientMessage): Promise<void> {
    const now = Date.now()
    switch (msg.type) {
      case 'weapon_submit': return handleWeaponSubmit(this.roomCtx, slot, msg)
      case 'ready': return handleReady(this.roomCtx, slot, msg.matchId, now)
      case 'action_submit': return handleActionSubmit(this.roomCtx, slot, msg)
      case 'request_snapshot': this.send(ws, this.snapshotFor(slot)); return
      case 'rematch_ready': return handleRematch(this.roomCtx, slot, msg.matchId, now)
    }
  }

  // ---- helpers ----

  private requireState(): EngineState {
    if (!this.state) throw new Error('room not initialized')
    return this.state
  }

  private async commit(next: EngineState): Promise<void> {
    this.state = next
    await this.ctx.storage.put('state', next)
  }

  private roleOf(ws: WebSocket): ConnectionRole | null {
    const parsed = ConnectionRole.safeParse((ws.deserializeAttachment() as Attachment | null)?.role)
    return parsed.success ? parsed.data : null
  }

  private openSockets(role: ConnectionRole): WebSocket[] {
    return this.ctx.getWebSockets(role).filter((s) => s.readyState === WebSocket.OPEN)
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try { ws.send(JSON.stringify(msg)) } catch (e) { console.warn('[room] send failed', String(e)) }
  }

  /** screenConnected 는 엔진이 아니라 DO 가 소켓 수로 계산한다. */
  private snapshotFor(role: ConnectionRole): ServerMessage {
    const state = { ...toPublic(this.requireState()), screenConnected: this.openSockets(SCREEN).length > 0 }
    return { type: 'room_snapshot', state, you: role }
  }

  private sendTo(role: ConnectionRole, msg: ServerMessage): void {
    for (const ws of this.ctx.getWebSockets(role)) this.send(ws, msg)
  }

  private broadcast(msg: ServerMessage): void {
    for (const ws of this.ctx.getWebSockets()) this.send(ws, msg)
  }

  private broadcastSnapshot(): void {
    for (const role of ConnectionRole.options) this.sendTo(role, this.snapshotFor(role))
  }

  private buildRoomCtx(): RoomCtx {
    const storage = this.ctx.storage
    return {
      ai: this.ai,
      getState: () => this.requireState(),
      commit: (next) => this.commit(next),
      sendTo: (slot, msg) => this.sendTo(slot, msg),
      broadcast: (msg) => this.broadcast(msg),
      broadcastSnapshot: () => this.broadcastSnapshot(),
      setAlarm: (at) => storage.setAlarm(at),
      clearAlarm: () => storage.deleteAlarm(),
      isProcessed: (id) => this.processed.has(id),
      markProcessed: async (id) => {
        this.processed = new Set([...this.processed, id])
        await storage.put('processedActionIds', [...this.processed])
      },
      resetProcessed: async () => {
        this.processed = new Set()
        await storage.put('processedActionIds', [])
      },
      getRematchVotes: () => this.rematchVotes,
      setRematchVotes: async (votes) => {
        this.rematchVotes = votes
        await storage.put('rematchVotes', votes)
      },
      cacheGet: <T,>(key: string) => storage.get<T>(key),
      cachePut: <T,>(key: string, value: T) => storage.put(key, value),
    }
  }
}
