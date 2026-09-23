import { handleAiRoute } from './ai/routes'
import { jsonResponse } from './lib/response'
import { BattleRoom } from './rooms/battle-room'

export { BattleRoom }

const API_PREFIX = '/api'
const WS_PREFIX = '/ws/room/'

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

    // WebSocket: /ws/room/:code → 해당 방의 BattleRoom 으로 전달
    if (url.pathname.startsWith(WS_PREFIX)) {
      const roomCode = url.pathname.slice(WS_PREFIX.length)
      if (!roomCode) {
        return jsonResponse({ success: false, data: null, error: 'Room code required' }, 400)
      }
      const stub = env.BATTLE_ROOM.get(env.BATTLE_ROOM.idFromName(roomCode))
      return stub.fetch(request)
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

    if (url.pathname.startsWith(`${API_PREFIX}/ai`)) {
      return handleAiRoute(request, env)
    }

    return jsonResponse({ success: false, data: null, error: 'Not found' }, 404)
  },
} satisfies ExportedHandler<Env>
