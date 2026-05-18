import type { SupabaseClient } from '@supabase/supabase-js'

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

export async function deleteAllCatchesForCompetition(
  client: SupabaseClient,
  teamIds: string[],
): Promise<{ error: string | null }> {
  if (teamIds.length === 0) return { error: null }
  const { error } = await client.from('catches').delete().in('team_id', teamIds)
  return { error: error?.message ?? null }
}

export async function deleteAllTeamDayOverridesForCompetition(
  client: SupabaseClient,
  teamIds: string[],
): Promise<{ error: string | null }> {
  if (teamIds.length === 0) return { error: null }
  const { error } = await client
    .from('team_day_overrides')
    .delete()
    .in('team_id', teamIds)
  return { error: error?.message ?? null }
}

export async function deleteAllTeamsForCompetition(
  client: SupabaseClient,
  competitionId: string,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from('teams')
    .delete()
    .eq('competition_id', competitionId)
    .neq('id', NIL_UUID)
  return { error: error?.message ?? null }
}
