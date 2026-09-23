import type { AiAdapters } from '../ai'
import type { EngineState } from '../game/engine'
import type { PlayerSlot } from '../../shared/schemas/enums'
import type { ServerMessage } from '../../shared/schemas/messages'

/** 핸들러가 DO 내부에 접근하는 유일한 통로. 상태 변경은 반드시 commit 을 거친다. */
export interface RoomCtx {
  readonly ai: AiAdapters
  getState(): EngineState
  commit(next: EngineState): Promise<void>
  sendTo(slot: PlayerSlot, msg: ServerMessage): void
  broadcast(msg: ServerMessage): void
  broadcastSnapshot(): void
  setAlarm(at: number): Promise<void>
  clearAlarm(): Promise<void>
  isProcessed(actionId: string): boolean
  markProcessed(actionId: string): Promise<void>
  resetProcessed(): Promise<void>
  getRematchVotes(): PlayerSlot[]
  setRematchVotes(votes: PlayerSlot[]): Promise<void>
  cacheGet<T>(key: string): Promise<T | undefined>
  cachePut<T>(key: string, value: T): Promise<void>
}

export class TimeoutError extends Error {}

export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(`timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e: unknown) => { clearTimeout(timer); reject(e) },
    )
  })

export const errorMessage = (code: string, message: string): ServerMessage => ({ type: 'error', code, message })
