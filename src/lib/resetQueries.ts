import type { SupabaseClient } from '@supabase/supabase-js'

/** Sentinel UUID that no row should use; allows PostgREST “delete all rows” filter. */
const NIL_UUID = '00000000-0000-0000-0000-000000000000'

export async function deleteAllCatches(
  client: SupabaseClient,
): Promise<{ error: string | null }> {
  const { error } = await client.from('catches').delete().neq('id', NIL_UUID)
  return { error: error?.message ?? null }
}

export async function deleteAllTeamDayOverrides(
  client: SupabaseClient,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from('team_day_overrides')
    .delete()
    .neq('id', NIL_UUID)
  return { error: error?.message ?? null }
}

/** Removes every team (members, catches, and overrides cascade). Competition days unchanged. */
export async function deleteAllTeams(
  client: SupabaseClient,
): Promise<{ error: string | null }> {
  const { error } = await client.from('teams').delete().neq('id', NIL_UUID)
  return { error: error?.message ?? null }
}
