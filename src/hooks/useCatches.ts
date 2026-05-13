import { useCallback, useEffect, useState } from 'react'
import type { CatchRow } from '../domain/aggregates'
import type { SpeciesRegistryEntry } from '../domain/species'
import {
  deleteCatchById,
  fetchCatches,
  insertCatchRow,
  updateCatchRow,
} from '../lib/catchQueries'
import { getSupabaseClient } from '../lib/supabaseClient'

export type InsertCatchPayload = {
  teamId: string
  anglerId: string
  competitionDayId: string
  catchKind: string
  speciesKey: string
  weightKg: number | null
  lengthCm: number | null
  billfishVariant: string | null
  pointsTotal: number
  notes: string | null
}

export type UseCatchesResult = {
  catches: CatchRow[]
  loading: boolean
  error: string | null
  clearError: () => void
  refresh: () => Promise<void>
  addCatch: (payload: InsertCatchPayload) => Promise<{ error: string | null }>
  updateCatch: (
    id: string,
    payload: InsertCatchPayload,
  ) => Promise<{ error: string | null }>
  deleteCatch: (id: string) => Promise<{ error: string | null }>
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function useCatches(
  enabled: boolean,
  canMutate: boolean,
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): UseCatchesResult {
  const [catches, setCatches] = useState<CatchRow[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const client = getSupabaseClient()
    if (!client) return
    const { catches: next, error: err } = await fetchCatches(client, speciesRegistry)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setCatches(next)
  }, [speciesRegistry])

  useEffect(() => {
    if (!enabled) {
      setCatches([])
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

  const addCatch = useCallback(
    async (payload: InsertCatchPayload) => {
      if (!canMutate) {
        return {
          error: 'Admin sign-in required to save catches.',
        }
      }
      const client = getSupabaseClient()
      if (!client) return { error: 'Supabase not configured' as string | null }
      const id = newId()
      const { error: err } = await insertCatchRow(client, { id, ...payload })
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

  const updateCatch = useCallback(
    async (id: string, payload: InsertCatchPayload) => {
      if (!canMutate) {
        return { error: 'Admin sign-in required to update catches.' }
      }
      const client = getSupabaseClient()
      if (!client) return { error: 'Supabase not configured' as string | null }
      const { error: err } = await updateCatchRow(client, { id, ...payload })
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

  const deleteCatch = useCallback(
    async (id: string) => {
      if (!canMutate) {
        return { error: 'Admin sign-in required to delete catches.' }
      }
      const client = getSupabaseClient()
      if (!client) return { error: 'Supabase not configured' as string | null }
      const { error: err } = await deleteCatchById(client, id)
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

  return {
    catches,
    loading,
    error,
    clearError,
    refresh,
    addCatch,
    updateCatch,
    deleteCatch,
  }
}
