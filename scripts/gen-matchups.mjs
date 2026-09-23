// 매치업 추천 한 마디 생성기. 공격자 말투로, 수비자의 아픈 곳을 콕 집어 찌르는 대사 4개 × (누가 → 누구) 30조합.
// 사용: node scripts/gen-matchups.mjs [ko|en]   → src/shared/rules/matchups-<lang>.ts 를 다시 쓴다. 결과는 사람이 훑어본다.
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'vite'

const lang = process.argv[2] ?? 'ko'
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
const apiKey = env.OPENROUTER_API_KEY
if (!apiKey) throw new Error('OPENROUTER_API_KEY missing in .env')
const model = env.TEXT_MODEL || 'openai/gpt-5-mini'

const vite = await createServer({ configFile: false, server: { middlewareMode: true }, logLevel: 'error' })
const { ROSTER_BY_LANG } = await vite.ssrLoadModule('/src/shared/rules/roster.ts')
const { LIMITS, countChars } = await vite.ssrLoadModule('/src/shared/rules/limits.ts')
const { hitsBlocklist } = await vite.ssrLoadModule('/src/worker/moderation/blocklist.ts')
const roster = ROSTER_BY_LANG[lang]
const ids = Object.keys(roster)
const ANIMATIONS = ['DASH', 'PROJECTILE', 'SHOCKWAVE', 'PSYCHIC']
const PER_PAIR = 4
const TEXT_MAX = LIMITS.ACTION_TEXT - 4
const LABEL_MAX = 10

const SYSTEM = lang === 'ko'
  ? '너는 코미디 말싸움 파티 게임의 대사 작가다. 허구 캐릭터끼리 말로만 긁는다(roast). 실존 인물·실제 참가자·가족 비하, 혐오 표현, 성적 괴롭힘, 욕설·비속어는 금지. 칼·주먹 같은 실제 무기·물리 폭력 묘사는 게임에서 0점이니 쓰지 않는다. 재치 있는 비유와 캐릭터 설정을 건드리는 도발만. 반드시 JSON 으로만 답한다.'
  : 'You write lines for a comedy roast-battle party game between fictional characters. Roasts only: no slurs, no hate, no sexual harassment, no insults aimed at real people. Describing real weapons or physical violence scores zero in this game, so never use it. Witty comparisons and jabs at the character setup only. Answer in JSON only.'

const userPrompt = (a, d) => JSON.stringify(lang === 'ko' ? {
  task: `${a.name} 가 ${d.name} 에게 던질 긁기 대사 ${PER_PAIR}개`,
  attacker: { name: a.name, description: a.description, persona: a.persona, tone: a.voice.tone, catchphrases: a.voice.catchphrases },
  defender: { name: d.name, description: d.description, weakPoints: d.weakPoints, hates: d.voice.hates },
  rules: [
    `대사(text)는 한국어 ${TEXT_MAX}자 이하. 한 문장 또는 두 짧은 문장.`,
    '각 대사는 defender.weakPoints 또는 defender.hates 중 하나를 콕 집어 찔러야 한다. 4개가 서로 다른 항목을 찌른다.',
    'attacker.tone 말투로 쓴다. catchphrases 는 많아야 한 개 대사에만 넣는다.',
    `label 은 기술 이름처럼 2~${LABEL_MAX}자.`,
    'animation 은 DASH(돌진·휘두르기), PROJECTILE(던지기·발사), SHOCKWAVE(파동·폭발), PSYCHIC(정신·소리) 중 대사 느낌에 맞는 것.',
  ],
} : {
  task: `${PER_PAIR} roast lines ${a.name} throws at ${d.name}`,
  attacker: { name: a.name, description: a.description, persona: a.persona, tone: a.voice.tone, catchphrases: a.voice.catchphrases },
  defender: { name: d.name, description: d.description, weakPoints: d.weakPoints, hates: d.voice.hates },
  rules: [
    `Each text is at most ${TEXT_MAX} characters. One sentence, punchy.`,
    'Each line must poke one specific item from defender.weakPoints or defender.hates; the 4 lines hit 4 different items.',
    'Write in attacker.tone. Use a catchphrase in at most one line.',
    `label is a move name, 2 to ${LABEL_MAX + 4} characters.`,
    'animation is one of DASH (charge/swing), PROJECTILE (throw/shoot), SHOCKWAVE (blast/wave), PSYCHIC (mind/sound), whichever fits the line.',
  ],
})

const jsonSchema = {
  type: 'object', additionalProperties: false, required: ['roasts'],
  properties: { roasts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['label', 'text', 'animation'], properties: { label: { type: 'string' }, text: { type: 'string' }, animation: { type: 'string', enum: ANIMATIONS } } } } },
}

const call = async (a, d) => {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://anything-arena.workers.dev', 'X-Title': 'Anything Arena' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userPrompt(a, d) }], response_format: { type: 'json_schema', json_schema: { name: 'output', strict: true, schema: jsonSchema } } }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`openrouter ${res.status} ${(await res.text()).slice(0, 200)}`)
  const body = await res.json()
  return JSON.parse(body.choices[0].message.content).roasts
}

const valid = (r) => ANIMATIONS.includes(r.animation) && countChars(r.text) > 0 && countChars(r.text) <= LIMITS.ACTION_TEXT && countChars(r.label) > 0 && countChars(r.label) <= 20 && !hitsBlocklist(r.text, lang) && !hitsBlocklist(r.label, lang)

const generatePair = async (aId, dId) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const roasts = (await call(roster[aId], roster[dId])).filter(valid).slice(0, PER_PAIR)
      if (roasts.length >= 3) { console.log(`${aId} → ${dId}: ${roasts.length}`); return roasts }
      console.warn(`${aId} → ${dId}: only ${roasts.length} valid, retry ${attempt}`)
    } catch (e) { console.warn(`${aId} → ${dId}: ${String(e).slice(0, 120)}, retry ${attempt}`) }
  }
  throw new Error(`${aId} → ${dId}: failed`)
}

const pairs = ids.flatMap((a) => ids.filter((d) => d !== a).map((d) => [a, d]))
const table = Object.fromEntries(ids.map((a) => [a, {}]))
const CONCURRENCY = 6
for (let i = 0; i < pairs.length; i += CONCURRENCY) {
  await Promise.all(pairs.slice(i, i + CONCURRENCY).map(async ([a, d]) => { table[a][d] = await generatePair(a, d) }))
}

const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const lines = [
  `// 생성됨: node scripts/gen-matchups.mjs ${lang} (모델 ${model}). 손으로 다듬어도 된다.`,
  `// 공격자 말투로 수비자의 아픈 곳을 찌르는 추천 한 마디. characterCard(…, opponentId) 가 앞쪽에 싣는다.`,
  `import type { CharacterId } from '../schemas/enums'`,
  `import type { Roast } from './roster'`,
  ``,
  `export const MATCHUP_ROASTS_${lang.toUpperCase()}: Record<CharacterId, Partial<Record<CharacterId, Roast[]>>> = {`,
]
for (const a of ids) {
  lines.push(`  ${a}: {`)
  for (const d of ids.filter((d) => d !== a)) {
    lines.push(`    ${d}: [`)
    for (const r of table[a][d]) lines.push(`      { label: ${q(r.label)}, text: ${q(r.text)}, animation: '${r.animation}' },`)
    lines.push(`    ],`)
  }
  lines.push(`  },`)
}
lines.push(`}`, ``)
writeFileSync(`src/shared/rules/matchups-${lang}.ts`, lines.join('\n'))
console.log(`wrote src/shared/rules/matchups-${lang}.ts (${pairs.length} pairs)`)
await vite.close()
process.exit(0)
