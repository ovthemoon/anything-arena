import { ServerMessage, type ClientMessage } from '../../shared/schemas/messages'

const RECONNECT_BACKOFF_MS = [1000, 2000, 4000, 8000, 15000, 30000]

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

export interface Socket {
  send: (message: ClientMessage) => void
  close: () => void
}

const socketUrl = (roomCode: string): string =>
  `${location.origin.replace(/^http/, 'ws')}/ws/room/${roomCode}`

/**
 * Thin WebSocket wrapper: reconnects with bounded backoff (at most ten failed attempts), sends
 * request_snapshot on every open, and queues outgoing messages while
 * disconnected. Incoming frames are validated with ServerMessage.safeParse
 * before being handed to onMessage — invalid frames are dropped silently.
 */
export function createSocket(
  roomCode: string,
  onMessage: (message: ServerMessage) => void,
  onStatusChange?: (status: ConnectionStatus) => void,
): Socket {
  let ws: WebSocket | null = null
  let closedByClient = false
  let attempt = 0
  let queue: ClientMessage[] = []
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const send = (message: ClientMessage): void => {
    if (closedByClient) return
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
      return
    }
    queue.push(message)
  }

  const flushQueue = (): void => {
    const pending = queue
    queue = []
    for (const message of pending) {
      ws?.send(JSON.stringify(message))
    }
  }

  const scheduleReconnect = (): void => {
    if (closedByClient) return
    if (attempt >= 10) { closedByClient = true; queue = []; onStatusChange?.('closed'); return }
    onStatusChange?.('reconnecting')
    const delay = RECONNECT_BACKOFF_MS[Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)]
    attempt += 1
    reconnectTimer = setTimeout(connect, delay)
  }

  function connect(): void {
    if (closedByClient) return
    onStatusChange?.(attempt === 0 ? 'connecting' : 'reconnecting')
    const socket = new WebSocket(socketUrl(roomCode))
    ws = socket

    socket.addEventListener('open', () => {
      attempt = 0
      onStatusChange?.('open')
      send({ type: 'request_snapshot', matchId: '', lastEventSeq: 0 })
      flushQueue()
    })

    socket.addEventListener('message', (event) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(String(event.data))
      } catch {
        return
      }
      const result = ServerMessage.safeParse(parsed)
      if (result.success) onMessage(result.data)
    })

    socket.addEventListener('close', (event) => {
      if (socket !== ws) return
      if ([1000, 1008, 4000, 4001].includes(event.code)) {
        closedByClient = true
        queue = []
        onStatusChange?.('closed')
        return
      }
      scheduleReconnect()
    })

    socket.addEventListener('error', () => {
      socket.close()
    })
  }

  connect()

  return {
    send,
    close: () => {
      closedByClient = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    },
  }
}
