#!/usr/bin/env node
/**
 * 레트로(8비트) 효과음 합성 → public/audio/*.mp3
 *
 * 외부 소리 파일 없이 파형을 수식으로 그린다. 옛날 게임기 사운드 칩처럼
 * 사각파·삼각파·톱니파·잡음만 쓰고, 소리 크기 봉투(envelope)와 음높이 미끄럼으로 표정을 준다.
 * WAV 로 쓴 뒤 ffmpeg 로 mp3 로 바꾼다 (ffmpeg 필요).
 *
 *   node scripts/gen-sfx.mjs            # 전부 다시 생성
 *   node scripts/gen-sfx.mjs hit-strong # 하나만
 *
 * 배경음(bgm-battle.mp3)은 이 스크립트가 만들지 않는다. 원본 곡을 아래처럼 줄여서 넣는다:
 *   ffmpeg -i <원본.mp3> -ac 2 -b:a 96k -map_metadata -1 public/audio/bgm-battle.mp3
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SAMPLE_RATE = 22050
const OUT_DIR = 'public/audio'
const MP3_BITRATE = '96k'
const MASTER_GAIN = 0.8
/** 잡음도 고정 시드로 만들어 같은 코드면 같은 파일이 나온다 (재생성 결과를 diff 할 수 있게). */
const NOISE_SEED = 0x5f3759df

// mulberry32: 작고 결정적인 난수. Math.random 은 실행마다 달라 재생성이 비교 불가능하다.
const makeRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// ── 기본 파형 (위상 0..1 → -1..1) ──
const WAVE = {
  square: (p) => (p < 0.5 ? 1 : -1),
  triangle: (p) => 4 * Math.abs(p - Math.floor(p + 0.5)) - 1,
  saw: (p) => 2 * p - 1,
  sine: (p) => Math.sin(2 * Math.PI * p),
}

const seconds = (ms) => Math.round((ms / 1000) * SAMPLE_RATE)

/** 한 음: 시작·끝 음높이(Hz), 길이, 파형, 감쇠 곡선. 음높이는 직선으로 미끄러진다. */
const tone = ({ wave, from, to = from, ms, attackMs = 4, decay = 3, gain = 1 }) => {
  const n = seconds(ms)
  const out = new Float32Array(n)
  const fn = WAVE[wave]
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    const hz = from + (to - from) * t
    phase = (phase + hz / SAMPLE_RATE) % 1
    const attack = Math.min(1, i / seconds(attackMs))
    const env = attack * Math.exp(-decay * t)
    out[i] = fn(phase) * env * gain
  }
  return out
}

/** 잡음: 타격·바람. `tilt` 가 클수록 낮은 소리(둔탁), 작을수록 쉭쉭거리는 고음. */
const noise = ({ ms, decay = 6, tilt = 0.2, gain = 1 }) => {
  const n = seconds(ms)
  const out = new Float32Array(n)
  const random = makeRandom(NOISE_SEED)
  let last = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    last = last + tilt * (random() * 2 - 1 - last)
    out[i] = last * Math.exp(-decay * t) * gain * 3
  }
  return out
}

/** 40Hz 떨림(tremolo)으로 심판 호루라기의 "삐이익" 질감을 만든다. */
const warble = (buf, hz, depth) => buf.map((v, i) => v * (1 - depth + depth * Math.abs(Math.sin((Math.PI * hz * i) / SAMPLE_RATE))))

const silence = (ms) => new Float32Array(seconds(ms))
const concat = (...parts) => {
  const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}
const mix = (...parts) => {
  const out = new Float32Array(Math.max(...parts.map((p) => p.length)))
  for (const p of parts) for (let i = 0; i < p.length; i++) out[i] += p[i]
  return out
}

// 음이름 → Hz (A4 = 440)
const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, B3: 246.94, C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, F4: 349.23 }
const arp = (wave, names, ms, gap = 0) => concat(...names.flatMap((n) => [tone({ wave, from: NOTE[n], ms, decay: 1.5 }), silence(gap)]))

// ── 8개 효과음 ──
const SOUNDS = {
  // 심판 호루라기: 높은 삼각파 + 떨림 + 약간의 숨소리
  whistle: () => mix(warble(tone({ wave: 'triangle', from: 2600, to: 2500, ms: 420, decay: 1.2 }), 42, 0.6), noise({ ms: 420, decay: 4, tilt: 0.9, gain: 0.08 })),
  // 라운드 시작: 올라가는 4음 팡파르
  'round-start': () => arp('square', ['C5', 'E5', 'G5', 'C6'], 90, 10),
  // 강타: 낮게 떨어지는 사각파 + 둔탁한 잡음
  'hit-strong': () => mix(tone({ wave: 'square', from: 320, to: 50, ms: 260, decay: 4, gain: 0.7 }), noise({ ms: 220, decay: 7, tilt: 0.25 })),
  // 보통 타격: 짧고 가볍게
  'hit-normal': () => mix(tone({ wave: 'square', from: 240, to: 70, ms: 170, decay: 5, gain: 0.55 }), noise({ ms: 140, decay: 9, tilt: 0.35, gain: 0.7 })),
  // 막기: 쇠붙이처럼 짧게 "탱"
  block: () => mix(tone({ wave: 'square', from: 1400, to: 1300, ms: 140, decay: 8, gain: 0.35 }), tone({ wave: 'triangle', from: 2100, ms: 100, decay: 10, gain: 0.3 }), noise({ ms: 60, decay: 12, tilt: 0.8, gain: 0.3 })),
  // 빗나감: 바람 소리 "휙"
  miss: () => mix(noise({ ms: 220, decay: 5, tilt: 0.6, gain: 0.5 }), tone({ wave: 'sine', from: 900, to: 250, ms: 220, decay: 4, gain: 0.25 })),
  // 승리: 팡파르 후 길게 끄는 마지막 음
  win: () => concat(arp('square', ['C5', 'E5', 'G5'], 110, 15), tone({ wave: 'square', from: NOTE.C6, ms: 520, decay: 1.8 })),
  // 패배: 느리게 내려가는 삼각파
  lose: () => concat(arp('triangle', ['E4', 'D4', 'C4'], 230, 20), tone({ wave: 'triangle', from: NOTE.B3, to: NOTE.B3 * 0.94, ms: 620, decay: 1.5 })),
}

// ── WAV 쓰기 (16비트 PCM 모노) ──
const toWav = (samples) => {
  const peak = Math.max(1e-6, ...samples.map(Math.abs))
  const scale = (MASTER_GAIN / peak) * 32767
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((v, i) => data.writeInt16LE(Math.round(v * scale), i * 2))
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

const main = () => {
  const wanted = process.argv.slice(2)
  const names = wanted.length ? wanted : Object.keys(SOUNDS)
  const unknown = names.filter((n) => !SOUNDS[n])
  if (unknown.length) {
    console.error(`unknown sound(s): ${unknown.join(', ')}. known: ${Object.keys(SOUNDS).join(', ')}`)
    process.exit(1)
  }
  mkdirSync(OUT_DIR, { recursive: true })
  const tmp = mkdtempSync(join(tmpdir(), 'sfx-'))
  const failed = []
  try {
    for (const name of names) {
      const wav = join(tmp, `${name}.wav`)
      writeFileSync(wav, toWav(SOUNDS[name]()))
      const mp3 = join(OUT_DIR, `${name}.mp3`)
      try {
        execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', wav, '-b:a', MP3_BITRATE, '-map_metadata', '-1', mp3], { stdio: ['ignore', 'ignore', 'pipe'] })
        console.log(`wrote ${mp3}`)
      } catch (err) {
        failed.push(name)
        const detail = err.code === 'ENOENT' ? 'ffmpeg not found (brew install ffmpeg)' : String(err.stderr ?? err.message).trim()
        console.error(`FAILED ${name}: ${detail}`)
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  if (failed.length) {
    console.error(`${failed.length} of ${names.length} sounds failed; the rest were written. public/audio may now be a mix of old and new files.`)
    process.exit(1)
  }
}

main()
