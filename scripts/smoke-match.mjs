// 한 판을 소켓 3개(중계·A·B)로 자동 진행하고 해설·음성·그림 경로를 확인한다.
// 사용: node scripts/smoke-match.mjs [http://localhost:5173]
import WebSocket from 'ws'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const WS_BASE = BASE.replace(/^http/, 'ws')
const log = (who, ...a) => console.log(new Date().toISOString().slice(11, 23), `[${who}]`, ...a)

const cookieOf = (res) => (res.headers.get('set-cookie') ?? '').split(';')[0]
const post = async (path, cookie) => {
  const res = await fetch(BASE + path, { method: 'POST', headers: cookie ? { Cookie: cookie } : {} })
  const body = await res.json().catch(() => null)
  return { res, body, cookie: cookieOf(res) }
}

const created = await post('/api/rooms')
const roomCode = created.body?.data?.roomCode
if (!roomCode) throw new Error('room create failed: ' + JSON.stringify(created.body))
log('http', 'room', roomCode, 'screen cookie', created.cookie ? 'ok' : 'MISSING')
const joinA = await post(`/api/rooms/${roomCode}/join`)
const joinB = await post(`/api/rooms/${roomCode}/join`)
log('http', 'joined', joinA.body?.data?.slot, joinB.body?.data?.slot)

const connect = (name, cookie) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_BASE}/ws/room/${roomCode}`, { headers: { Cookie: cookie, Origin: BASE } })
    ws.on('open', () => resolve(ws))
    ws.on('error', reject)
    ws.on('message', (raw) => {
      const m = JSON.parse(String(raw))
      if (m.type === 'room_snapshot') {
        const p = m.state.players
        log(name, 'snapshot', m.state.phase, 'r' + m.state.roundId, `A ${p.A.hp}hp ${p.A.weapon?.displayName ?? '-'} img=${p.A.weapon?.imageUrl ?? '-'}`, `B ${p.B.hp}hp ${p.B.weapon?.displayName ?? '-'} img=${p.B.weapon?.imageUrl ?? '-'}`)
      } else if (m.type === 'round_resolved') {
        for (const a of m.attacks) log(name, 'attack', a.actor, a.techniqueLabel, a.effectiveness, a.damage, a.animation, a.fallbackReason ?? '')
        log(name, 'hp after', JSON.stringify(m.hpAfter))
      } else if (m.type === 'commentary_ready') {
        log(name, 'commentary', JSON.stringify(m.text), 'audio=' + m.audioPath)
        if (name === 'screen') commentaries.push(m)
      } else if (name !== 'screen' || !['opponent_ready'].includes(m.type)) {
        log(name, m.type, m.reasonCode ?? m.code ?? m.actionId ?? '')
      }
      events.push({ name, m })
    })
  })

const events = []
const commentaries = []
const waitFor = (pred, ms = 20000) =>
  new Promise((resolve, reject) => {
    const t0 = Date.now()
    const tick = () => {
      const hit = events.find(pred)
      if (hit) return resolve(hit)
      if (Date.now() - t0 > ms) return reject(new Error('timeout waiting'))
      setTimeout(tick, 100)
    }
    tick()
  })

const screen = await connect('screen', created.cookie)
const a = await connect('A', joinA.cookie)
const b = await connect('B', joinB.cookie)
const send = (ws, m) => ws.send(JSON.stringify(m))
const snap = (await waitFor((e) => e.name === 'A' && e.m.type === 'room_snapshot')).m
const matchId = snap.state.matchId

send(a, { type: 'weapon_submit', requestId: 'wa', weapon: { nickname: '할머니', characterId: 'grandma', character: '', weaponName: '욕쟁이 할머니', description: '' } })
send(b, { type: 'weapon_submit', requestId: 'wb', weapon: { nickname: '재민', characterId: 'jaemmin', character: '', weaponName: '이잼민', description: '' } })
await waitFor((e) => e.name === 'screen' && e.m.type === 'room_snapshot' && e.m.state.players.A.weapon && e.m.state.players.B.weapon, 30000)
send(a, { type: 'ready', matchId }); send(b, { type: 'ready', matchId })
const started = (await waitFor((e) => e.name === 'screen' && e.m.type === 'round_started')).m
const latest = [...events].reverse().find((e) => e.name === 'screen' && e.m.type === 'room_snapshot').m.state
send(a, { type: 'action_submit', matchId, roundId: started.roundId, actionId: 'a1', text: '너 배터리 1퍼센트 핸드폰이냐? 엄마가 부르면 바로 꺼지게' })
send(b, { type: 'action_submit', matchId, roundId: started.roundId, actionId: 'b1', text: '장미칼로 찌른다' })
await waitFor((e) => e.name === 'screen' && e.m.type === 'round_resolved', 25000)
await new Promise((r) => setTimeout(r, 12000))
for (const c of commentaries) {
  if (!c.audioPath) continue
  const res = await fetch(BASE + c.audioPath, { headers: { Cookie: created.cookie } })
  log('http', 'audio', c.audioPath, res.status, res.headers.get('content-type'), (await res.arrayBuffer()).byteLength, 'bytes')
}
const finalSnap = [...events].reverse().find((e) => e.name === 'screen' && e.m.type === 'room_snapshot')?.m.state
for (const s of ['A', 'B']) {
  const img = finalSnap?.players[s].weapon?.imageUrl
  if (img) { const res = await fetch(BASE + img); log('http', 'image', s, img, res.status, res.headers.get('content-type'), (await res.arrayBuffer()).byteLength, 'bytes') }
  else log('http', 'image', s, 'none')
}
screen.close(); a.close(); b.close()
process.exit(0)
