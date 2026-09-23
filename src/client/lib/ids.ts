/**
 * 브라우저용 고유 ID. http://내부IP 처럼 "보안 컨텍스트"가 아닌 곳에서는
 * crypto.randomUUID 가 없으므로 getRandomValues 로 대체한다 (휴대폰 LAN 접속 대응).
 */
export const newId = (): string => {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
