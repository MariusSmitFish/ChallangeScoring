import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_SCHEDULE_CONFIG,
  DEFAULT_SCORING_CONFIG,
  type RulesSection,
  type ScheduleConfig,
  type ScoringConfig,
} from '../domain/competitionConfig'
import {
  cloneDefaultSpeciesForCompetition,
  fetchCompetitions,
  insertCompetition,
  setActiveCompetition,
  type Competition,
} from '../lib/competitionQueries'
import { getSupabaseClient } from '../lib/supabaseClient'

const SELECTED_KEY = 'challenge-scoring-selected-competition'

type CompetitionContextValue = {
  competitions: Competition[]
  activeCompetition: Competition | null
  /** Competition the UI loads data for (admin selection, else active). */
  viewCompetition: Competition | null
  competitionId: string | null
  scoringConfig: ScoringConfig
  rulesSections: RulesSection[]
  schedule: ScheduleConfig
  loading: boolean
  error: string | null
  clearError: () => void
  refresh: () => Promise<void>
  setSelectedCompetitionId: (id: string) => void
  setAsActive: (id: string) => Promise<string | null>
  createCompetition: (input: {
    slug: string
    name: string
    year?: number | null
    venue?: string | null
    cloneSpeciesFromId?: string | null
  }) => Promise<{ error: string | null }>
}

const CompetitionContext = createContext<CompetitionContextValue | null>(null)

export function CompetitionProvider({
  enabled,
  canMutate,
  children,
}: {
  enabled: boolean
  canMutate: boolean
  children: ReactNode
}) {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(SELECTED_KEY)
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const activeCompetition = useMemo(
    () => competitions.find((c) => c.isActive) ?? null,
    [competitions],
  )

  const viewCompetition = useMemo(() => {
    if (canMutate && selectedId) {
      const picked = competitions.find((c) => c.id === selectedId)
      if (picked) return picked
    }
    return activeCompetition
  }, [canMutate, selectedId, competitions, activeCompetition])

  useEffect(() => {
    if (!canMutate || !activeCompetition) return
    if (!selectedId) {
      setSelectedId(activeCompetition.id)
      try {
        sessionStorage.setItem(SELECTED_KEY, activeCompetition.id)
      } catch {
        /* ignore */
      }
    }
  }, [canMutate, activeCompetition, selectedId])

  const refresh = useCallback(async () => {
    const client = getSupabaseClient()
    if (!client) {
      setCompetitions([])
      setError(null)
      return
    }
    const { competitions: next, error: err } = await fetchCompetitions(client)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setCompetitions(next)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setCompetitions([])
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

  const setSelectedCompetitionId = useCallback((id: string) => {
    setSelectedId(id)
    try {
      sessionStorage.setItem(SELECTED_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  const setAsActive = useCallback(
    async (id: string): Promise<string | null> => {
      const client = getSupabaseClient()
      if (!client) return 'Supabase not configured.'
      const { error: err } = await setActiveCompetition(client, id)
      if (err) return err
      setSelectedCompetitionId(id)
      await refresh()
      return null
    },
    [refresh, setSelectedCompetitionId],
  )

  const createCompetition = useCallback(
    async (input: {
      slug: string
      name: string
      year?: number | null
      venue?: string | null
      cloneSpeciesFromId?: string | null
    }): Promise<{ error: string | null }> => {
      const client = getSupabaseClient()
      if (!client) return { error: 'Supabase not configured.' }
      const { competition, error: err } = await insertCompetition(client, {
        slug: input.slug,
        name: input.name,
        year: input.year,
        venue: input.venue,
        seedScheduleDays: true,
      })
      if (err || !competition) return { error: err ?? 'Failed to create competition.' }

      const cloneFrom =
        input.cloneSpeciesFromId ?? activeCompetition?.id ?? null
      if (cloneFrom && cloneFrom !== competition.id) {
        const { error: cloneErr } = await cloneDefaultSpeciesForCompetition(
          client,
          cloneFrom,
          competition.id,
        )
        if (cloneErr) return { error: cloneErr }
      }

      setSelectedCompetitionId(competition.id)
      await refresh()
      return { error: null }
    },
    [activeCompetition?.id, refresh, setSelectedCompetitionId],
  )

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo((): CompetitionContextValue => {
    const vc = viewCompetition
    return {
      competitions,
      activeCompetition,
      viewCompetition: vc,
      competitionId: vc?.id ?? null,
      scoringConfig:
        vc?.scoringConfig ??
        activeCompetition?.scoringConfig ??
        DEFAULT_SCORING_CONFIG,
      rulesSections:
        vc?.rulesSections ?? activeCompetition?.rulesSections ?? [],
      schedule:
        vc?.schedule ?? activeCompetition?.schedule ?? DEFAULT_SCHEDULE_CONFIG,
      loading,
      error,
      clearError,
      refresh,
      setSelectedCompetitionId,
      setAsActive,
      createCompetition,
    }
  }, [
    competitions,
    activeCompetition,
    viewCompetition,
    loading,
    error,
    clearError,
    refresh,
    setSelectedCompetitionId,
    setAsActive,
    createCompetition,
  ])

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  )
}

export function useCompetition(): CompetitionContextValue {
  const ctx = useContext(CompetitionContext)
  if (!ctx) {
    throw new Error('useCompetition must be used within CompetitionProvider')
  }
  return ctx
}
