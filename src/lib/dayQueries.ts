import type { SupabaseClient } from '@supabase/supabase-js'
import type { CompetitionDay } from '../domain/aggregates'

type DayRow = { id: string; day_date: string; day_number: number }

export function mapCompetitionDay(row: DayRow): CompetitionDay {
  return {
    id: row.id,
    dayDate: row.day_date,
    dayNumber: row.day_number,
  }
}

export async function fetchCompetitionDays(
  client: SupabaseClient,
  competitionId: string,
): Promise<{ days: CompetitionDay[]; error: string | null }> {
  const { data, error } = await client
    .from('competition_days')
    .select('id, day_date, day_number')
    .eq('competition_id', competitionId)
    .order('day_number', { ascending: true })

  if (error) return { days: [], error: error.message }
  const rows = (data ?? []) as DayRow[]
  return { days: rows.map(mapCompetitionDay), error: null }
}
