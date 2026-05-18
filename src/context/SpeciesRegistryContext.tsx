import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SpeciesRegistryEntry } from '../domain/species'
import {
  lengthSpeciesOptionsFromRegistry,
  weighedSpeciesOptionsFromRegistry,
} from '../domain/species'
import { fetchSpeciesRegistry } from '../lib/speciesQueries'
import { getSupabaseClient } from '../lib/supabaseClient'

type SpeciesRegistryContextValue = {
  entries: SpeciesRegistryEntry[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  clearError: () => void
  weighedOptions: { key: string; label: string }[]
  lengthOptions: { key: string; label: string }[]
}

const SpeciesRegistryContext = createContext<SpeciesRegistryContextValue | null>(null)

export function SpeciesRegistryProvider({
  enabled,
  competitionId,
  children,
}: {
  enabled: boolean
  competitionId: string | null
  children: ReactNode
}) {
  const [entries, setEntries] = useState<SpeciesRegistryEntry[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const client = getSupabaseClient()
    if (!client || !competitionId) {
      setEntries([])
      setError(null)
      return
    }
    const { entries: next, error: err } = await fetchSpeciesRegistry(
      client,
      competitionId,
    )
    if (err) {
      setError(err)
      setEntries([])
      return
    }
    setError(null)
    setEntries(next)
  }, [competitionId])

  useEffect(() => {
    if (!enabled || !competitionId) {
      setEntries([])
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

  const weighedOptions = useMemo(
    () => weighedSpeciesOptionsFromRegistry(entries),
    [entries],
  )
  const lengthOptions = useMemo(
    () => lengthSpeciesOptionsFromRegistry(entries),
    [entries],
  )

  const value = useMemo(
    (): SpeciesRegistryContextValue => ({
      entries,
      loading,
      error,
      refresh,
      clearError,
      weighedOptions,
      lengthOptions,
    }),
    [entries, loading, error, refresh, clearError, weighedOptions, lengthOptions],
  )

  return (
    <SpeciesRegistryContext.Provider value={value}>
      {children}
    </SpeciesRegistryContext.Provider>
  )
}

export function useSpeciesRegistry(): SpeciesRegistryContextValue {
  const ctx = useContext(SpeciesRegistryContext)
  if (!ctx) {
    throw new Error('useSpeciesRegistry must be used within SpeciesRegistryProvider')
  }
  return ctx
}
