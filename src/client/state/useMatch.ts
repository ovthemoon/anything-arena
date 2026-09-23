import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClientMessage, ServerMessage } from '../../shared/schemas/messages'
import { createSocket } from '../network/socket'
import { initialClientState, reduce, reduceConnection, reduceOutgoing, type ClientState } from './match-reducer'

export interface UseMatchResult {
  state: ClientState
  send: (message: ClientMessage) => void
}

/** Owns the socket lifecycle for one room and exposes the reduced state + a send() escape hatch. */
export function useMatch(roomCode: string | null): UseMatchResult {
  const [state, setState] = useState<ClientState>(initialClientState)
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null)
  const stateRef = useRef(state)
  const updateState = useCallback((update: (previous: ClientState) => ClientState) => {
    stateRef.current = update(stateRef.current)
    setState(stateRef.current)
  }, [])

  useEffect(() => {
    if (!roomCode) return

    updateState(() => initialClientState)
    const socket = createSocket(
      roomCode,
      (message: ServerMessage) => updateState((prev) => reduce(prev, message)),
      (status) => updateState((prev) => reduceConnection(prev, status)),
    )
    socketRef.current = socket

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [roomCode, updateState])

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current
    if (!socket) return
    const next = reduceOutgoing(stateRef.current, message)
    if ((message.type === 'action_submit' || message.type === 'weapon_submit') && next === stateRef.current) return
    updateState(() => next)
    socket.send(message)
  }, [updateState])

  return { state, send }
}
