import type { SupabaseClient } from '@supabase/supabase-js'
import { isScoreCategory } from '../domain/scoreCategory'
import type { Team, TeamMember } from '../types'

type TeamRow = { id: string; name: string }
type MemberRow = {
  id: string
  team_id: string
  name: string
  score_category: string | null
}

function mapMember(row: MemberRow): TeamMember {
  const scoreCategory =
    row.score_category && isScoreCategory(row.score_category)
      ? row.score_category
      : null
  return { id: row.id, name: row.name, scoreCategory }
}

export async function loadTeamsFromSupabase(
  client: SupabaseClient,
  competitionId: string,
): Promise<{ teams: Team[]; error: string | null }> {
  const { data: teamRows, error: teamErr } = await client
    .from('teams')
    .select('id, name')
    .eq('competition_id', competitionId)
    .order('created_at', { ascending: true })

  if (teamErr) return { teams: [], error: teamErr.message }

  const { data: memberRows, error: memberErr } = await client
    .from('team_members')
    .select('id, team_id, name, score_category')
    .order('created_at', { ascending: true })

  if (memberErr) return { teams: [], error: memberErr.message }

  const membersByTeam = new Map<string, TeamMember[]>()
  for (const m of (memberRows ?? []) as MemberRow[]) {
    const list = membersByTeam.get(m.team_id) ?? []
    list.push(mapMember(m))
    membersByTeam.set(m.team_id, list)
  }

  const teams: Team[] = ((teamRows ?? []) as TeamRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    members: membersByTeam.get(row.id) ?? [],
  }))

  return { teams, error: null }
}
