import {
  DEFAULT_SCORING_CONFIG,
  type LengthTier,
  type ScoringConfig,
} from './competitionConfig'
import {
  SPECIES_KEYS,
  buildSpeciesRulesSnapshot,
  speciesCapKey,
  type SpeciesRegistryEntry,
} from './species'

export type CatchKind = 'weighed_gamefish' | 'billfish_release' | 'length_release'

export type CatchInput = {
  catchKind: CatchKind
  speciesKey: string
  weightKg: number | null
  lengthCm: number | null
  billfishVariant: string | null
}

export type CatchValidationContext = {
  sameTeamDaySpeciesCounts: Map<string, number>
  speciesRegistry?: SpeciesRegistryEntry[] | null
  scoringConfig?: ScoringConfig
}

function cfg(ctx: CatchValidationContext): ScoringConfig {
  return ctx.scoringConfig ?? DEFAULT_SCORING_CONFIG
}

function pointsFromWeighedKg(kg: number): number {
  return Math.max(0, Math.round(kg * 100) / 100)
}

function weighedGamefishPoints(
  weightKg: number,
  scoring: ScoringConfig,
): { points: number; warnings: string[] } {
  const warnings: string[] = []
  if (weightKg < scoring.minWeighKg) {
    return {
      points: 0,
      warnings: [
        `Below minimum weight (${scoring.minWeighKg} kg) — fish does not score.`,
      ],
    }
  }
  let pts = pointsFromWeighedKg(weightKg)
  if (weightKg > 10) {
    pts += scoring.bonusOver10Kg
    warnings.push(
      `Applied +${scoring.bonusOver10Kg} bonus for weight over 10 kg.`,
    )
  }
  return { points: Math.round(pts * 100) / 100, warnings }
}

function lengthTiersForSpecies(
  speciesKey: string,
  scoring: ScoringConfig,
  reg: SpeciesRegistryEntry[] | null,
): LengthTier[] {
  if (reg?.length && scoring.lengthTiersByGroup) {
    const entry = reg.find((e) => e.key === speciesKey)
    const group = entry?.capGroup?.trim()
    if (group && scoring.lengthTiersByGroup[group]?.length) {
      return scoring.lengthTiersByGroup[group]
    }
  }
  if (scoring.lengthTiers.length) return scoring.lengthTiers
  return DEFAULT_SCORING_CONFIG.lengthTiers
}

function lengthReleasePoints(
  lengthCm: number,
  tiers: LengthTier[],
): { points: number; warnings: string[] } {
  const sorted = [...tiers].sort((a, b) => a.minCm - b.minCm)
  const minTier = sorted[0]
  if (minTier && lengthCm < minTier.minCm) {
    return {
      points: 0,
      warnings: [
        `Length under ${minTier.minCm} cm — fish does not score on the length table.`,
      ],
    }
  }
  for (const tier of sorted) {
    const inMax = tier.maxCm == null || lengthCm < tier.maxCm
    if (lengthCm >= tier.minCm && inMax) {
      return { points: tier.points, warnings: [] }
    }
  }
  const top = sorted[sorted.length - 1]
  if (top && lengthCm >= top.minCm) {
    return { points: top.points, warnings: [] }
  }
  return { points: 0, warnings: ['Length does not match any scoring tier.'] }
}

function billfishPoints(variant: string, scoring: ScoringConfig): number {
  const custom = scoring.billfishPointsByVariant?.[variant]
  if (custom != null) return custom
  if (variant === 'sailfish') return scoring.billfishPoints.sailfish
  if (variant === 'marlin') return scoring.billfishPoints.marlin
  return 0
}

export function scoreSingleCatch(
  input: CatchInput,
  ctx: CatchValidationContext,
): { points: number; errors: string[]; warnings: string[] } {
  const scoring = cfg(ctx)
  const capMax = scoring.maxPerSpeciesPerBoatDay
  const errors: string[] = []
  const warnings: string[] = []
  const reg = ctx.speciesRegistry?.length ? ctx.speciesRegistry : null
  const rules = buildSpeciesRulesSnapshot(reg ?? undefined)

  const capKey = speciesCapKey(input.speciesKey, reg)
  const already = ctx.sameTeamDaySpeciesCounts.get(capKey) ?? 0

  if (input.catchKind === 'billfish_release') {
    if (!input.billfishVariant) errors.push('Select billfish species.')
    if (input.weightKg != null && input.weightKg > 0)
      warnings.push('Billfish are released — weight is ignored for scoring.')
    if (errors.length) return { points: 0, errors, warnings }
    const pts = billfishPoints(input.billfishVariant!, scoring)
    if (pts <= 0) {
      errors.push('Unknown billfish species for this competition.')
      return { points: 0, errors, warnings }
    }
    if (already >= capMax) {
      errors.push(
        `Species cap: max ${capMax} scoring ${capKey} per boat per day.`,
      )
      return { points: 0, errors, warnings }
    }
    warnings.push(
      'Ensure IGFA release + required video with timestamp is presented at the scale.',
    )
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
    const tiers = lengthTiersForSpecies(input.speciesKey, scoring, reg)
    const { points, warnings: w } = lengthReleasePoints(input.lengthCm!, tiers)
    warnings.push(...w)
    if (points <= 0) return { points: 0, errors, warnings }
    if (already >= capMax) {
      errors.push(
        `Species cap: max ${capMax} scoring ${capKey} per boat per day.`,
      )
      return { points: 0, errors, warnings }
    }
    return { points, errors, warnings }
  }

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
  const { points, warnings: w } = weighedGamefishPoints(input.weightKg, scoring)
  warnings.push(...w)
  if (points <= 0) return { points: 0, errors, warnings }
  if (already >= capMax) {
    errors.push(
      `Species cap: max ${capMax} scoring ${capKey} per boat per day.`,
    )
    return { points: 0, errors, warnings }
  }
  return { points, errors, warnings }
}

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

export function speciesDiversityBonus(
  speciesCount: number,
  scoringConfig: ScoringConfig = DEFAULT_SCORING_CONFIG,
): number {
  if (speciesCount <= 1) return 0
  return (speciesCount - 1) * scoringConfig.speciesDiversityPerExtra
}

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

export const MAX_PER_SPECIES_PER_BOAT_DAY =
  DEFAULT_SCORING_CONFIG.maxPerSpeciesPerBoatDay
export const MIN_WEIGH_KG = DEFAULT_SCORING_CONFIG.minWeighKg
export const SPECIES_DIVERSITY_PER_EXTRA =
  DEFAULT_SCORING_CONFIG.speciesDiversityPerExtra
