import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScoringConfig } from '../domain/competitionConfig'
import type { CatchRow, TeamDayOverride } from '../domain/aggregates'
import type { SpeciesRegistryEntry } from '../domain/species'
import {
  type CatchInput,
  type CatchKind,
  sameTeamDaySpeciesCounts,
  scoreSingleCatch,
} from '../domain/scoringEngine'
import { roundPoints } from './formatPoints'

type CatchDb = {
  id: string
  team_id: string
  angler_id: string
  competition_day_id: string
  catch_kind: string
  species_key: string
  weight_kg: number | null
  length_cm: number | null
  billfish_variant: string | null
  points_total: number
  notes: string | null
  created_at?: string | null
}

function catchRowToInput(c: CatchRow): CatchInput | null {
  if (
    c.catchKind !== 'weighed_gamefish' &&
    c.catchKind !== 'billfish_release' &&
    c.catchKind !== 'length_release'
  ) {
    return null
  }
  return {
    catchKind: c.catchKind as CatchKind,
    speciesKey: c.speciesKey,
    weightKg: c.weightKg,
    lengthCm: c.lengthCm,
    billfishVariant:
      c.billfishVariant && c.billfishVariant.trim()
        ? c.billfishVariant.trim()
        : null,
  }
}

/**
 * Recompute fish points from row fields (weight/length/kind) in created_at order per team+day
 * so fractional kg and species caps match current rules; DB `points_total` may be stale.
 */
export function rehydrateCatchFishPoints(
  catches: CatchRow[],
  speciesRegistry?: SpeciesRegistryEntry[] | null,
  scoringConfig?: ScoringConfig,
): CatchRow[] {
  const byKey = new Map<string, CatchRow[]>()
  for (const c of catches) {
    const k = `${c.teamId}:${c.competitionDayId}`
    const arr = byKey.get(k) ?? []
    arr.push(c)
    byKey.set(k, arr)
  }

  const idToHydrated = new Map<string, CatchRow>()
  for (const group of byKey.values()) {
    const sorted = [...group].sort((a, b) => {
      if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
        return a.createdAt < b.createdAt ? -1 : 1
      }
      return a.id.localeCompare(b.id)
    })
    const acc: CatchRow[] = []
    let scoringFishIndex = 0
    const extraPerFish = scoringConfig?.bonusPerScoringFishAfterFirst ?? 0
    for (const c of sorted) {
      const input = catchRowToInput(c)
      let next: CatchRow
      if (!input) {
        next = { ...c, pointsTotal: roundPoints(c.pointsTotal) }
      } else {
        const counts = sameTeamDaySpeciesCounts(
          acc,
          c.teamId,
          c.competitionDayId,
          undefined,
          speciesRegistry,
        )
        const { points, errors } = scoreSingleCatch(input, {
          sameTeamDaySpeciesCounts: counts,
          speciesRegistry,
          scoringConfig,
        })
        let pts = errors.length ? 0 : points
        if (pts > 0) {
          scoringFishIndex += 1
          if (extraPerFish > 0 && scoringFishIndex > 1) {
            pts += extraPerFish
          }
        }
        next = {
          ...c,
          pointsTotal: roundPoints(pts),
        }
      }
      acc.push(next)
      idToHydrated.set(c.id, next)
    }
  }

  return catches.map((c) => idToHydrated.get(c.id) ?? c)
}

export function mapCatch(row: CatchDb): CatchRow {
  return {
    id: row.id,
    teamId: row.team_id,
    anglerId: row.angler_id,
    competitionDayId: row.competition_day_id,
    catchKind: row.catch_kind,
    speciesKey: row.species_key,
    weightKg: row.weight_kg,
    lengthCm: row.length_cm,
    billfishVariant: row.billfish_variant,
    pointsTotal: roundPoints(Number(row.points_total)),
    notes: row.notes ?? null,
    createdAt: row.created_at ?? null,
  }
}

export async function fetchCatches(
  client: SupabaseClient,
  teamIds: string[],
  speciesRegistry?: SpeciesRegistryEntry[] | null,
  scoringConfig?: ScoringConfig,
): Promise<{ catches: CatchRow[]; error: string | null }> {
  if (teamIds.length === 0) {
    return { catches: [], error: null }
  }
  const { data, error } = await client
    .from('catches')
    .select(
      'id, team_id, angler_id, competition_day_id, catch_kind, species_key, weight_kg, length_cm, billfish_variant, points_total, notes, created_at',
    )
    .in('team_id', teamIds)
    .order('created_at', { ascending: false })

  if (error) return { catches: [], error: error.message }
  const mapped = ((data ?? []) as CatchDb[]).map(mapCatch)
  return {
    catches: rehydrateCatchFishPoints(mapped, speciesRegistry, scoringConfig),
    error: null,
  }
}

type OverrideDb = {
  team_id: string
  competition_day_id: string
  disqualified: boolean
  reason: string | null
}

export function mapOverride(row: OverrideDb): TeamDayOverride {
  return {
    teamId: row.team_id,
    competitionDayId: row.competition_day_id,
    disqualified: row.disqualified,
    reason: row.reason,
  }
}

export async function fetchTeamDayOverrides(
  client: SupabaseClient,
  teamIds: string[],
): Promise<{ overrides: TeamDayOverride[]; error: string | null }> {
  if (teamIds.length === 0) {
    return { overrides: [], error: null }
  }
  const { data, error } = await client
    .from('team_day_overrides')
    .select('team_id, competition_day_id, disqualified, reason')
    .in('team_id', teamIds)

  if (error) return { overrides: [], error: error.message }
  return {
    overrides: ((data ?? []) as OverrideDb[]).map(mapOverride),
    error: null,
  }
}

export async function upsertTeamDayOverride(
  client: SupabaseClient,
  row: {
    teamId: string
    competitionDayId: string
    disqualified: boolean
    reason: string | null
  },
): Promise<{ error: string | null }> {
  const { error } = await client.from('team_day_overrides').upsert(
    {
      team_id: row.teamId,
      competition_day_id: row.competitionDayId,
      disqualified: row.disqualified,
      reason: row.reason,
    },
    { onConflict: 'team_id,competition_day_id' },
  )
  return { error: error?.message ?? null }
}

export async function insertCatchRow(
  client: SupabaseClient,
  row: {
    id: string
    teamId: string
    anglerId: string
    competitionDayId: string
    catchKind: string
    speciesKey: string
    weightKg: number | null
    lengthCm: number | null
    billfishVariant: string | null
    pointsTotal: number
    notes: string | null
  },
): Promise<{ error: string | null }> {
  const { error } = await client.from('catches').insert({
    id: row.id,
    team_id: row.teamId,
    angler_id: row.anglerId,
    competition_day_id: row.competitionDayId,
    catch_kind: row.catchKind,
    species_key: row.speciesKey,
    weight_kg: row.weightKg,
    length_cm: row.lengthCm,
    billfish_variant: row.billfishVariant,
    points_total: row.pointsTotal,
    notes: row.notes,
  })
  return { error: error?.message ?? null }
}

export async function updateCatchRow(
  client: SupabaseClient,
  row: {
    id: string
    teamId: string
    anglerId: string
    competitionDayId: string
    catchKind: string
    speciesKey: string
    weightKg: number | null
    lengthCm: number | null
    billfishVariant: string | null
    pointsTotal: number
    notes: string | null
  },
): Promise<{ error: string | null }> {
  const { error } = await client
    .from('catches')
    .update({
      team_id: row.teamId,
      angler_id: row.anglerId,
      competition_day_id: row.competitionDayId,
      catch_kind: row.catchKind,
      species_key: row.speciesKey,
      weight_kg: row.weightKg,
      length_cm: row.lengthCm,
      billfish_variant: row.billfishVariant,
      points_total: row.pointsTotal,
      notes: row.notes,
    })
    .eq('id', row.id)
  return { error: error?.message ?? null }
}

export async function deleteCatchById(
  client: SupabaseClient,
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await client.from('catches').delete().eq('id', id)
  return { error: error?.message ?? null }
}
