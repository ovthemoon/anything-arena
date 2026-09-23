import type { MatchEndKind } from './finishing'

const KO_TEXT: Record<MatchEndKind, string> = { KO: 'K.O.!', TIME_UP: 'TIME UP' }

/** 마지막 재생이 끝난 뒤 결과 화면 전에 잠깐 뜨는 컷인. 어두운 비네트 + 거대 글씨. */
export function KoCutIn({ kind }: { kind: MatchEndKind }) {
  return (
    <div className={`ko ko--${kind}`}>
      <div className="ko__text">{KO_TEXT[kind]}</div>
    </div>
  )
}
