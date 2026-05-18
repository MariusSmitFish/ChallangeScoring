/** @deprecated Use `useCompetition()` for the active/selected event. Kept for static fallbacks. */
export const COMPETITION_YEAR = 2026

/** @deprecated Use `useCompetition().competition.name` */
export const COMPETITION_NAME = 'THE CHALLENGE 2026' as const

import { DEFAULT_SCHEDULE_CONFIG } from './competitionConfig'

/** @deprecated Use schedule from competition config or `competition_days` */
export const COMPETITION_DAYS = DEFAULT_SCHEDULE_CONFIG.days ?? []

/** @deprecated Use `useCompetition().schedule` */
export const SCHEDULE = {
  launch: DEFAULT_SCHEDULE_CONFIG.launch,
  linesUp: DEFAULT_SCHEDULE_CONFIG.linesUp,
  weighIn: DEFAULT_SCHEDULE_CONFIG.weighIn,
} as const
