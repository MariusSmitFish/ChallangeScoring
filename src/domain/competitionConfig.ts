import { RULE_SECTIONS } from './rulesSections'

export type RulesSection = { title: string; bullets: string[] }

export type LengthTier = {
  minCm: number
  maxCm?: number
  points: number
}

export type SpeciesCountMultiplier = {
  minSpecies: number
  multiplier: number
}

export type ScoringConfig = {
  minWeighKg: number
  bonusOver10Kg: number
  speciesDiversityPerExtra: number
  maxPerSpeciesPerBoatDay: number
  billfishPoints: { sailfish: number; marlin: number }
  lengthTiers: LengthTier[]
  /** additive = +N per extra species (Challenge); multiplier = boat day fish × factor (GDSAA). */
  diversityMode?: 'additive' | 'multiplier'
  speciesCountMultipliers?: SpeciesCountMultiplier[]
  billfishPointsByVariant?: Record<string, number>
  bonusPerScoringFishAfterFirst?: number
  lengthTiersByGroup?: Record<string, LengthTier[]>
}

export type ScheduleDayTemplate = {
  dayNumber: number
  isoDate: string
  label: string
}

export type ScheduleConfig = {
  launch: string
  linesUp: string
  weighIn: string
  venue?: string
  /** Optional calendar strip; days also live in `competition_days`. */
  days?: ScheduleDayTemplate[]
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  minWeighKg: 4,
  bonusOver10Kg: 5,
  speciesDiversityPerExtra: 2,
  maxPerSpeciesPerBoatDay: 6,
  billfishPoints: { sailfish: 15, marlin: 25 },
  lengthTiers: [
    { minCm: 70, maxCm: 80, points: 5 },
    { minCm: 80, maxCm: 100, points: 10 },
    { minCm: 100, points: 15 },
  ],
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  launch:
    'Barcos launch site (or committee-approved site). First light; tractors push out; start on flare once all boats are behind the line.',
  linesUp:
    'No formal lines-up. All boats behind the backline by 15h00 (within ~100m of Barcos beach); radio beach control before beaching. One boat beaches at a time.',
  weighIn: '17h00 at Barcos',
  venue: 'Barcos',
  days: [
    { dayNumber: 1, isoDate: '2026-06-01', label: 'Mon 1 Jun' },
    { dayNumber: 2, isoDate: '2026-06-02', label: 'Tue 2 Jun' },
    { dayNumber: 3, isoDate: '2026-06-03', label: 'Wed 3 Jun' },
    { dayNumber: 4, isoDate: '2026-06-04', label: 'Thu 4 Jun' },
    { dayNumber: 5, isoDate: '2026-06-05', label: 'Fri 5 Jun' },
  ],
}

export const DEFAULT_RULES_SECTIONS: RulesSection[] = RULE_SECTIONS.map((s) => ({
  title: s.title,
  bullets: [...s.bullets],
}))

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

export function parseScoringConfig(raw: unknown): ScoringConfig {
  if (!isRecord(raw)) return { ...DEFAULT_SCORING_CONFIG }
  const d = DEFAULT_SCORING_CONFIG
  const bill = isRecord(raw.billfishPoints) ? raw.billfishPoints : {}
  const tiersRaw = Array.isArray(raw.lengthTiers) ? raw.lengthTiers : d.lengthTiers
  const lengthTiers: LengthTier[] = tiersRaw
    .map((t): LengthTier | null => {
      if (!isRecord(t)) return null
      const minCm = num(t.minCm, NaN)
      const points = num(t.points, NaN)
      if (!Number.isFinite(minCm) || !Number.isFinite(points)) return null
      const maxCm = t.maxCm == null ? undefined : num(t.maxCm, NaN)
      return {
        minCm,
        maxCm: maxCm != null && Number.isFinite(maxCm) ? maxCm : undefined,
        points,
      }
    })
    .filter((t): t is LengthTier => t !== null)

  const multipliers: SpeciesCountMultiplier[] = []
  if (Array.isArray(raw.speciesCountMultipliers)) {
    for (const m of raw.speciesCountMultipliers) {
      if (!isRecord(m)) continue
      const minSpecies = num(m.minSpecies, NaN)
      const multiplier = num(m.multiplier, NaN)
      if (Number.isFinite(minSpecies) && Number.isFinite(multiplier)) {
        multipliers.push({ minSpecies, multiplier })
      }
    }
  }
  multipliers.sort((a, b) => a.minSpecies - b.minSpecies)

  const billfishPointsByVariant: Record<string, number> = {}
  if (isRecord(raw.billfishPointsByVariant)) {
    for (const [k, v] of Object.entries(raw.billfishPointsByVariant)) {
      if (typeof v === 'number' && Number.isFinite(v)) billfishPointsByVariant[k] = v
    }
  }

  const lengthTiersByGroup: Record<string, LengthTier[]> = {}
  if (isRecord(raw.lengthTiersByGroup)) {
    for (const [group, tiersRaw] of Object.entries(raw.lengthTiersByGroup)) {
      if (!Array.isArray(tiersRaw)) continue
      const tiers = tiersRaw
        .map((t): LengthTier | null => {
          if (!isRecord(t)) return null
          const minCm = num(t.minCm, NaN)
          const points = num(t.points, NaN)
          if (!Number.isFinite(minCm) || !Number.isFinite(points)) return null
          const maxCm = t.maxCm == null ? undefined : num(t.maxCm, NaN)
          return {
            minCm,
            maxCm: maxCm != null && Number.isFinite(maxCm) ? maxCm : undefined,
            points,
          }
        })
        .filter((t): t is LengthTier => t !== null)
      if (tiers.length) lengthTiersByGroup[group] = tiers
    }
  }

  const diversityMode =
    raw.diversityMode === 'multiplier' || raw.diversityMode === 'additive'
      ? raw.diversityMode
      : undefined

  return {
    minWeighKg: num(raw.minWeighKg, d.minWeighKg),
    bonusOver10Kg: num(raw.bonusOver10Kg, d.bonusOver10Kg),
    speciesDiversityPerExtra: num(
      raw.speciesDiversityPerExtra,
      d.speciesDiversityPerExtra,
    ),
    maxPerSpeciesPerBoatDay: num(
      raw.maxPerSpeciesPerBoatDay,
      d.maxPerSpeciesPerBoatDay,
    ),
    billfishPoints: {
      sailfish: num(bill.sailfish, d.billfishPoints.sailfish),
      marlin: num(bill.marlin, d.billfishPoints.marlin),
    },
    lengthTiers: lengthTiers.length ? lengthTiers : d.lengthTiers,
    diversityMode,
    speciesCountMultipliers: multipliers.length ? multipliers : undefined,
    billfishPointsByVariant: Object.keys(billfishPointsByVariant).length
      ? billfishPointsByVariant
      : undefined,
    bonusPerScoringFishAfterFirst:
      typeof raw.bonusPerScoringFishAfterFirst === 'number'
        ? raw.bonusPerScoringFishAfterFirst
        : undefined,
    lengthTiersByGroup: Object.keys(lengthTiersByGroup).length
      ? lengthTiersByGroup
      : undefined,
  }
}

/** Species-factor multiplier for boat-day totals (GDSAA-style). */
export function speciesCountMultiplier(
  speciesCount: number,
  scoring: ScoringConfig,
): number {
  const table = scoring.speciesCountMultipliers
  if (!table?.length) return 1
  let mult = 1
  for (const row of table) {
    if (speciesCount >= row.minSpecies) mult = row.multiplier
  }
  return mult
}

export function teamDaySpeciesAdjustment(
  fishPoints: number,
  speciesCount: number,
  scoring: ScoringConfig,
): { dayTotal: number; diversityBonus: number; mode: 'additive' | 'multiplier' } {
  if (scoring.diversityMode === 'multiplier') {
    const mult = speciesCountMultiplier(speciesCount, scoring)
    const dayTotal = Math.round(fishPoints * mult * 100) / 100
    const diversityBonus = Math.round((dayTotal - fishPoints) * 100) / 100
    return { dayTotal, diversityBonus, mode: 'multiplier' }
  }
  const diversityBonus =
    speciesCount <= 1
      ? 0
      : (speciesCount - 1) * scoring.speciesDiversityPerExtra
  return {
    dayTotal: Math.round((fishPoints + diversityBonus) * 100) / 100,
    diversityBonus,
    mode: 'additive',
  }
}

export function billfishVariantLabels(
  scoring: ScoringConfig,
): { id: string; label: string; points: number }[] {
  if (scoring.billfishPointsByVariant) {
    return Object.entries(scoring.billfishPointsByVariant).map(([id, points]) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
      points,
    }))
  }
  return [
    { id: 'sailfish', label: 'Sailfish', points: scoring.billfishPoints.sailfish },
    { id: 'marlin', label: 'Marlin', points: scoring.billfishPoints.marlin },
  ]
}

export function parseRulesConfig(raw: unknown): RulesSection[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_RULES_SECTIONS
  const out: RulesSection[] = []
  for (const item of raw) {
    if (!isRecord(item) || typeof item.title !== 'string') continue
    const bullets = Array.isArray(item.bullets)
      ? item.bullets.filter((b): b is string => typeof b === 'string')
      : []
    if (!item.title.trim()) continue
    out.push({ title: item.title.trim(), bullets })
  }
  return out.length ? out : DEFAULT_RULES_SECTIONS
}

export function parseScheduleConfig(raw: unknown): ScheduleConfig {
  if (!isRecord(raw)) return { ...DEFAULT_SCHEDULE_CONFIG }
  const d = DEFAULT_SCHEDULE_CONFIG
  const daysRaw = Array.isArray(raw.days) ? raw.days : d.days
  const days: ScheduleDayTemplate[] | undefined = daysRaw
    ?.map((day): ScheduleDayTemplate | null => {
      if (!isRecord(day)) return null
      if (typeof day.dayNumber !== 'number' || typeof day.isoDate !== 'string') {
        return null
      }
      return {
        dayNumber: day.dayNumber,
        isoDate: day.isoDate,
        label: typeof day.label === 'string' ? day.label : `Day ${day.dayNumber}`,
      }
    })
    .filter((x): x is ScheduleDayTemplate => x !== null)

  return {
    launch: typeof raw.launch === 'string' ? raw.launch : d.launch,
    linesUp: typeof raw.linesUp === 'string' ? raw.linesUp : d.linesUp,
    weighIn: typeof raw.weighIn === 'string' ? raw.weighIn : d.weighIn,
    venue: typeof raw.venue === 'string' ? raw.venue : d.venue,
    days: days?.length ? days : d.days,
  }
}

export function scoringConfigToJson(config: ScoringConfig): Record<string, unknown> {
  return { ...config }
}

export function rulesConfigToJson(sections: RulesSection[]): RulesSection[] {
  return sections.map((s) => ({ title: s.title, bullets: [...s.bullets] }))
}
