import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabaseClient'
import { loadTeamsFromSupabase } from '../lib/teamQueries'
import type { Team } from '../types'

export type UseTeamsResult = {
  teams: Team[]
  loading: boolean
  error: string | null
  clearError: () => void
  misconfigured: boolean
  refresh: () => Promise<void>
  addTeam: (name: string) => void
  renameTeam: (teamId: string, name: string) => void
  removeTeam: (teamId: string) => void
  addMember: (teamId: string, name: string) => void
  renameMember: (teamId: string, memberId: string, name: string) => void
  removeMember: (teamId: string, memberId: string) => void
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function useTeams(canMutate: boolean): UseTeamsResult {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const misconfigured = !supabase

  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(!misconfigured)
  const [error, setError] = useState<string | null>(null)

  const refreshCloud = useCallback(async (client: SupabaseClient) => {
    const { teams: next, error: err } = await loadTeamsFromSupabase(client)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setTeams(next)
  }, [])

  const refresh = useCallback(async () => {
    if (!supabase) return
    await refreshCloud(supabase)
  }, [supabase, refreshCloud])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      await refreshCloud(supabase)
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, refreshCloud])

  const addTeam = useCallback(
    (name: string) => {
      if (!supabase || !canMutate) return
      const trimmed = name.trim()
      if (!trimmed) return

      void (async () => {
        const id = newId()
        const { error: insErr } = await supabase
          .from('teams')
          .insert({ id, name: trimmed })
        if (insErr) {
          setError(insErr.message)
          return
        }
        setError(null)
        await refreshCloud(supabase)
      })()
    },
    [supabase, refreshCloud, canMutate],
  )

  const renameTeam = useCallback(
    (teamId: string, name: string) => {
      if (!supabase || !canMutate) return
      const trimmed = name.trim()
      if (!trimmed) return

      void (async () => {
        const { error: upErr } = await supabase
          .from('teams')
          .update({ name: trimmed })
          .eq('id', teamId)
        if (upErr) {
          setError(upErr.message)
          return
        }
        setError(null)
        await refreshCloud(supabase)
      })()
    },
    [supabase, refreshCloud, canMutate],
  )

  const removeTeam = useCallback(
    (teamId: string) => {
      if (!supabase || !canMutate) return

      void (async () => {
        const { error: delErr } = await supabase
          .from('teams')
          .delete()
          .eq('id', teamId)
        if (delErr) {
          setError(delErr.message)
          return
        }
        setError(null)
        await refreshCloud(supabase)
      })()
    },
    [supabase, refreshCloud, canMutate],
  )

  const addMember = useCallback(
    (teamId: string, name: string) => {
      if (!supabase || !canMutate) return
      const trimmed = name.trim()
      if (!trimmed) return

      void (async () => {
        const id = newId()
        const { error: insErr } = await supabase.from('team_members').insert({
          id,
          team_id: teamId,
          name: trimmed,
        })
        if (insErr) {
          setError(insErr.message)
          return
        }
        setError(null)
        await refreshCloud(supabase)
      })()
    },
    [supabase, refreshCloud, canMutate],
  )

  const renameMember = useCallback(
    (teamId: string, memberId: string, name: string) => {
      if (!supabase || !canMutate) return
      const trimmed = name.trim()
      if (!trimmed) return

      void (async () => {
        const { error: upErr } = await supabase
          .from('team_members')
          .update({ name: trimmed })
          .eq('id', memberId)
          .eq('team_id', teamId)
        if (upErr) {
          setError(upErr.message)
          return
        }
        setError(null)
        await refreshCloud(supabase)
      })()
    },
    [supabase, refreshCloud, canMutate],
  )

  const removeMember = useCallback(
    (teamId: string, memberId: string) => {
      if (!supabase || !canMutate) return

      void (async () => {
        const { error: delErr } = await supabase
          .from('team_members')
          .delete()
          .eq('id', memberId)
          .eq('team_id', teamId)
        if (delErr) {
          setError(delErr.message)
          return
        }
        setError(null)
        await refreshCloud(supabase)
      })()
    },
    [supabase, refreshCloud, canMutate],
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    teams,
    loading,
    error,
    clearError,
    misconfigured,
    refresh,
    addTeam,
    renameTeam,
    removeTeam,
    addMember,
    renameMember,
    removeMember,
  }
}
