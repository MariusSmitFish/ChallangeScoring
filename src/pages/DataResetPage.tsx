import { useMemo, useState } from 'react'
import ViewOnlyBanner from '../components/ViewOnlyBanner'
import {
  deleteAllCatches,
  deleteAllTeamDayOverrides,
  deleteAllTeams,
} from '../lib/resetQueries'
import { getSupabaseClient } from '../lib/supabaseClient'
import type { UseCatchesResult } from '../hooks/useCatches'
import type { UseTeamDayOverridesResult } from '../hooks/useTeamDayOverrides'
import type { UseTeamsResult } from '../hooks/useTeams'

const TEAMS_CONFIRM_PHRASE = 'DELETE ALL TEAMS'

type Props = {
  teams: UseTeamsResult
  catches: UseCatchesResult
  overrides: UseTeamDayOverridesResult
  canMutate: boolean
  signedInNonAdmin: boolean
}

export default function DataResetPage({
  teams,
  catches,
  overrides,
  canMutate,
  signedInNonAdmin,
}: Props) {
  const blocked = teams.misconfigured || teams.loading || !canMutate
  const [msg, setMsg] = useState<string | null>(null)
  const [teamsConfirm, setTeamsConfirm] = useState('')

  const catchCount = catches.catches.length
  const overrideCount = overrides.overrides.length
  const teamCount = teams.teams.length
  const memberCount = useMemo(
    () => teams.teams.reduce((n, t) => n + t.members.length, 0),
    [teams.teams],
  )

  async function refreshAll() {
    await Promise.all([
      teams.refresh(),
      catches.refresh(),
      overrides.refresh(),
    ])
  }

  async function runClearCatches() {
    setMsg(null)
    if (
      !window.confirm(
        `Remove all ${catchCount} score entries (catches)? Teams and anglers stay. This cannot be undone.`,
      )
    ) {
      return
    }
    const client = getSupabaseClient()
    if (!client) {
      setMsg('Supabase not configured.')
      return
    }
    const { error } = await deleteAllCatches(client)
    if (error) setMsg(error)
    else {
      setMsg('All score entries were deleted.')
      await refreshAll()
    }
  }

  async function runClearOverrides() {
    setMsg(null)
    if (
      !window.confirm(
        `Remove all ${overrideCount} team/day disqualification records? This cannot be undone.`,
      )
    ) {
      return
    }
    const client = getSupabaseClient()
    if (!client) {
      setMsg('Supabase not configured.')
      return
    }
    const { error } = await deleteAllTeamDayOverrides(client)
    if (error) setMsg(error)
    else {
      setMsg('All disqualification overrides were cleared.')
      await refreshAll()
    }
  }

  async function runDeleteTeams() {
    setMsg(null)
    if (teamsConfirm !== TEAMS_CONFIRM_PHRASE) {
      setMsg(`Type exactly: ${TEAMS_CONFIRM_PHRASE}`)
      return
    }
    if (
      !window.confirm(
        `This will permanently delete ${teamCount} team(s), ${memberCount} angler(s), and every catch and override linked to them. Competition calendar days are not removed. Type was correct — proceed?`,
      )
    ) {
      return
    }
    const client = getSupabaseClient()
    if (!client) {
      setMsg('Supabase not configured.')
      return
    }
    const { error } = await deleteAllTeams(client)
    if (error) setMsg(error)
    else {
      setMsg('All teams and related scoring data were removed.')
      setTeamsConfirm('')
      await refreshAll()
    }
  }

  return (
    <section className="panel data-reset-panel" aria-labelledby="data-reset-heading">
      <h2 id="data-reset-heading" className="panel-title">
        Data reset
      </h2>
      <p className="empty-hint small data-reset-lead">
        Use only in emergencies. Actions apply immediately to the live database. There is no
        undo. Species catalogue is not changed here — use the Species page for that.
      </p>

      <ViewOnlyBanner
        show={!teams.misconfigured && !teams.loading && !canMutate}
        signedInNonAdmin={signedInNonAdmin}
      />

      {msg ? (
        <p className="empty-hint" role="status">
          {msg}
        </p>
      ) : null}

      <div className="data-reset-grid">
        <article className="data-reset-card">
          <h3 className="data-reset-card-title">Clear score entries</h3>
          <p className="data-reset-card-body">
            Deletes every row in <code>catches</code> ({catchCount} right now). Teams, anglers,
            calendar, and species list are unchanged.
          </p>
          <button
            type="button"
            className="btn btn-danger"
            disabled={blocked || catchCount === 0}
            onClick={() => void runClearCatches()}
          >
            Delete all catches
          </button>
        </article>

        <article className="data-reset-card">
          <h3 className="data-reset-card-title">Clear disqualifications</h3>
          <p className="data-reset-card-body">
            Deletes every row in <code>team_day_overrides</code> ({overrideCount} right now).
            Catches and teams are unchanged.
          </p>
          <button
            type="button"
            className="btn btn-danger"
            disabled={blocked || overrideCount === 0}
            onClick={() => void runClearOverrides()}
          >
            Delete all overrides
          </button>
        </article>

        <article className="data-reset-card data-reset-card-nuclear">
          <h3 className="data-reset-card-title">Remove all teams</h3>
          <p className="data-reset-card-body">
            Deletes every team in <code>teams</code> ({teamCount} teams, {memberCount} anglers).
            All members, catches, and team/day overrides for those teams are removed by database
            cascade. Competition days are kept.
          </p>
          <label className="field">
            <span>
              Type <code>{TEAMS_CONFIRM_PHRASE}</code> to enable the button
            </span>
            <input
              className="input"
              value={teamsConfirm}
              onChange={(e) => setTeamsConfirm(e.target.value)}
              placeholder={TEAMS_CONFIRM_PHRASE}
              disabled={blocked}
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            className="btn btn-danger"
            disabled={blocked || teamCount === 0 || teamsConfirm !== TEAMS_CONFIRM_PHRASE}
            onClick={() => void runDeleteTeams()}
          >
            Delete all teams and related data
          </button>
        </article>
      </div>
    </section>
  )
}
