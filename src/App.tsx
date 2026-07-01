import { useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import { isSuperAdminEmail } from './auth/superAdmin'
import AppNav, { type AppView } from './components/AppNav'
import CompetitionSwitcher from './components/CompetitionSwitcher'
import MutationStatusBar from './components/MutationStatusBar'
import { CompetitionProvider, useCompetition } from './context/CompetitionContext'
import {
  MutationBusyProvider,
  useMutationBusy,
} from './context/MutationBusyContext'
import { SpeciesRegistryProvider, useSpeciesRegistry } from './context/SpeciesRegistryContext'
import { useCatches } from './hooks/useCatches'
import { useCommitteeUpdates } from './hooks/useCommitteeUpdates'
import { useCompetitionDays } from './hooks/useCompetitionDays'
import { useTeamDayOverrides } from './hooks/useTeamDayOverrides'
import { useTeams } from './hooks/useTeams'
import { getSupabaseClient } from './lib/supabaseClient'
import LeaderboardsPage from './pages/LeaderboardsPage'
import LoginPage from './pages/LoginPage'
import RulesPage from './pages/RulesPage'
import SchedulePage from './pages/SchedulePage'
import ScoreEntryPage from './pages/ScoreEntryPage'
import DataResetPage from './pages/DataResetPage'
import SpeciesPage from './pages/SpeciesPage'
import TeamsPage from './pages/TeamsPage'
import UpdatesPage from './pages/UpdatesPage'
import CompetitionsPage from './pages/CompetitionsPage'
import { APP_LOGO_SRC, APP_NAME } from './brand'
import './App.css'

type AppInnerProps = {
  user: ReturnType<typeof useAuth>['user']
  isAdmin: boolean
  authLoading: boolean
  canMutate: boolean
  signedInNonAdmin: boolean
  signOut: () => Promise<void>
  enabled: boolean
}

function AppInner({
  user,
  isAdmin,
  authLoading,
  canMutate,
  signedInNonAdmin,
  signOut,
  enabled,
}: AppInnerProps) {
  const competition = useCompetition()
  const species = useSpeciesRegistry()
  const { competitionId, scoringConfig, viewCompetition, activeCompetition } =
    competition

  const teams = useTeams(canMutate, competitionId)
  const teamIds = useMemo(() => teams.teams.map((t) => t.id), [teams.teams])
  const days = useCompetitionDays(enabled, competitionId)
  const catches = useCatches(
    enabled,
    canMutate,
    teamIds,
    species.entries,
    scoringConfig,
  )
  const overrides = useTeamDayOverrides(enabled, canMutate, teamIds)
  const committeeUpdates = useCommitteeUpdates(enabled, canMutate, competitionId)
  const { busy: mutationBusy, label: mutationLabel } = useMutationBusy()

  const dataSyncing =
    teams.syncing || catches.syncing || overrides.syncing
  const showBusyBar = mutationBusy || dataSyncing
  const busyLabel = mutationBusy
    ? mutationLabel
    : dataSyncing
      ? 'Updating data…'
      : null

  const [view, setView] = useState<AppView>('rules')
  const isSuperAdmin = isSuperAdminEmail(user?.email)
  const showSuperAdminTabs = canMutate && isSuperAdmin

  useEffect(() => {
    if (authLoading) return
    if (
      !canMutate &&
      (view === 'teams' ||
        view === 'score' ||
        view === 'species' ||
        view === 'data-reset' ||
        view === 'competitions')
    ) {
      setView('rules')
      return
    }
    if (!showSuperAdminTabs && view === 'competitions') {
      setView('score')
    }
  }, [authLoading, canMutate, showSuperAdminTabs, view])

  const apiError =
    competition.error ??
    teams.error ??
    days.error ??
    catches.error ??
    overrides.error ??
    species.error ??
    committeeUpdates.error

  function clearAllErrors() {
    competition.clearError()
    teams.clearError()
    days.clearError()
    catches.clearError()
    overrides.clearError()
    species.clearError()
    committeeUpdates.clearError()
  }

  function handleLoginSuccess(loginIsAdmin: boolean) {
    setView(loginIsAdmin ? 'score' : 'boards')
  }

  const displayName =
    (canMutate ? viewCompetition?.name : activeCompetition?.name) ?? 'Competition'
  const displayMeta = useMemo(() => {
    const c = canMutate ? viewCompetition : activeCompetition
    if (!c) return ''
    const parts: string[] = []
    if (c.year) parts.push(String(c.year))
    if (days.days.length) parts.push(`${days.days.length} fishing days`)
    const venue = c.venue ?? c.schedule.venue
    if (venue) parts.push(venue)
    return parts.filter(Boolean).join(' · ')
  }, [canMutate, viewCompetition, activeCompetition, days.days.length])

  const noCompetition = enabled && !competition.loading && !competitionId

  return (
    <div className="app-root">
      <div className={`app-chrome${canMutate ? ' app-chrome-admin' : ''}`}>
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <div className="app-topbar-row app-topbar-row-primary">
          <div className="app-brand">
            <img
              className="app-brand-mark"
              src={APP_LOGO_SRC}
              alt={APP_NAME}
              width={152}
              height={44}
              decoding="async"
            />
            <div className="app-brand-event">
              <span className="app-brand-event-name">{displayName}</span>
              {displayMeta ? (
                <span className="app-brand-meta">{displayMeta}</span>
              ) : null}
            </div>
          </div>
          <div className="app-topbar-auth">
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
            {!canMutate ? (
              teams.misconfigured ? (
                <span className="status-pill status-pill-warn app-topbar-conn">
                  Setup required
                </span>
              ) : (
                <span className="status-pill status-pill-ok app-topbar-conn">
                  Connected
                </span>
              )
            ) : null}
          </div>
          </div>
          {canMutate ? (
            <div className="app-topbar-row app-topbar-row-tools">
              <CompetitionSwitcher canMutate={canMutate} />
              {teams.misconfigured ? (
                <span className="status-pill status-pill-warn app-topbar-conn">
                  Setup required
                </span>
              ) : (
                <span className="status-pill status-pill-ok app-topbar-conn">
                  Connected
                </span>
              )}
            </div>
          ) : null}
        </div>
      </header>

        <MutationStatusBar busy={showBusyBar} label={busyLabel} />

        <div className="app-nav-shell">
          <div className="app-width">
            <AppNav
              view={view}
              onChange={setView}
              showCommitteeTabs={canMutate}
              showSuperAdminTabs={showSuperAdminTabs}
            />
          </div>
        </div>
      </div>

      <div className="app-body">
        <div className="app-width app-alerts">
          {noCompetition ? (
            <div className="banner banner-warn" role="status">
              No active competition. Run{' '}
              <code className="env-code">supabase-schema-07-competitions.sql</code>{' '}
              and sign in as admin to create or activate one.
            </div>
          ) : null}
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
          <main
            className={
              showBusyBar ? 'app-main app-main-syncing' : 'app-main'
            }
          >
            {view === 'login' ? (
              <LoginPage onSuccess={handleLoginSuccess} />
            ) : null}
            {view === 'rules' ? <RulesPage /> : null}
            {view === 'schedule' ? <SchedulePage days={days.days} /> : null}
            {view === 'updates' ? (
              <UpdatesPage
                updates={committeeUpdates}
                canMutate={canMutate}
                signedInNonAdmin={signedInNonAdmin}
              />
            ) : null}
            {view === 'competitions' && showSuperAdminTabs ? (
              <CompetitionsPage canMutate={canMutate} />
            ) : null}
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
            {view === 'data-reset' ? (
              <DataResetPage
                teams={teams}
                catches={catches}
                overrides={overrides}
                canMutate={canMutate}
                signedInNonAdmin={signedInNonAdmin}
                competitionId={competitionId}
                teamIds={teamIds}
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
              <strong>{APP_NAME}</strong>
              {displayName !== 'Competition' ? (
                <>
                  {' '}
                  · <span className="app-footer-event">{displayName}</span>
                </>
              ) : null}
            </span>
            <span>IGFA rules apply · Committee decisions final</span>
          </footer>
        </div>
      </div>
    </div>
  )
}

function AppWithSpecies(props: AppInnerProps) {
  const { competitionId } = useCompetition()
  return (
    <SpeciesRegistryProvider enabled={props.enabled} competitionId={competitionId}>
      <AppInner {...props} />
    </SpeciesRegistryProvider>
  )
}

export default function App() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth()
  const canMutate = !authLoading && !!user && isAdmin
  const signedInNonAdmin = !authLoading && !!user && !isAdmin
  const enabled = !!getSupabaseClient()

  return (
    <CompetitionProvider enabled={enabled} canMutate={canMutate}>
      <MutationBusyProvider>
        <AppWithSpecies
          user={user}
          isAdmin={isAdmin}
          authLoading={authLoading}
          canMutate={canMutate}
          signedInNonAdmin={signedInNonAdmin}
          signOut={signOut}
          enabled={enabled}
        />
      </MutationBusyProvider>
    </CompetitionProvider>
  )
}
