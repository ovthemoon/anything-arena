import { useState } from 'react'
import { LIMITS, countChars } from '../../shared/rules/limits'
import type { PublicPlayer } from '../../shared/schemas/match'
import type { RejectedInfo } from '../state/match-reducer'

export interface ActionPanelProps {
  me: PublicPlayer | undefined
  /** 상대 카드의 아픈 곳 (쉼표 구분). 입력창 위 힌트 */
  opponentWeakness: string | null
  isInputOpen: boolean
  isCollapsed: boolean
  commentaryText: string | null
  rejected: RejectedInfo | null
  onFreeText: (text: string) => void
  /** 반칙 2회(presetOnly) 벌칙: 직접 입력 대신 추천 한 마디 중 골라서만 공격 */
  onTechnique: (techniqueId: string) => void
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

/** 하단: 상대 아픈 곳 힌트·자유 입력·공격. 추천 한 마디는 입력창을 채우기만 한다. presetOnly(반칙 2회)면 직접 입력을 잠그고 추천 중 골라서만 공격. */
export function ActionPanel({ me, opponentWeakness, isInputOpen, isCollapsed, commentaryText, rejected, onFreeText, onTechnique }: ActionPanelProps) {
  const [text, setText] = useState('')
  const suggestions = me?.weapon?.techniques ?? []
  const weakPoints = (opponentWeakness ?? '').split(',').map((w) => w.trim()).filter(Boolean)
  const presetOnly = me?.presetOnly === true
  const submitted = me?.actionStatus === 'ACCEPTED' || me?.actionStatus === 'VALIDATING'
  const canAct = isInputOpen && !submitted
  const chars = countChars(text)
  const freeInvalid = chars === 0 || chars > LIMITS.ACTION_TEXT
  const note = presetOnly ? '반칙 2회. 직접 입력은 잠겼습니다. 아래 한 마디 중 골라서 공격하세요.' : noteFor(rejected)

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
      {weakPoints.length > 0 && (
        <div className="hint">
          <span className="muted">상대 아픈 곳</span>
          {weakPoints.map((w) => (
            <span key={w} className="wcard__chip is-weak">
              {w}
            </span>
          ))}
        </div>
      )}
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
          placeholder={presetOnly ? '자유 입력이 잠겼습니다' : '한 마디로 긁어라 (뻔한 칼·주먹은 0점)'}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="attack-btn" disabled={!canAct || presetOnly || freeInvalid}>
          공격!
          <span className="panel__count">
            {chars}/{LIMITS.ACTION_TEXT}
          </span>
        </button>
      </form>
      {suggestions.length > 0 && presetOnly && (
        <div className="hint">
          {suggestions.map((t) => (
            <button key={t.id} type="button" className="tech" disabled={!canAct} title={t.actionText} onClick={() => onTechnique(t.id)}>
              {t.name}
            </button>
          ))}
        </div>
      )}
      {suggestions.length > 0 && !presetOnly && (
        <div className="hint">
          <span className="muted">말이 안 떠오르면</span>
          {suggestions.map((t) => (
            <button key={t.id} type="button" className="chip-btn" disabled={!canAct} title={t.actionText} onClick={() => setText(t.actionText)}>
              {t.name}
            </button>
          ))}
        </div>
      )}
      <div className={`panel__note${rejected && !presetOnly ? ' is-error' : ''}`}>
        {submitted && isInputOpen ? '제출 완료. 상대를 기다리는 중…' : note}
      </div>
    </div>
  )
}
