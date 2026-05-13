import { useCallback, useEffect, useState } from 'react'
import type { TeamDayOverride } from '../domain/aggregates'
import {
  fetchTeamDayOverrides,
  upsertTeamDayOverride,
} from '../lib/catchQueries'
import { getSupabaseClient } from '../lib/supabaseClient'

export type UseTeamDayOverridesResult = {
  overrides: TeamDayOverride[]
  loading: boolean
  error: string | null
  clearError: () => void
  refresh: () => Promise<void>
  setDisqualified: (
    teamId: string,
    competitionDayId: string,
    disqualified: boolean,
    reason: string | null,
  ) => Promise<{ error: string | null }>
}

export function useTeamDayOverrides(
  enabled: boolean,
  canMutate: boolean,
): UseTeamDayOverridesResult {
  const [overrides, setOverrides] = useState<TeamDayOverride[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const client = getSupabaseClient()
    if (!client) return
    const { overrides: next, error: err } = await fetchTeamDayOverrides(client)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setOverrides(next)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setOverrides([])
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      await refresh()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, refresh])

  const setDisqualified = useCallback(
    async (
      teamId: string,
      competitionDayId: string,
      disqualified: boolean,
      reason: string | null,
    ) => {
      if (!canMutate) {
        return { error: 'Admin sign-in required to change disqualifications.' }
      }
      const client = getSupabaseClient()
      if (!client) return { error: 'Supabase not configured' as string | null }
      const { error: err } = await upsertTeamDayOverride(client, {
        teamId,
        competitionDayId,
        disqualified,
        reason,
      })
      if (err) {
        setError(err)
        return { error: err }
      }
      setError(null)
      await refresh()
      return { error: null as string | null }
    },
    [refresh, canMutate],
  )

  const clearError = useCallback(() => setError(null), [])

  return { overrides, loading, error, clearError, refresh, setDisqualified }
}
