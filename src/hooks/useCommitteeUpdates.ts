import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchCommitteeUpdates } from '../lib/committeeUpdateQueries'
import type { CommitteeUpdate } from '../lib/committeeUpdateQueries'
import { getSupabaseClient } from '../lib/supabaseClient'

export type UseCommitteeUpdatesResult = {
  updates: CommitteeUpdate[]
  loading: boolean
  error: string | null
  clearError: () => void
  refresh: () => Promise<void>
}

export function useCommitteeUpdates(
  enabled: boolean,
  canMutate: boolean,
  competitionId: string | null,
): UseCommitteeUpdatesResult {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const ok = enabled && !!supabase && !!competitionId

  const [updates, setUpdates] = useState<CommitteeUpdate[]>([])
  const [loading, setLoading] = useState(ok)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const client: SupabaseClient | null = getSupabaseClient()
    if (!client || !competitionId) return
    const { updates: next, error: err } = await fetchCommitteeUpdates(
      client,
      competitionId,
    )
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setUpdates(next)
  }, [competitionId])

  useEffect(() => {
    if (!ok) {
      setUpdates([])
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
  }, [ok, canMutate, competitionId, refresh])

  const clearError = useCallback(() => setError(null), [])

  return { updates, loading, error, clearError, refresh }
}
