import type { WeaponProfile } from '../../shared/schemas/weapon'

const ROAST_AUDIO_DIR = '/audio/roasts'

type Technique = WeaponProfile['techniques'][number]

/**
 * 공격의 승인 문장이 그 캐릭터의 추천 한 마디(techniques.actionText)와 글자 그대로 같으면
 * 미리 만들어 둔 음성 파일 경로를 돌려준다. 손으로 고쳐 보낸 문장이나 자유 입력이면 null (자막만).
 * 파일은 scripts/gen-roast-voices.mjs 가 technique id 이름으로 만든다.
 */
export const roastVoicePath = (techniques: readonly Technique[] | undefined, approvedActionText: string): string | null => {
  if (!techniques) return null
  const wanted = approvedActionText.trim()
  const hit = techniques.find((t) => t.actionText.trim() === wanted)
  return hit ? `${ROAST_AUDIO_DIR}/${hit.id}.mp3` : null
}
