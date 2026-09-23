import { useState } from 'react'
import { LIMITS, countChars } from '../../shared/rules/limits'
import type { PublicPlayer } from '../../shared/schemas/match'
import type { RejectedInfo } from '../state/match-reducer'

export interface ActionPanelProps {
  me: PublicPlayer | undefined
  isInputOpen: boolean
  isCollapsed: boolean
  commentaryText: string | null
  rejected: RejectedInfo | null
  onTechnique: (techniqueId: string) => void
  onFreeText: (text: string) => void
}

const REJECT_NOTES: Record<string, string> = {
  REWRITE: '표현을 바꿔주세요. 무기로 승부하세요.',
  MODERATION: '삐익! 인신공격 반칙입니다. 무기로 승부하세요.',
  FOUL: '삐익! 인신공격 반칙입니다. 무기로 승부하세요.',
  OUTSIDE_CAPABILITY: '이 무기로는 할 수 없는 행동이에요. 다르게 써볼까요?',
  SYSTEM_INSTRUCTION: '그건 공격이 아니에요. 무기로 승부하세요.',
  TIMEOUT: '연결 지연으로 기본 공격을 사용했습니다.',
}

const noteFor = (rejected: RejectedInfo | null): string | null => {
  if (!rejected) return null
  return REJECT_NOTES[rejected.reasonCode] ?? '입력이 거절됐어요. 다시 써주세요.'
}

/** 하단: 해설·기술 2개·자유 입력·공격. presetOnly 면 자유 입력을 잠근다. */
export function ActionPanel({ me, isInputOpen, isCollapsed, commentaryText, rejected, onTechnique, onFreeText }: ActionPanelProps) {
  const [text, setText] = useState('')
  const techniques = me?.weapon?.techniques ?? []
  const presetOnly = me?.presetOnly === true
  const submitted = me?.actionStatus === 'ACCEPTED' || me?.actionStatus === 'VALIDATING'
  const canAct = isInputOpen && !submitted
  const chars = countChars(text)
  const freeInvalid = chars === 0 || chars > LIMITS.ACTION_TEXT
  const note = presetOnly ? '이번 경기는 준비된 기술만 사용할 수 있습니다.' : noteFor(rejected)

  const submitFree = () => {
    if (!canAct || presetOnly || freeInvalid) return
    onFreeText(text)
    setText('')
  }

  return (
    <div className={`panel${isCollapsed ? ' is-collapsed' : ''}`}>
      <div className="commentary">
        {commentaryText && (
          <>
            <span className="commentary__icon">🔊</span>
            {commentaryText}
          </>
        )}
      </div>
      <div className="techs">
        {techniques.map((t) => (
          <button key={t.id} type="button" className="tech" disabled={!canAct} onClick={() => onTechnique(t.id)}>
            {t.name}
          </button>
        ))}
      </div>
      <form
        className="freeform"
        onSubmit={(e) => {
          e.preventDefault()
          submitFree()
        }}
      >
        <input
          value={text}
          disabled={!canAct || presetOnly}
          maxLength={LIMITS.ACTION_TEXT * 2}
          placeholder={presetOnly ? '자유 입력이 잠겼습니다' : '어떻게 공격할까?'}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="attack-btn" disabled={!canAct || presetOnly || freeInvalid}>
          공격!
          <span className="panel__count">
            {chars}/{LIMITS.ACTION_TEXT}
          </span>
        </button>
      </form>
      <div className={`panel__note${rejected && !presetOnly ? ' is-error' : ''}`}>
        {submitted && isInputOpen ? '제출 완료. 상대를 기다리는 중…' : note}
      </div>
    </div>
  )
}
