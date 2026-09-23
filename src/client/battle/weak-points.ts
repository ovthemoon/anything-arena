/** 카드의 weakness("a, b, c") 를 칩으로 쪼갠다. 빈 조각은 버린다. */
export const splitWeakPoints = (weakness: string | null | undefined): string[] =>
  (weakness ?? '').split(',').map((w) => w.trim()).filter(Boolean)
