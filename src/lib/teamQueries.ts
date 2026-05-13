import type { SupabaseClient } from '@supabase/supabase-js'
import type { Team, TeamMember } from '../types'

type TeamRow = { id: string; name: string }
type MemberRow = { id: string; team_id: string; name: string }

export async function loadTeamsFromSupabase(
  client: SupabaseClient,
): Promise<{ teams: Team[]; error: string | null }> {
  const { data: teamRows, error: teamErr } = await client
    .from('teams')
    .select('id, name')
    .order('created_at', { ascending: true })

  if (teamErr) return { teams: [], error: teamErr.message }

  const { data: memberRows, error: memberErr } = await client
    .from('team_members')
    .select('id, team_id, name')
    .order('created_at', { ascending: true })

  if (memberErr) return { teams: [], error: memberErr.message }

  const membersByTeam = new Map<string, TeamMember[]>()
  for (const m of (memberRows ?? []) as MemberRow[]) {
    const list = membersByTeam.get(m.team_id) ?? []
    list.push({ id: m.id, name: m.name })
    membersByTeam.set(m.team_id, list)
  }

  const teams: Team[] = ((teamRows ?? []) as TeamRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    members: membersByTeam.get(row.id) ?? [],
  }))

  return { teams, error: null }
}
