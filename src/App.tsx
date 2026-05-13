import { useEffect, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import AppNav, { type AppView } from './components/AppNav'
import { SpeciesRegistryProvider, useSpeciesRegistry } from './context/SpeciesRegistryContext'
import { COMPETITION_NAME } from './domain/competition'
import { useCatches } from './hooks/useCatches'
import { useCompetitionDays } from './hooks/useCompetitionDays'
import { useTeamDayOverrides } from './hooks/useTeamDayOverrides'
import { useTeams } from './hooks/useTeams'
import LeaderboardsPage from './pages/LeaderboardsPage'
import LoginPage from './pages/LoginPage'
import RulesPage from './pages/RulesPage'
import SchedulePage from './pages/SchedulePage'
import ScoreEntryPage from './pages/ScoreEntryPage'
import SpeciesPage from './pages/SpeciesPage'
import TeamsPage from './pages/TeamsPage'
import './App.css'

type AppInnerProps = {
  user: ReturnType<typeof useAuth>['user']
  isAdmin: boolean
  authLoading: boolean
  canMutate: boolean
  signedInNonAdmin: boolean
  signOut: () => Promise<void>
  teams: ReturnType<typeof useTeams>
  enabled: boolean
}

function AppInner({
  user,
  isAdmin,
  authLoading,
  canMutate,
  signedInNonAdmin,
  signOut,
  teams,
  enabled,
}: AppInnerProps) {
  const species = useSpeciesRegistry()
  const days = useCompetitionDays(enabled)
  const catches = useCatches(enabled, canMutate, species.entries)
  const overrides = useTeamDayOverrides(enabled, canMutate)

  const [view, setView] = useState<AppView>('rules')

  useEffect(() => {
    if (authLoading) return
    if (
      !canMutate &&
      (view === 'teams' || view === 'score' || view === 'species')
    ) {
      setView('rules')
    }
  }, [authLoading, canMutate, view])

  const apiError =
    teams.error ??
    days.error ??
    catches.error ??
    overrides.error ??
    species.error

  function clearAllErrors() {
    teams.clearError()
    days.clearError()
    catches.clearError()
    overrides.clearError()
    species.clearError()
  }

  function handleLoginSuccess(loginIsAdmin: boolean) {
    setView(loginIsAdmin ? 'score' : 'boards')
  }

  return (
    <div className="app-root">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <div className="app-brand">
            <div className="app-brand-mark" aria-hidden />
            <div className="app-brand-text">
              <span className="app-brand-title">{COMPETITION_NAME}</span>
              <span className="app-brand-meta">
                June 2026 · 5 fishing days · Barcos
              </span>
            </div>
          </div>
          <div className="app-topbar-actions">
            {authLoading ? (
              <span className="topbar-auth-muted">Checking session…</span>
            ) : user ? (
              <>
                <span
                  className="topbar-auth-status"
                  title={user.email ?? undefined}
                >
                  {isAdmin ? 'Admin' : 'View only'}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => setView('login')}
              >
                Admin sign in
              </button>
            )}
            {teams.misconfigured ? (
              <span className="status-pill status-pill-warn">
                Setup required
              </span>
            ) : (
              <span className="status-pill status-pill-ok">Connected</span>
            )}
          </div>
        </div>
      </header>

      <div className="app-nav-shell">
        <div className="app-width">
          <AppNav
            view={view}
            onChange={setView}
            showCommitteeTabs={canMutate}
          />
        </div>
      </div>

      <div className="app-body">
        <div className="app-width app-alerts">
          {apiError ? (
            <div className="banner banner-error" role="alert">
              <span>{apiError}</span>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={clearAllErrors}
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </div>

        <div className="app-width">
          <main className="app-main">
            {view === 'login' ? (
              <LoginPage onSuccess={handleLoginSuccess} />
            ) : null}
            {view === 'rules' ? <RulesPage /> : null}
            {view === 'schedule' ? <SchedulePage /> : null}
            {view === 'teams' ? (
              <TeamsPage
                {...teams}
                canMutate={canMutate}
                signedInNonAdmin={signedInNonAdmin}
              />
            ) : null}
            {view === 'species' ? (
              <SpeciesPage
                canMutate={canMutate}
                signedInNonAdmin={signedInNonAdmin}
                catches={catches}
              />
            ) : null}
            {view === 'score' ? (
              <ScoreEntryPage
                teams={teams}
                days={days}
                catches={catches}
                canMutate={canMutate}
                signedInNonAdmin={signedInNonAdmin}
              />
            ) : null}
            {view === 'boards' ? (
              <LeaderboardsPage
                teams={teams}
                days={days}
                catches={catches}
                overrides={overrides}
                canMutate={canMutate}
              />
            ) : null}
          </main>

          <footer className="app-footer">
            <span>
              <strong>{COMPETITION_NAME}</strong> · Competition scoring
            </span>
            <span>IGFA rules apply · Committee decisions final</span>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth()
  const canMutate = !authLoading && !!user && isAdmin
  const signedInNonAdmin = !authLoading && !!user && !isAdmin

  const teams = useTeams(canMutate)
  const enabled = !teams.misconfigured

  return (
    <SpeciesRegistryProvider enabled={enabled}>
      <AppInner
        user={user}
        isAdmin={isAdmin}
        authLoading={authLoading}
        canMutate={canMutate}
        signedInNonAdmin={signedInNonAdmin}
        signOut={signOut}
        teams={teams}
        enabled={enabled}
      />
    </SpeciesRegistryProvider>
  )
}
