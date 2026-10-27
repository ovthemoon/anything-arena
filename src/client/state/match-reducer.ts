import type { ClientMessage, ServerMessage } from '../../shared/schemas/messages'
import type { ActionStatus, ConnectionRole, PlayerSlot } from '../../shared/schemas/enums'
import type { PublicMatchState, RoundResolved } from '../../shared/schemas/match'

export interface CommentaryEntry {
  text: string
  audioPath: string | null
  validUntil: number
}

export interface RejectedInfo {
  reasonCode: string
  canRetry: boolean
}

export interface ClientState {
  connection: 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'
  you: ConnectionRole | null
  match: PublicMatchState | null
  playback: RoundResolved | null
  commentary: Record<string, CommentaryEntry>
  toast: string | null
  lastActionId: string | null
  pendingWeaponRequestId: string | null
  rejected: RejectedInfo | null
}

export const initialClientState: ClientState = {
  connection: 'idle',
  you: null,
  match: null,
  playback: null,
  commentary: {},
  toast: null,
  lastActionId: null,
  pendingWeaponRequestId: null,
  rejected: null,
}

const opponentSlotOf = (slot: PlayerSlot): PlayerSlot => (slot === 'A' ? 'B' : 'A')
const isPlayerSlot = (role: ConnectionRole): role is PlayerSlot => role === 'A' || role === 'B'

const withActionStatus = (state: ClientState, actionStatus: ActionStatus): ClientState => {
  if (!state.match || !state.you || !isPlayerSlot(state.you)) return state
  const player = state.match.players[state.you]
  if (!player) return state
  return { ...state, match: { ...state.match, players: {
    ...state.match.players, [state.you]: { ...player, actionStatus },
  } } }
}

export function reduceConnection(state: ClientState, connection: ClientState['connection']): ClientState {
  const next = { ...state, connection }
  if (connection !== 'reconnecting') return next
  const disconnected = { ...next, pendingWeaponRequestId: null }
  // Keep the action ID: its acknowledgement may arrive on the replacement socket.
  if (state.you && isPlayerSlot(state.you) && state.match?.players[state.you]?.actionStatus === 'VALIDATING') {
    return withActionStatus(disconnected, 'NONE')
  }
  return disconnected
}

/** Lock submissions before the network round trip, including preset attacks. */
export function reduceOutgoing(state: ClientState, msg: ClientMessage): ClientState {
  if (msg.type === 'weapon_submit') {
    if (state.pendingWeaponRequestId) return state
    return { ...state, pendingWeaponRequestId: msg.requestId, rejected: null, toast: null }
  }
  if (msg.type !== 'action_submit') return state
  if (!state.match || !state.you || !isPlayerSlot(state.you)) return state
  const status = state.match.players[state.you]?.actionStatus
  if (state.match.phase !== 'ROUND_INPUT' || msg.matchId !== state.match.matchId || msg.roundId !== state.match.roundId || status === 'VALIDATING' || status === 'ACCEPTED') return state
  return withActionStatus({ ...state, lastActionId: msg.actionId, rejected: null, toast: null }, 'VALIDATING')
}

/** Pure reducer. Callers MUST validate raw JSON with ServerMessage.safeParse before calling this. */
export function reduce(state: ClientState, msg: ServerMessage): ClientState {
  switch (msg.type) {
    case 'room_snapshot': {
      const sameRound = state.match?.matchId === msg.state.matchId && state.match.roundId === msg.state.roundId
      const hasWeapon = isPlayerSlot(msg.you) && !!msg.state.players[msg.you]?.weapon
      const next = { ...state, you: msg.you, match: msg.state, rejected: null,
        lastActionId: sameRound ? state.lastActionId : null,
        pendingWeaponRequestId: state.match?.matchId === msg.state.matchId && !hasWeapon ? state.pendingWeaponRequestId : null,
      }
      // An unrelated connection snapshot can arrive while the server is judging our action.
      if (sameRound && state.lastActionId && state.you === msg.you && isPlayerSlot(msg.you) &&
          state.match?.players[msg.you]?.actionStatus === 'VALIDATING' && msg.state.phase === 'ROUND_INPUT' &&
          msg.state.players[msg.you]?.actionStatus === 'NONE') return withActionStatus(next, 'VALIDATING')
      return next
    }

    case 'round_started': {
      if (!state.match || state.match.matchId !== msg.matchId) return state
      return {
        ...state,
        match: { ...state.match, roundId: msg.roundId, deadlineAt: msg.deadlineAt, phase: 'ROUND_INPUT', players: {
          A: { ...state.match.players.A, actionStatus: 'NONE' },
          B: { ...state.match.players.B, actionStatus: 'NONE' },
        } },
        playback: null,
        rejected: null,
        lastActionId: null,
      }
    }

    case 'action_pending':
      if (msg.actionId !== state.lastActionId || state.match?.phase !== 'ROUND_INPUT') return state
      return withActionStatus(state, 'VALIDATING')

    case 'action_accepted':
      if (msg.actionId !== state.lastActionId || state.match?.phase !== 'ROUND_INPUT') return state
      return withActionStatus({ ...state, rejected: null }, 'ACCEPTED')

    case 'opponent_ready': {
      if (!state.match || !state.you || !isPlayerSlot(state.you)) return state
      const opponentSlot = opponentSlotOf(state.you)
      const opponent = state.match.players[opponentSlot]
      if (!opponent) return state
      return {
        ...state,
        match: {
          ...state.match,
          players: { ...state.match.players, [opponentSlot]: { ...opponent, ready: msg.ready } },
        },
      }
    }

    case 'input_rejected': {
      const rejected = { reasonCode: msg.reasonCode, canRetry: msg.canRetry }
      if (msg.actionId === state.pendingWeaponRequestId) return { ...state, pendingWeaponRequestId: null, rejected }
      if (state.match?.phase === 'ROUND_INPUT') {
        if (msg.actionId !== state.lastActionId) return state
        return withActionStatus({ ...state, rejected }, msg.reasonCode === 'ALREADY_ACCEPTED' ? 'ACCEPTED' : 'REJECTED')
      }
      return { ...state, rejected }
    }

    case 'foul_warning': {
      if (!state.match || !state.you || !isPlayerSlot(state.you)) return state
      const me = state.match.players[state.you]
      if (!me) return state
      return {
        ...state,
        match: {
          ...state.match,
          players: { ...state.match.players, [state.you]: { ...me, fouls: msg.fouls, presetOnly: msg.presetOnly } },
        },
      }
    }

    case 'round_resolved': {
      if (!state.match) return { ...state, playback: msg }
      const players = { ...state.match.players }
      for (const slot of Object.keys(players) as PlayerSlot[]) {
        const hp = msg.hpAfter[slot]
        if (hp !== undefined) players[slot] = { ...players[slot], hp }
      }
      return {
        ...state,
        playback: msg,
        match: { ...state.match, players, phase: 'ROUND_PLAYBACK', eventSeq: msg.eventSeq },
      }
    }

    case 'commentary_ready': {
      if (!state.match || state.match.matchId !== msg.matchId) return state
      return {
        ...state,
        commentary: {
          ...state.commentary,
          [msg.eventId]: { text: msg.text, audioPath: msg.audioPath, validUntil: msg.validUntil },
        },
      }
    }

    case 'match_finished':
      return { ...state, match: msg.state }

    case 'match_aborted':
      return { ...state, toast: msg.reason }

    case 'error': {
      const next = { ...state, pendingWeaponRequestId: null, toast: msg.message }
      if (state.you && isPlayerSlot(state.you) && state.match?.players[state.you]?.actionStatus === 'VALIDATING') return withActionStatus(next, 'REJECTED')
      return next
    }

    default:
      return state
  }
}
