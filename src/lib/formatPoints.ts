/** Round to 2 decimal places for storage and sums (avoids float noise). */
export function roundPoints(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

/** Display points without dropping meaningful fractional part. */
export function formatPointsDisplay(value: number): string {
  const r = roundPoints(value)
  if (Object.is(r, -0)) return '0'
  if (Math.abs(r - Math.trunc(r)) < 1e-9) return String(Math.trunc(r))
  return r.toFixed(2).replace(/\.?0+$/, '')
}

/** Two decimal places always (leaderboards, committee-facing totals). */
export function formatPointsFixed2(value: number): string {
  if (!Number.isFinite(value)) return '0.00'
  return roundPoints(value).toFixed(2)
}
