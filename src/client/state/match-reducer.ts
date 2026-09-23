import type { ServerMessage } from '../../shared/schemas/messages'
import type { ConnectionRole, PlayerSlot } from '../../shared/schemas/enums'
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
  connection: 'idle' | 'connecting' | 'open' | 'reconnecting'
  you: ConnectionRole | null
  match: PublicMatchState | null
  playback: RoundResolved | null
  commentary: Record<string, CommentaryEntry>
  toast: string | null
  lastActionId: string | null
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
  rejected: null,
}

const opponentSlotOf = (slot: PlayerSlot): PlayerSlot => (slot === 'A' ? 'B' : 'A')
const isPlayerSlot = (role: ConnectionRole): role is PlayerSlot => role === 'A' || role === 'B'

/** Pure reducer. Callers MUST validate raw JSON with ServerMessage.safeParse before calling this. */
export function reduce(state: ClientState, msg: ServerMessage): ClientState {
  switch (msg.type) {
    case 'room_snapshot':
      return { ...state, you: msg.you, match: msg.state, rejected: null }

    case 'round_started': {
      if (!state.match || state.match.matchId !== msg.matchId) return state
      return {
        ...state,
        match: { ...state.match, roundId: msg.roundId, deadlineAt: msg.deadlineAt, phase: 'ROUND_INPUT' },
        playback: null,
        rejected: null,
      }
    }

    case 'action_pending':
      return { ...state, lastActionId: msg.actionId }

    case 'action_accepted':
      return state

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

    case 'input_rejected':
      return { ...state, rejected: { reasonCode: msg.reasonCode, canRetry: msg.canRetry } }

    case 'foul_warning': {
      if (!state.match || !state.you || !isPlayerSlot(state.you)) return state
      const me = state.match.players[state.you]
      if (!me) return state
      return {
        ...state,
        toast: `foul warning: ${msg.fouls}`,
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

    case 'error':
      return { ...state, toast: msg.message }

    default:
      return state
  }
}
