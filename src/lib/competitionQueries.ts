import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DEFAULT_RULES_SECTIONS,
  DEFAULT_SCHEDULE_CONFIG,
  DEFAULT_SCORING_CONFIG,
  parseRulesConfig,
  parseScheduleConfig,
  parseScoringConfig,
  rulesConfigToJson,
  scoringConfigToJson,
  type RulesSection,
  type ScheduleConfig,
  type ScoringConfig,
} from '../domain/competitionConfig'

export type Competition = {
  id: string
  slug: string
  name: string
  isActive: boolean
  year: number | null
  venue: string | null
  rulesSections: RulesSection[]
  scoringConfig: ScoringConfig
  schedule: ScheduleConfig
  createdAt: string
  updatedAt: string
}

type RawCompetition = {
  id: string
  slug: string
  name: string
  is_active: boolean
  year: number | null
  venue: string | null
  rules_config: unknown
  scoring_config: unknown
  schedule_config: unknown
  created_at: string
  updated_at: string
}

export function mapCompetition(row: RawCompetition): Competition {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isActive: row.is_active,
    year: row.year,
    venue: row.venue,
    rulesSections: parseRulesConfig(row.rules_config),
    scoringConfig: parseScoringConfig(row.scoring_config),
    schedule: parseScheduleConfig(row.schedule_config),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const COMPETITION_COLUMNS =
  'id, slug, name, is_active, year, venue, rules_config, scoring_config, schedule_config, created_at, updated_at'

export async function fetchCompetitions(
  client: SupabaseClient,
): Promise<{ competitions: Competition[]; error: string | null }> {
  const { data, error } = await client
    .from('competitions')
    .select(COMPETITION_COLUMNS)
    .order('created_at', { ascending: true })

  if (error) return { competitions: [], error: error.message }
  return {
    competitions: ((data ?? []) as RawCompetition[]).map(mapCompetition),
    error: null,
  }
}

export async function insertCompetition(
  client: SupabaseClient,
  input: {
    slug: string
    name: string
    year?: number | null
    venue?: string | null
    rulesSections?: RulesSection[]
    scoringConfig?: ScoringConfig
    schedule?: ScheduleConfig
    seedScheduleDays?: boolean
  },
): Promise<{ competition: Competition | null; error: string | null }> {
  const slug = input.slug.trim().toLowerCase().replace(/\s+/g, '-')
  if (!slug) return { competition: null, error: 'Slug is required.' }
  const name = input.name.trim()
  if (!name) return { competition: null, error: 'Name is required.' }

  const rules = input.rulesSections ?? DEFAULT_RULES_SECTIONS
  const scoring = input.scoringConfig ?? DEFAULT_SCORING_CONFIG
  const schedule = input.schedule ?? DEFAULT_SCHEDULE_CONFIG
  const now = new Date().toISOString()

  const { data, error } = await client
    .from('competitions')
    .insert({
      slug,
      name,
      is_active: false,
      year: input.year ?? null,
      venue: input.venue?.trim() || null,
      rules_config: rulesConfigToJson(rules),
      scoring_config: scoringConfigToJson(scoring),
      schedule_config: schedule,
      updated_at: now,
    })
    .select(COMPETITION_COLUMNS)
    .single()

  if (error) return { competition: null, error: error.message }
  const competition = mapCompetition(data as RawCompetition)

  if (input.seedScheduleDays !== false && schedule.days?.length) {
    const { error: dayErr } = await seedCompetitionDays(client, competition.id, schedule.days)
    if (dayErr) return { competition, error: dayErr }
  }

  return { competition, error: null }
}

export async function seedCompetitionDays(
  client: SupabaseClient,
  competitionId: string,
  days: { dayNumber: number; isoDate: string }[],
): Promise<{ error: string | null }> {
  const rows = days.map((d) => ({
    competition_id: competitionId,
    day_date: d.isoDate,
    day_number: d.dayNumber,
  }))
  const { error } = await client.from('competition_days').upsert(rows, {
    onConflict: 'competition_id,day_date',
    ignoreDuplicates: true,
  })
  return { error: error?.message ?? null }
}

export async function setActiveCompetition(
  client: SupabaseClient,
  competitionId: string,
): Promise<{ error: string | null }> {
  const { error: offErr } = await client
    .from('competitions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('is_active', true)

  if (offErr) return { error: offErr.message }

  const { error: onErr } = await client
    .from('competitions')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', competitionId)

  return { error: onErr?.message ?? null }
}

export async function cloneDefaultSpeciesForCompetition(
  client: SupabaseClient,
  fromCompetitionId: string,
  toCompetitionId: string,
): Promise<{ error: string | null }> {
  const { data, error } = await client
    .from('species_registry')
    .select('key, label, category, cap_group, sort_order, active')
    .eq('competition_id', fromCompetitionId)

  if (error) return { error: error.message }
  if (!data?.length) return { error: null }

  const rows = data.map((r) => ({
    ...r,
    competition_id: toCompetitionId,
  }))
  const { error: insErr } = await client
    .from('species_registry')
    .upsert(rows, { onConflict: 'competition_id,key', ignoreDuplicates: true })

  return { error: insErr?.message ?? null }
}
