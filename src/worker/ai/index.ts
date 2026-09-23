import { createMockAdapters } from './mock'
import { createRealAdapters } from './real'
import type { AiAdapters } from './types'

export type { AiAdapters, JudgeRequest } from './types'

/** env.AI_MODE 가 'real' 이면 실제 어댑터, 그 외(기본 'mock')엔 결정적 가짜. */
export const createAiAdapters = (env: Env): AiAdapters =>
  env.AI_MODE === 'real' ? createRealAdapters(env) : createMockAdapters()
