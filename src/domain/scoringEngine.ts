import {
  SPECIES_KEYS,
  buildSpeciesRulesSnapshot,
  speciesCapKey,
  type SpeciesRegistryEntry,
} from './species'

export type CatchKind = 'weighed_gamefish' | 'billfish_release' | 'length_release'

const MIN_WEIGH_KG = 4
const BONUS_OVER_10_KG = 5
const SPECIES_DIVERSITY_PER_EXTRA = 2
const MAX_PER_SPECIES_PER_BOAT_DAY = 6

export type CatchInput = {
  catchKind: CatchKind
  speciesKey: string
  weightKg: number | null
  lengthCm: number | null
  billfishVariant: 'sailfish' | 'marlin' | null
}

export type CatchValidationContext = {
  /** Existing valid catches same team + same calendar day (any angler), for cap checks. */
  sameTeamDaySpeciesCounts: Map<string, number>
  /** When set (non-empty), length/weighed species and cap groups follow the registry. */
  speciesRegistry?: SpeciesRegistryEntry[] | null
}

/** 1 point per kg on the scale, including fractional kg (2 dp). */
function pointsFromWeighedKg(kg: number): number {
  return Math.max(0, Math.round(kg * 100) / 100)
}

function weighedGamefishPoints(weightKg: number): { points: number; warnings: string[] } {
  const warnings: string[] = []
  if (weightKg < MIN_WEIGH_KG) {
    return {
      points: 0,
      warnings: [`Below minimum weight (${MIN_WEIGH_KG} kg) — fish does not score.`],
    }
  }
  let pts = pointsFromWeighedKg(weightKg)
  if (weightKg > 10) {
    pts += BONUS_OVER_10_KG
    warnings.push(`Applied +${BONUS_OVER_10_KG} bonus for weight over 10 kg.`)
  }
  return { points: Math.round(pts * 100) / 100, warnings }
}

function lengthReleasePoints(lengthCm: number): { points: number; warnings: string[] } {
  if (lengthCm < 70) {
    return {
      points: 0,
      warnings: ['Length under 70 cm — fish does not score on the length table.'],
    }
  }
  if (lengthCm < 80) return { points: 5, warnings: [] }
  if (lengthCm < 100) return { points: 10, warnings: [] }
  return { points: 15, warnings: [] }
}

function billfishPoints(variant: 'sailfish' | 'marlin'): number {
  return variant === 'sailfish' ? 15 : 25
}

/** Points for a single catch (excludes per-day species-diversity bonus). Weighed gamefish: 1 pt per kg including fractional kg (2 dp). */
export function scoreSingleCatch(
  input: CatchInput,
  ctx: CatchValidationContext,
): { points: number; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const reg = ctx.speciesRegistry?.length ? ctx.speciesRegistry : null
  const rules = buildSpeciesRulesSnapshot(reg ?? undefined)

  const capKey = speciesCapKey(input.speciesKey, reg)
  const already = ctx.sameTeamDaySpeciesCounts.get(capKey) ?? 0

  if (input.catchKind === 'billfish_release') {
    if (!input.billfishVariant) errors.push('Select sailfish or marlin for billfish.')
    if (input.weightKg != null && input.weightKg > 0)
      warnings.push('Billfish are released — weight is ignored for scoring.')
    if (errors.length) return { points: 0, errors, warnings }
    const pts = billfishPoints(input.billfishVariant!)
    if (already >= MAX_PER_SPECIES_PER_BOAT_DAY) {
      errors.push(
        `Species cap: max ${MAX_PER_SPECIES_PER_BOAT_DAY} scoring ${capKey} per boat per day.`,
      )
      return { points: 0, errors, warnings }
    }
    warnings.push('Ensure IGFA release + required video with timestamp is presented at the scale.')
    return { points: pts, errors, warnings }
  }

  if (input.catchKind === 'length_release') {
    if (rules) {
      if (!rules.lengthSpeciesKeys.has(input.speciesKey)) {
        errors.push('This species is not open for length (measure-and-release) entry.')
      }
    } else if (
      input.speciesKey !== SPECIES_KEYS.kingfish &&
      input.speciesKey !== SPECIES_KEYS.kakaap
    ) {
      errors.push('Length scoring applies only to kingfish or kakaap.')
    }
    if (input.lengthCm == null || Number.isNaN(input.lengthCm)) {
      errors.push('Enter length in cm.')
    }
    if (errors.length) return { points: 0, errors, warnings }
    const { points, warnings: w } = lengthReleasePoints(input.lengthCm!)
    warnings.push(...w)
    if (points <= 0) return { points: 0, errors, warnings }
    if (already >= MAX_PER_SPECIES_PER_BOAT_DAY) {
      errors.push(
        `Species cap: max ${MAX_PER_SPECIES_PER_BOAT_DAY} scoring ${capKey} per boat per day.`,
      )
      return { points: 0, errors, warnings }
    }
    return { points, errors, warnings }
  }

  // weighed_gamefish
  if (rules) {
    if (rules.lengthSpeciesKeys.has(input.speciesKey)) {
      errors.push(
        'This species uses measure-and-release scoring — use the length entry type.',
      )
      return { points: 0, errors, warnings }
    }
    if (input.speciesKey === SPECIES_KEYS.marlin || input.speciesKey === SPECIES_KEYS.sailfish) {
      errors.push('Billfish use the billfish (release) entry type.')
      return { points: 0, errors, warnings }
    }
    if (!rules.weighedSpeciesKeys.has(input.speciesKey)) {
      errors.push(
        'This species is not in the weighed catalogue — add it under Species or choose another species.',
      )
      return { points: 0, errors, warnings }
    }
  } else {
    if (
      input.speciesKey === SPECIES_KEYS.kingfish ||
      input.speciesKey === SPECIES_KEYS.kakaap
    ) {
      errors.push(
        'Kingfish and kakaap use measure-and-release scoring — use the length entry type.',
      )
      return { points: 0, errors, warnings }
    }
    if (input.speciesKey === SPECIES_KEYS.marlin || input.speciesKey === SPECIES_KEYS.sailfish) {
      errors.push('Billfish use the billfish (release) entry type.')
      return { points: 0, errors, warnings }
    }
  }
  if (input.weightKg == null || Number.isNaN(input.weightKg)) {
    errors.push('Enter weight in kg.')
    return { points: 0, errors, warnings }
  }
  const { points, warnings: w } = weighedGamefishPoints(input.weightKg)
  warnings.push(...w)
  if (points <= 0) return { points: 0, errors, warnings }
  if (already >= MAX_PER_SPECIES_PER_BOAT_DAY) {
    errors.push(
      `Species cap: max ${MAX_PER_SPECIES_PER_BOAT_DAY} scoring ${capKey} per boat per day.`,
    )
    return { points: 0, errors, warnings }
  }
  return { points, errors, warnings }
}

/** Distinct species keys that count toward the +2 per extra species (per boat per day). */
export function distinctSpeciesForDiversity(
  catches: { speciesKey: string; pointsTotal: number }[],
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): Set<string> {
  const set = new Set<string>()
  const reg = speciesRegistry?.length ? speciesRegistry : null
  for (const c of catches) {
    if (c.pointsTotal > 0) set.add(speciesCapKey(c.speciesKey, reg))
  }
  return set
}

export function speciesDiversityBonus(speciesCount: number): number {
  if (speciesCount <= 1) return 0
  return (speciesCount - 1) * SPECIES_DIVERSITY_PER_EXTRA
}

/** Counts scoring fish (points > 0) per cap species for team+day (for 6-fish cap). */
export function sameTeamDaySpeciesCounts(
  catches: {
    id?: string
    teamId: string
    competitionDayId: string
    speciesKey: string
    pointsTotal: number
  }[],
  teamId: string,
  dayId: string,
  /** When editing a row, exclude it so caps reflect “as if” this catch were replaced. */
  excludeCatchId?: string,
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): Map<string, number> {
  const reg = speciesRegistry?.length ? speciesRegistry : null
  const m = new Map<string, number>()
  for (const c of catches) {
    if (excludeCatchId && c.id === excludeCatchId) continue
    if (c.teamId !== teamId || c.competitionDayId !== dayId) continue
    if (c.pointsTotal <= 0) continue
    const k = speciesCapKey(c.speciesKey, reg)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

export { MAX_PER_SPECIES_PER_BOAT_DAY, MIN_WEIGH_KG, SPECIES_DIVERSITY_PER_EXTRA }
