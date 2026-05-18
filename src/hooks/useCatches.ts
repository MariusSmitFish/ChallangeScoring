import { useCallback, useEffect, useState } from 'react'
import type { ScoringConfig } from '../domain/competitionConfig'
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
  syncing: boolean
  error: string | null
  clearError: () => void
  refresh: (background?: boolean) => Promise<void>
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
  teamIds: string[],
  speciesRegistry?: SpeciesRegistryEntry[] | null,
  scoringConfig?: ScoringConfig,
): UseCatchesResult {
  const [catches, setCatches] = useState<CatchRow[]>([])
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
        const { catches: next, error: err } = await fetchCatches(
          client,
          teamIds,
          speciesRegistry,
          scoringConfig,
        )
        if (err) {
          setError(err)
          return
        }
        setError(null)
        setCatches(next)
      } finally {
        if (background) setSyncing(false)
        else setLoading(false)
      }
    },
    [teamIds, speciesRegistry, scoringConfig],
  )

  useEffect(() => {
    if (!enabled) {
      setCatches([])
      setLoading(false)
      setSyncing(false)
      setError(null)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      const client = getSupabaseClient()
      if (!client) {
        if (!cancelled) setLoading(false)
        return
      }
      const { catches: next, error: err } = await fetchCatches(
        client,
        teamIds,
        speciesRegistry,
        scoringConfig,
      )
      if (!cancelled) {
        if (err) setError(err)
        else {
          setError(null)
          setCatches(next)
        }
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, teamKey, speciesRegistry, scoringConfig, teamIds])

  const addCatch = useCallback(
    async (payload: InsertCatchPayload) => {
      if (!canMutate) {
        return { error: 'Admin sign-in required to save catches.' }
      }
      const client = getSupabaseClient()
      if (!client) return { error: 'Supabase not configured' as string | null }
      const id = newId()
      setSyncing(true)
      const { error: err } = await insertCatchRow(client, { id, ...payload })
      if (err) {
        setError(err)
        setSyncing(false)
        return { error: err }
      }
      setError(null)
      await refresh(true)
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
      setSyncing(true)
      const { error: err } = await updateCatchRow(client, { id, ...payload })
      if (err) {
        setError(err)
        setSyncing(false)
        return { error: err }
      }
      setError(null)
      await refresh(true)
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
      const snapshot = catches
      setCatches((prev) => prev.filter((c) => c.id !== id))
      setSyncing(true)
      const { error: err } = await deleteCatchById(client, id)
      if (err) {
        setCatches(snapshot)
        setError(err)
        setSyncing(false)
        return { error: err }
      }
      setError(null)
      await refresh(true)
      return { error: null as string | null }
    },
    [refresh, canMutate, catches],
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    catches,
    loading,
    syncing,
    error,
    clearError,
    refresh,
    addCatch,
    updateCatch,
    deleteCatch,
  }
}
