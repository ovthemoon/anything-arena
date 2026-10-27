import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createSocket } from '../../src/client/network/socket'
class FakeSocket {
  static OPEN = 1
  static sockets: FakeSocket[] = []
  readyState = 0
  listeners = new Map<string, Array<(e: unknown) => void>>()
  constructor() { FakeSocket.sockets.push(this) }
  addEventListener(event: string, fn: (e: unknown) => void) { this.listeners.set(event, [...(this.listeners.get(event) ?? []), fn]) }
  emit(event: string, data: unknown = {}) { for (const fn of this.listeners.get(event) ?? []) fn(data) }
  send() {}
  close(code = 1000) { this.readyState = 3; this.emit('close', { code }) }
}
beforeEach(() => { vi.useFakeTimers(); FakeSocket.sockets = []; vi.stubGlobal('WebSocket', FakeSocket); vi.stubGlobal('location', { origin: 'https://test.example' }) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
it('replacement closes a tab permanently instead of stealing the seat back', () => {
  const status = vi.fn()
  const socket = createSocket('ABCDE', vi.fn(), status)
  FakeSocket.sockets[0].emit('open')
  FakeSocket.sockets[0].close(4000)
  vi.advanceTimersByTime(60000)
  expect(FakeSocket.sockets).toHaveLength(1)
  expect(status).toHaveBeenLastCalledWith('closed')
  socket.close()
})
it('transient failures retry but permanently failed rooms have a finite budget', () => {
  const status = vi.fn()
  createSocket('ABCDE', vi.fn(), status)
  for (let i = 0; i < 20; i++) { FakeSocket.sockets.at(-1)!.close(1006); vi.advanceTimersByTime(30000) }
  expect(FakeSocket.sockets).toHaveLength(11)
  expect(status).toHaveBeenLastCalledWith('closed')
})
