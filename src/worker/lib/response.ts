export type ApiEnvelope<T> = {
  success: boolean
  data: T | null
  error: string | null
}

export const jsonResponse = <T>(body: ApiEnvelope<T>, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
