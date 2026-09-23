import { createMockAdapters } from './mock'
import type { AiAdapters } from './types'

export type { AiAdapters, JudgeRequest } from './types'

/** env.AI_MODE 가 'real' 이고 real.ts 가 있으면 실제, 아니면 mock. Lane C 가 real 을 연결한다. */
export const createAiAdapters = (env: Env): AiAdapters => {
  if (env.AI_MODE !== 'real') return createMockAdapters()
  return createMockAdapters()
}
