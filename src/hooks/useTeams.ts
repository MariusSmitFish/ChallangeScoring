import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScoreCategory } from '../domain/scoreCategory'
import { getSupabaseClient } from '../lib/supabaseClient'
import { loadTeamsFromSupabase } from '../lib/teamQueries'
import type { Team } from '../types'

export type UseTeamsResult = {
  teams: Team[]
  loading: boolean
  syncing: boolean
  error: string | null
  clearError: () => void
  misconfigured: boolean
  refresh: (background?: boolean) => Promise<void>
  addTeam: (name: string) => Promise<void>
  renameTeam: (teamId: string, name: string) => Promise<void>
  removeTeam: (teamId: string) => Promise<void>
  addMember: (
    teamId: string,
    name: string,
    scoreCategory?: ScoreCategory | null,
  ) => Promise<void>
  renameMember: (teamId: string, memberId: string, name: string) => Promise<void>
  setMemberScoreCategory: (
    teamId: string,
    memberId: string,
    scoreCategory: ScoreCategory | null,
  ) => Promise<void>
  removeMember: (teamId: string, memberId: string) => Promise<void>
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function useTeams(
  canMutate: boolean,
  competitionId: string | null,
): UseTeamsResult {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const misconfigured = !supabase

  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(!misconfigured && !!competitionId)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshCloud = useCallback(
    async (client: SupabaseClient, compId: string) => {
      const { teams: next, error: err } = await loadTeamsFromSupabase(client, compId)
      if (err) {
        setError(err)
        return false
      }
      setError(null)
      setTeams(next)
      return true
    },
    [],
  )

  const refresh = useCallback(
    async (background = false) => {
      if (!supabase || !competitionId) return
      if (background) setSyncing(true)
      else setLoading(true)
      try {
        await refreshCloud(supabase, competitionId)
      } finally {
        if (background) setSyncing(false)
        else setLoading(false)
      }
    },
    [supabase, competitionId, refreshCloud],
  )

  useEffect(() => {
    if (!supabase || !competitionId) {
      setTeams([])
      setLoading(false)
      setSyncing(false)
      setError(null)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      await refreshCloud(supabase, competitionId)
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, competitionId, refreshCloud])

  const addTeam = useCallback(
    async (name: string) => {
      if (!supabase || !canMutate || !competitionId) return
      const trimmed = name.trim()
      if (!trimmed) return

      const id = newId()
      const snapshot = teams
      setTeams((prev) => [...prev, { id, name: trimmed, members: [] }])
      setSyncing(true)
      const { error: insErr } = await supabase.from('teams').insert({
        id,
        name: trimmed,
        competition_id: competitionId,
      })
      if (insErr) {
        setTeams(snapshot)
        setError(insErr.message)
        setSyncing(false)
        return
      }
      setError(null)
      await refreshCloud(supabase, competitionId)
      setSyncing(false)
    },
    [supabase, refreshCloud, canMutate, competitionId, teams],
  )

  const renameTeam = useCallback(
    async (teamId: string, name: string) => {
      if (!supabase || !canMutate || !competitionId) return
      const trimmed = name.trim()
      if (!trimmed) return

      const snapshot = teams
      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, name: trimmed } : t)),
      )
      setSyncing(true)
      const { error: upErr } = await supabase
        .from('teams')
        .update({ name: trimmed })
        .eq('id', teamId)
      if (upErr) {
        setTeams(snapshot)
        setError(upErr.message)
        setSyncing(false)
        return
      }
      setError(null)
      setSyncing(false)
    },
    [supabase, canMutate, competitionId, teams],
  )

  const removeTeam = useCallback(
    async (teamId: string) => {
      if (!supabase || !canMutate || !competitionId) return

      const snapshot = teams
      setTeams((prev) => prev.filter((t) => t.id !== teamId))
      setSyncing(true)
      const { error: delErr } = await supabase.from('teams').delete().eq('id', teamId)
      if (delErr) {
        setTeams(snapshot)
        setError(delErr.message)
        setSyncing(false)
        return
      }
      setError(null)
      setSyncing(false)
    },
    [supabase, canMutate, competitionId, teams],
  )

  const addMember = useCallback(
    async (
      teamId: string,
      name: string,
      scoreCategory: ScoreCategory | null = null,
    ) => {
      if (!supabase || !canMutate || !competitionId) return
      const trimmed = name.trim()
      if (!trimmed) return

      const id = newId()
      const snapshot = teams
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? {
                ...t,
                members: [
                  ...t.members,
                  { id, name: trimmed, scoreCategory },
                ],
              }
            : t,
        ),
      )
      setSyncing(true)
      const { error: insErr } = await supabase.from('team_members').insert({
        id,
        team_id: teamId,
        name: trimmed,
        score_category: scoreCategory,
      })
      if (insErr) {
        setTeams(snapshot)
        setError(insErr.message)
        setSyncing(false)
        return
      }
      setError(null)
      setSyncing(false)
    },
    [supabase, canMutate, competitionId, teams],
  )

  const renameMember = useCallback(
    async (teamId: string, memberId: string, name: string) => {
      if (!supabase || !canMutate || !competitionId) return
      const trimmed = name.trim()
      if (!trimmed) return

      const snapshot = teams
      setTeams((prev) =>
        prev.map((t) =>
          t.id !== teamId
            ? t
            : {
                ...t,
                members: t.members.map((m) =>
                  m.id === memberId ? { ...m, name: trimmed } : m,
                ),
              },
        ),
      )
      setSyncing(true)
      const { error: upErr } = await supabase
        .from('team_members')
        .update({ name: trimmed })
        .eq('id', memberId)
        .eq('team_id', teamId)
      if (upErr) {
        setTeams(snapshot)
        setError(upErr.message)
        setSyncing(false)
        return
      }
      setError(null)
      setSyncing(false)
    },
    [supabase, canMutate, competitionId, teams],
  )

  const setMemberScoreCategory = useCallback(
    async (
      teamId: string,
      memberId: string,
      scoreCategory: ScoreCategory | null,
    ) => {
      if (!supabase || !canMutate || !competitionId) return

      const snapshot = teams
      setTeams((prev) =>
        prev.map((t) =>
          t.id !== teamId
            ? t
            : {
                ...t,
                members: t.members.map((m) =>
                  m.id === memberId ? { ...m, scoreCategory } : m,
                ),
              },
        ),
      )
      setSyncing(true)
      const { error: upErr } = await supabase
        .from('team_members')
        .update({ score_category: scoreCategory })
        .eq('id', memberId)
        .eq('team_id', teamId)
      if (upErr) {
        setTeams(snapshot)
        setError(upErr.message)
        setSyncing(false)
        return
      }
      setError(null)
      setSyncing(false)
    },
    [supabase, canMutate, competitionId, teams],
  )

  const removeMember = useCallback(
    async (teamId: string, memberId: string) => {
      if (!supabase || !canMutate || !competitionId) return

      const snapshot = teams
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, members: t.members.filter((m) => m.id !== memberId) }
            : t,
        ),
      )
      setSyncing(true)
      const { error: delErr } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
        .eq('team_id', teamId)
      if (delErr) {
        setTeams(snapshot)
        setError(delErr.message)
        setSyncing(false)
        return
      }
      setError(null)
      setSyncing(false)
    },
    [supabase, canMutate, competitionId, teams],
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    teams,
    loading,
    syncing,
    error,
    clearError,
    misconfigured,
    refresh,
    addTeam,
    renameTeam,
    removeTeam,
    addMember,
    renameMember,
    setMemberScoreCategory,
    removeMember,
  }
}
