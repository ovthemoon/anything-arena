import { DurableObject } from 'cloudflare:workers'

/**
 * BattleRoom — 방 하나당 하나. 경기 상태의 유일한 기준 (PRD 12장 "서버 권위").
 *
 * - WebSocket Hibernation 사용: 유휴 시 메모리가 내려가도 연결은 유지된다.
 *   따라서 HP·라운드·마감 시각은 메모리가 아니라 this.ctx.storage(SQLite) 에 둔다.
 * - 지금은 뼈대만: 연결 수락 + 에코. 전투 규칙은 ../game, 판정은 ../ai 에서 붙인다.
 */
export class BattleRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const { 0: client, 1: server } = new WebSocketPair()
    this.ctx.acceptWebSocket(server)

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // TODO: shared/schemas 로 메시지 검증 → game/ 규칙 적용 → 모든 참가자에 브로드캐스트
    ws.send(JSON.stringify({ type: 'echo', payload: String(message) }))
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    ws.close(code, reason)
  }
}
