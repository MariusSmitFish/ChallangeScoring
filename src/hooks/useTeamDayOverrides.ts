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
  syncing: boolean
  error: string | null
  clearError: () => void
  refresh: (background?: boolean) => Promise<void>
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
  teamIds: string[],
): UseTeamDayOverridesResult {
  const [overrides, setOverrides] = useState<TeamDayOverride[]>([])
  const [loading, setLoading] = useState(enabled)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const teamKey = teamIds.join(',')

  const refresh = useCallback(
    async (background = false) => {
      const client = getSupabaseClient()
      if (!client) return
      if (background) setSyncing(true)
      else setLoading(true)
      try {
        const { overrides: next, error: err } = await fetchTeamDayOverrides(
          client,
          teamIds,
        )
        if (err) {
          setError(err)
          return
        }
        setError(null)
        setOverrides(next)
      } finally {
        if (background) setSyncing(false)
        else setLoading(false)
      }
    },
    [teamIds],
  )

  useEffect(() => {
    if (!enabled) {
      setOverrides([])
      setLoading(false)
      setSyncing(false)
      setError(null)
      return
    }
    void refresh(false)
  }, [enabled, teamKey, refresh])

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

      const snapshot = overrides
      setOverrides((prev) => {
        const rest = prev.filter(
          (o) => !(o.teamId === teamId && o.competitionDayId === competitionDayId),
        )
        if (!disqualified) return rest
        return [
          ...rest,
          { teamId, competitionDayId, disqualified: true, reason },
        ]
      })
      setSyncing(true)
      const { error: err } = await upsertTeamDayOverride(client, {
        teamId,
        competitionDayId,
        disqualified,
        reason,
      })
      if (err) {
        setOverrides(snapshot)
        setError(err)
        setSyncing(false)
        return { error: err }
      }
      setError(null)
      await refresh(true)
      return { error: null as string | null }
    },
    [refresh, canMutate, overrides],
  )

  const clearError = useCallback(() => setError(null), [])

  return { overrides, loading, syncing, error, clearError, refresh, setDisqualified }
}
