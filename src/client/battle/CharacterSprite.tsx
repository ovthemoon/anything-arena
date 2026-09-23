import { poseUrl, type CharacterId, type Pose } from './characters'

export interface CharacterSpriteProps {
  id: CharacterId | null
  pose: Pose
  side: 'left' | 'right'
  /** 밀림(px). 0 이면 제자리 */
  shiftX?: number
  isLunging?: boolean
  isFlashing?: boolean
  /** 선수 입장: 마운트 때 튀어오르며 등장 */
  isEntering?: boolean
}

/** 5자세 PNG 중 하나를 보여준다. id 가 없으면(상대 미선택) 실루엣. */
export function CharacterSprite({ id, pose, side, shiftX = 0, isLunging = false, isFlashing = false, isEntering = false }: CharacterSpriteProps) {
  const cls = ['char', `char--${side}`]
  if (shiftX > 0) cls.push('is-shifted')
  if (isLunging) cls.push('is-lunging')
  if (isFlashing) cls.push('is-flash')
  if (isEntering) cls.push('is-entering')
  if (!id) cls.push('is-silhouette')
  const src = poseUrl(id ?? 'grandma', id ? pose : 'idle')
  return (
    <div className={cls.join(' ')} style={{ ['--shift-x' as string]: String(shiftX) }}>
      <img src={src} alt="" draggable={false} />
    </div>
  )
}
