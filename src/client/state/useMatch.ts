import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClientMessage, ServerMessage } from '../../shared/schemas/messages'
import { createSocket } from '../network/socket'
import { initialClientState, reduce, type ClientState } from './match-reducer'

export interface UseMatchResult {
  state: ClientState
  send: (message: ClientMessage) => void
}

/** Owns the socket lifecycle for one room and exposes the reduced state + a send() escape hatch. */
export function useMatch(roomCode: string | null): UseMatchResult {
  const [state, setState] = useState<ClientState>(initialClientState)
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null)

  useEffect(() => {
    if (!roomCode) return

    setState(initialClientState)
    const socket = createSocket(
      roomCode,
      (message: ServerMessage) => setState((prev) => reduce(prev, message)),
      (status) => setState((prev) => ({ ...prev, connection: status })),
    )
    socketRef.current = socket

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [roomCode])

  const send = useMemo(() => (message: ClientMessage) => socketRef.current?.send(message), [roomCode])

  return { state, send }
}
