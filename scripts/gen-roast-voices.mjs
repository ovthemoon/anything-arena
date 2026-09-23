#!/usr/bin/env node
/**
 * 추천 한 마디(roster.ts 의 roastPool, 6명 × 10개) 음성을 미리 만들어 public/audio/roasts/<techniqueId>.mp3 로 저장.
 * 경기 중 실시간 TTS 없이 말풍선 장면에서 바로 튼다. 클라이언트는 공격의 approvedActionText 를
 * 그 캐릭터 techniques 의 actionText 와 대조해 id 를 찾는다 (src/client/audio/roast-voice.ts).
 *
 *   npm run voices              # 없는 파일만 생성
 *   npm run voices -- --force   # 전부 다시 생성
 *   npm run voices -- grandma   # 한 캐릭터만
 *
 * 키: .env 의 OPENROUTER_API_KEY. 모델·기본 목소리는 wrangler.jsonc 의 TTS_MODEL/TTS_VOICE 와 같은 값.
 * Node 22.18+ (TypeScript 타입 제거 내장) 필요.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { ROSTER } from '../src/shared/rules/roster.ts'

const OUT_DIR = 'public/audio/roasts'
const SPEECH_URL = 'https://openrouter.ai/api/v1/audio/speech'
const MODEL = 'minimax/speech-2.8-turbo'
/** 말풍선 장면(2.2초)에 최대한 맞추려고 조금 빠르게. */
const SPEED = 1.15
const CONCURRENCY = 4
const TIMEOUT_MS = 30_000

/** 캐릭터별 목소리. OpenRouter 경유 MiniMax 에서 살아 있는 한국어 목소리만 (2026-09-23 확인). */
const VOICE_BY_CHARACTER = {
  grandma: 'Korean_CalmLady',
  jaemmin: 'Korean_ShyGirl',
  daeri: 'Korean_StrictBoss',
  alba: 'Korean_CheerfulBoyfriend',
  chongmu: 'Korean_StrictBoss',
  wonjang: 'Korean_ElegantPrincess',
}

const readApiKey = () => {
  const env = readFileSync('.env', 'utf8')
  const line = env.split('\n').find((l) => l.startsWith('OPENROUTER_API_KEY='))
  const key = line?.slice('OPENROUTER_API_KEY='.length).trim()
  if (!key) throw new Error('OPENROUTER_API_KEY not found in .env')
  return key
}

/** roster.ts:231 과 같은 id 규칙: `${characterId}-r${i+1}` */
const jobsFor = (characterIds) =>
  characterIds.flatMap((id) =>
    ROSTER[id].roastPool.map((roast, i) => ({ id: `${id}-r${i + 1}`, text: roast.text, voice: VOICE_BY_CHARACTER[id] })),
  )

const synthesize = async (apiKey, job) => {
  const res = await fetch(SPEECH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Anything Arena (gen-roast-voices)' },
    body: JSON.stringify({ model: MODEL, input: job.text, voice: job.voice, speed: SPEED, response_format: 'mp3' }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`status ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 1000) throw new Error(`suspiciously small response (${buf.length} bytes)`)
  return buf
}

const durationOf = (path) => {
  try {
    return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path]).toString())
  } catch {
    return null
  }
}

const runPool = async (jobs, worker) => {
  const queue = [...jobs]
  const results = []
  const lanes = Array.from({ length: CONCURRENCY }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) results.push(await worker(job))
  })
  await Promise.all(lanes)
  return results
}

const main = async () => {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const wanted = args.filter((a) => !a.startsWith('--'))
  const unknown = wanted.filter((id) => !ROSTER[id])
  if (unknown.length) {
    console.error(`unknown character(s): ${unknown.join(', ')}. known: ${Object.keys(ROSTER).join(', ')}`)
    process.exit(1)
  }
  const apiKey = readApiKey()
  mkdirSync(OUT_DIR, { recursive: true })
  const jobs = jobsFor(wanted.length ? wanted : Object.keys(ROSTER))
  const todo = force ? jobs : jobs.filter((j) => !existsSync(`${OUT_DIR}/${j.id}.mp3`))
  console.log(`${jobs.length} lines, ${todo.length} to synthesize (${force ? 'force' : 'skip existing'})`)

  const results = await runPool(todo, async (job) => {
    const path = `${OUT_DIR}/${job.id}.mp3`
    try {
      writeFileSync(path, await synthesize(apiKey, job))
      const sec = durationOf(path)
      console.log(`wrote ${path} ${sec ? sec.toFixed(1) + 's' : ''} "${job.text}"`)
      return { id: job.id, ok: true, sec }
    } catch (err) {
      console.error(`FAILED ${job.id}: ${err.message}`)
      return { id: job.id, ok: false }
    }
  })

  const failed = results.filter((r) => !r.ok)
  const secs = jobs.map((j) => durationOf(`${OUT_DIR}/${j.id}.mp3`)).filter((s) => s !== null)
  if (secs.length) {
    const avg = secs.reduce((a, b) => a + b, 0) / secs.length
    console.log(`durations: min ${Math.min(...secs).toFixed(1)}s / avg ${avg.toFixed(1)}s / max ${Math.max(...secs).toFixed(1)}s over ${secs.length} files`)
  }
  if (failed.length) {
    console.error(`${failed.length} failed: ${failed.map((f) => f.id).join(', ')} — rerun to retry (existing files are skipped).`)
    process.exit(1)
  }
}

await main()
