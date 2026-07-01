export const SCORE_CATEGORIES = ['men', 'ladies', 'u19', 'u16'] as const

export type ScoreCategory = (typeof SCORE_CATEGORIES)[number]

export const SCORE_CATEGORY_LABELS: Record<ScoreCategory, string> = {
  men: 'Men',
  ladies: 'Ladies',
  u19: 'U/19',
  u16: 'U/16',
}

export function isScoreCategory(value: string): value is ScoreCategory {
  return (SCORE_CATEGORIES as readonly string[]).includes(value)
}

export function scoreCategoryLabel(
  category: ScoreCategory | null | undefined,
): string {
  if (!category) return '—'
  return SCORE_CATEGORY_LABELS[category]
}
