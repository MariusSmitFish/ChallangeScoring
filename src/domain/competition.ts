/** Five consecutive competition days: 1–5 June 2026. */
export const COMPETITION_YEAR = 2026

export const COMPETITION_NAME = 'THE CHALLENGE 2026' as const

export const COMPETITION_DAYS: readonly {
  dayNumber: 1 | 2 | 3 | 4 | 5
  label: string
  isoDate: string
}[] = [
  { dayNumber: 1, label: 'Mon 1 Jun', isoDate: '2026-06-01' },
  { dayNumber: 2, label: 'Tue 2 Jun', isoDate: '2026-06-02' },
  { dayNumber: 3, label: 'Wed 3 Jun', isoDate: '2026-06-03' },
  { dayNumber: 4, label: 'Thu 4 Jun', isoDate: '2026-06-04' },
  { dayNumber: 5, label: 'Fri 5 Jun', isoDate: '2026-06-05' },
] as const

export const SCHEDULE = {
  launch: 'Barcos launch site (or committee-approved site). First light; tractors push out; start on flare once all boats are behind the line.',
  linesUp: 'No formal lines-up. All boats behind the backline by 15h00 (within ~100m of Barcos beach); radio beach control before beaching. One boat beaches at a time.',
  weighIn: '17h00 at Barcos',
} as const
