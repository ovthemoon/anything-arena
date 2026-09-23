import { splitWeakPoints } from './weak-points'
import { useState } from 'react'
import { LIMITS, countChars } from '../../shared/rules/limits'
import type { PublicPlayer } from '../../shared/schemas/match'
import type { RejectedInfo } from '../state/match-reducer'
import { pickTargetedSuggestions } from './suggestions'
import { useT } from '../i18n/LangContext'
import type { Strings } from '../i18n/strings'

export interface ActionPanelProps {
  me: PublicPlayer | undefined
  /** 상대 카드의 아픈 곳 (쉼표 구분). 입력창 위 힌트 */
  opponentWeakness: string | null
  /** 경기·라운드·좌석 씨앗. 같으면 새로고침해도 같은 추천 3개 */
  suggestionSeed: string
  isInputOpen: boolean
  isCollapsed: boolean
  commentaryText: string | null
  rejected: RejectedInfo | null
  onFreeText: (text: string) => void
  /** 반칙 2회(presetOnly) 벌칙: 직접 입력 대신 추천 한 마디 중 골라서만 공격 */
  onTechnique: (techniqueId: string) => void
}

const rejectNotes = (t: Strings['action']): Record<string, string> => ({
  REWRITE: t.rejectRewrite,
  MODERATION: t.rejectModeration,
  FOUL: t.rejectFoul,
  OUTSIDE_CAPABILITY: t.rejectOutsideCapability,
  SYSTEM_INSTRUCTION: t.rejectSystemInstruction,
  TIMEOUT: t.rejectTimeout,
})

const noteFor = (rejected: RejectedInfo | null, t: Strings['action']): string | null => {
  if (!rejected) return null
  return rejectNotes(t)[rejected.reasonCode] ?? t.rejectDefault
}

/** 하단: 상대 아픈 곳 힌트·자유 입력·공격. 추천 한 마디는 입력창을 채우기만 한다. presetOnly(반칙 2회)면 직접 입력을 잠그고 추천 중 골라서만 공격. */
export function ActionPanel({ me, opponentWeakness, suggestionSeed, isInputOpen, isCollapsed, commentaryText, rejected, onFreeText, onTechnique }: ActionPanelProps) {
  const [text, setText] = useState('')
  const [shuffle, setShuffle] = useState(0)
  const t = useT().action
  const suggestions = pickTargetedSuggestions(me?.weapon?.techniques ?? [], suggestionSeed, shuffle)
  const hasMore = (me?.weapon?.techniques.length ?? 0) > suggestions.length
  const weakPoints = splitWeakPoints(opponentWeakness)
  const presetOnly = me?.presetOnly === true
  const submitted = me?.actionStatus === 'ACCEPTED' || me?.actionStatus === 'VALIDATING'
  const canAct = isInputOpen && !submitted
  const chars = countChars(text)
  const freeInvalid = chars === 0 || chars > LIMITS.ACTION_TEXT
  const note = presetOnly ? t.presetOnly : noteFor(rejected, t)

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
          <span className="muted">{t.opponentWeakPoints}</span>
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
          placeholder={presetOnly ? t.inputLocked : t.inputPlaceholder}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="attack-btn" disabled={!canAct || presetOnly || freeInvalid}>
          {t.attack}
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
          {hasMore && (
            <button type="button" className="chip-btn" onClick={() => setShuffle((n) => n + 1)}>
              {t.shuffle}
            </button>
          )}
        </div>
      )}
      {suggestions.length > 0 && !presetOnly && (
        <div className="hint">
          <span className="muted">{t.noIdea}</span>
          {suggestions.map((t) => (
            <button key={t.id} type="button" className="chip-btn" disabled={!canAct} title={t.actionText} onClick={() => setText(t.actionText)}>
              {t.name}
            </button>
          ))}
          {hasMore && (
            <button type="button" className="chip-btn" onClick={() => setShuffle((n) => n + 1)}>
              {t.shuffle}
            </button>
          )}
        </div>
      )}
      <div className={`panel__note${rejected && !presetOnly ? ' is-error' : ''}`}>
        {submitted && isInputOpen ? (me?.actionStatus === 'VALIDATING' ? t.validating : t.submitted) : note}
      </div>
    </div>
  )
}
