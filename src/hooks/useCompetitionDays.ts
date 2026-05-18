import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'
import { fetchCompetitionDays } from '../lib/dayQueries'
import type { CompetitionDay } from '../domain/aggregates'

export type UseCompetitionDaysResult = {
  days: CompetitionDay[]
  loading: boolean
  error: string | null
  clearError: () => void
  refresh: () => Promise<void>
}

export function useCompetitionDays(
  enabled: boolean,
  competitionId: string | null,
): UseCompetitionDaysResult {
  const [days, setDays] = useState<CompetitionDay[]>([])
  const [loading, setLoading] = useState(enabled && !!competitionId)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const client = getSupabaseClient()
    if (!client || !competitionId) return
    const { days: next, error: err } = await fetchCompetitionDays(client, competitionId)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setDays(next)
  }, [competitionId])

  useEffect(() => {
    if (!enabled || !competitionId) {
      setDays([])
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
  }, [enabled, competitionId, refresh])

  const clearError = useCallback(() => setError(null), [])

  return { days, loading, error, clearError, refresh }
}
