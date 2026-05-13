import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react'
import { useSpeciesRegistry } from '../context/SpeciesRegistryContext'
import {
  explainAnglerDayPoints,
  explainAnglerOverallPoints,
  explainTeamDayPoints,
  explainTeamOverallPoints,
  leaderboardAnglerByDay,
  leaderboardAnglerOverall,
  leaderboardTeamByDay,
  leaderboardTeamOverall,
  weighedFishBestPerSpecies,
  weighedFishOverallByWeight,
} from '../domain/aggregates'
import type {
  AnglerDayPointsExplain,
  TeamDayPointsExplain,
} from '../domain/aggregates'
import type { UseCatchesResult } from '../hooks/useCatches'
import type { UseCompetitionDaysResult } from '../hooks/useCompetitionDays'
import type { UseTeamDayOverridesResult } from '../hooks/useTeamDayOverrides'
import type { UseTeamsResult } from '../hooks/useTeams'
import { formatPointsFixed2 } from '../lib/formatPoints'

function formatKg(kg: number): string {
  const r = Math.round(kg * 1000) / 1000
  return `${r.toFixed(2)} kg`
}

function BoardExpandRow({
  colSpan,
  children,
}: {
  colSpan: number
  children: ReactNode
}) {
  return (
    <tr className="boards-detail-row">
      <td colSpan={colSpan} className="boards-detail-cell">
        <div className="boards-breakdown">{children}</div>
      </td>
    </tr>
  )
}

function TeamDayExplainView({ row }: { row: TeamDayPointsExplain }) {
  return (
    <>
      <p className="boards-breakdown-lead">
        Fish points are summed from logged catches. The species diversity bonus
        is +2 for each extra <em>scoring</em> species cap group that day (first
        species does not add a bonus).
      </p>
      <div className="boards-breakdown-day">
        <h4 className="boards-breakdown-day-title">
          Day {row.dayNumber} — {row.dayDate}
        </h4>
        {row.disqualified ? (
          <p className="boards-breakdown-dq" role="status">
            Disqualified for this day — 0 points counted toward the leaderboard.
            {row.dqReason ? <> Reason: {row.dqReason}</> : null}
          </p>
        ) : null}
        {row.catchLines.length > 0 ? (
          <ul className="boards-breakdown-catches">
            {row.catchLines.map((line) => (
              <li key={line.id}>
                <span>{line.label}</span>{' '}
                <span className="boards-breakdown-pts">+{formatPointsFixed2(line.points)}</span>
              </li>
            ))}
          </ul>
        ) : !row.disqualified ? (
          <p className="boards-breakdown-empty">No fish recorded this day.</p>
        ) : null}
        {!row.disqualified ? (
          <dl className="boards-breakdown-dl">
            <div>
              <dt>Fish points (sum of catch rows)</dt>
              <dd>{formatPointsFixed2(row.fishPoints)}</dd>
            </div>
            <div>
              <dt>Scoring species (for diversity)</dt>
              <dd>{row.scoringSpeciesCount}</dd>
            </div>
            <div>
              <dt>Diversity bonus</dt>
              <dd>+{formatPointsFixed2(row.diversityBonus)}</dd>
            </div>
            <div>
              <dt>Day total</dt>
              <dd>
                <strong>{formatPointsFixed2(row.dayTotal)}</strong>
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </>
  )
}

function TeamOverallExplainView({
  days,
  grandTotal,
}: {
  days: TeamDayPointsExplain[]
  grandTotal: number
}) {
  return (
    <>
      <p className="boards-breakdown-lead">
        Overall team score is the sum of each competition day: all fish points
        for the boat that day plus the daily species diversity bonus (unless
        the day is disqualified).
      </p>
      {days.map((row) => (
        <div key={row.competitionDayId} className="boards-breakdown-day">
          <h4 className="boards-breakdown-day-title">
            Day {row.dayNumber} — {row.dayDate}
          </h4>
          {row.disqualified ? (
            <p className="boards-breakdown-dq" role="status">
              Disqualified — 0 points.
              {row.dqReason ? <> Reason: {row.dqReason}</> : null}
            </p>
          ) : null}
          {row.catchLines.length > 0 ? (
            <ul className="boards-breakdown-catches">
              {row.catchLines.map((line) => (
                <li key={line.id}>
                  <span>{line.label}</span>{' '}
                  <span className="boards-breakdown-pts">+{formatPointsFixed2(line.points)}</span>
                </li>
              ))}
            </ul>
          ) : !row.disqualified ? (
            <p className="boards-breakdown-empty">No fish recorded.</p>
          ) : null}
          {!row.disqualified ? (
            <dl className="boards-breakdown-dl">
              <div>
                <dt>Fish points</dt>
                <dd>{formatPointsFixed2(row.fishPoints)}</dd>
              </div>
              <div>
                <dt>Scoring species</dt>
                <dd>{row.scoringSpeciesCount}</dd>
              </div>
              <div>
                <dt>Diversity bonus</dt>
                <dd>+{formatPointsFixed2(row.diversityBonus)}</dd>
              </div>
              <div>
                <dt>Day subtotal</dt>
                <dd>
                  <strong>{formatPointsFixed2(row.dayTotal)}</strong>
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      ))}
      <p className="boards-breakdown-total">
        <strong>Sum of days:</strong> {formatPointsFixed2(grandTotal)}
      </p>
    </>
  )
}

function AnglerDayExplainView({ row }: { row: AnglerDayPointsExplain }) {
  return (
    <>
      <p className="boards-breakdown-lead">
        Angler points are your fish points from your logged catches, plus a
        species diversity bonus calculated only from <em>your</em> catches that
        day (+2 for each extra scoring species cap group after the first).
      </p>
      <div className="boards-breakdown-day">
        <h4 className="boards-breakdown-day-title">
          Day {row.dayNumber} — {row.dayDate}
        </h4>
        {row.disqualified ? (
          <p className="boards-breakdown-dq" role="status">
            Team disqualified this day — 0 points.
            {row.dqReason ? <> Reason: {row.dqReason}</> : null}
          </p>
        ) : null}
        {row.ownCatchLines.length > 0 ? (
          <ul className="boards-breakdown-catches">
            {row.ownCatchLines.map((line) => (
              <li key={line.id}>
                <span>{line.label}</span>{' '}
                <span className="boards-breakdown-pts">+{formatPointsFixed2(line.points)}</span>
              </li>
            ))}
          </ul>
        ) : !row.disqualified ? (
          <p className="boards-breakdown-empty">No personal catches this day.</p>
        ) : null}
        {!row.disqualified ? (
          <dl className="boards-breakdown-dl">
            <div>
              <dt>Your fish points</dt>
              <dd>{formatPointsFixed2(row.ownFishPoints)}</dd>
            </div>
            <div>
              <dt>Your scoring species (diversity)</dt>
              <dd>{row.ownScoringSpeciesCount}</dd>
            </div>
            <div>
              <dt>Your diversity bonus</dt>
              <dd>+{formatPointsFixed2(row.ownDiversityBonus)}</dd>
            </div>
            <div>
              <dt>Day total (you)</dt>
              <dd>
                <strong>{formatPointsFixed2(row.dayTotal)}</strong>
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </>
  )
}

function AnglerOverallExplainView({
  perDay,
  grandTotal,
}: {
  perDay: AnglerDayPointsExplain[]
  grandTotal: number
}) {
  return (
    <>
      <p className="boards-breakdown-lead">
        Overall angler score is the sum of each competition day: your fish
        points plus your personal species diversity bonus (from your catches
        only — same rule as the single-day angler board).
      </p>
      {perDay.map((row) => (
        <div key={row.competitionDayId} className="boards-breakdown-day">
          <h4 className="boards-breakdown-day-title">
            Day {row.dayNumber} — {row.dayDate}
          </h4>
          {row.disqualified ? (
            <p className="boards-breakdown-dq" role="status">
              Team disqualified — 0 points.
              {row.dqReason ? <> Reason: {row.dqReason}</> : null}
            </p>
          ) : null}
          {row.ownCatchLines.length > 0 ? (
            <ul className="boards-breakdown-catches">
              {row.ownCatchLines.map((line) => (
                <li key={line.id}>
                  <span>{line.label}</span>{' '}
                  <span className="boards-breakdown-pts">+{formatPointsFixed2(line.points)}</span>
                </li>
              ))}
            </ul>
          ) : !row.disqualified ? (
            <p className="boards-breakdown-empty">No personal catches.</p>
          ) : null}
          {!row.disqualified ? (
            <dl className="boards-breakdown-dl">
              <div>
                <dt>Your fish points</dt>
                <dd>{formatPointsFixed2(row.ownFishPoints)}</dd>
              </div>
              <div>
                <dt>Your scoring species / diversity bonus</dt>
                <dd>
                  {row.ownScoringSpeciesCount} / +{formatPointsFixed2(row.ownDiversityBonus)}
                </dd>
              </div>
              <div>
                <dt>Day subtotal</dt>
                <dd>
                  <strong>{formatPointsFixed2(row.dayTotal)}</strong>
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      ))}
      <p className="boards-breakdown-total">
        <strong>Overall total:</strong> {formatPointsFixed2(grandTotal)}
      </p>
    </>
  )
}

type Tab =
  | 'team-overall'
  | 'angler-overall'
  | 'team-day'
  | 'angler-day'
  | 'big-fish'

type Props = {
  teams: UseTeamsResult
  days: UseCompetitionDaysResult
  catches: UseCatchesResult
  overrides: UseTeamDayOverridesResult
  canMutate: boolean
}

export default function LeaderboardsPage({
  teams,
  days,
  catches,
  overrides,
  canMutate,
}: Props) {
  const species = useSpeciesRegistry()
  const [tab, setTab] = useState<Tab>('team-overall')
  const [dayId, setDayId] = useState('')
  const [dqTeam, setDqTeam] = useState('')
  const [dqDay, setDqDay] = useState('')
  const [dqOn, setDqOn] = useState(false)
  const [dqReason, setDqReason] = useState('')
  const [dqMsg, setDqMsg] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  useEffect(() => {
    setExpandedKey(null)
  }, [tab, dayId])

  useEffect(() => {
    if (!dayId && days.days.length) setDayId(days.days[0].id)
  }, [dayId, days.days])

  const selectedDay = days.days.find((d) => d.id === dayId)

  const teamOverall = useMemo(
    () =>
      leaderboardTeamOverall(
        teams.teams,
        catches.catches,
        overrides.overrides,
        days.days,
        species.entries,
      ),
    [teams.teams, catches.catches, overrides.overrides, days.days, species.entries],
  )

  const anglerOverall = useMemo(
    () =>
      leaderboardAnglerOverall(
        teams.teams,
        catches.catches,
        overrides.overrides,
        days.days,
        species.entries,
      ),
    [teams.teams, catches.catches, overrides.overrides, days.days, species.entries],
  )

  const teamByDay = useMemo(() => {
    if (!selectedDay) return []
    return leaderboardTeamByDay(
      teams.teams,
      catches.catches,
      overrides.overrides,
      selectedDay,
      species.entries,
    )
  }, [teams.teams, catches.catches, overrides.overrides, selectedDay, species.entries])

  const anglerByDay = useMemo(() => {
    if (!selectedDay) return []
    return leaderboardAnglerByDay(
      teams.teams,
      catches.catches,
      overrides.overrides,
      selectedDay,
      species.entries,
    )
  }, [teams.teams, catches.catches, overrides.overrides, selectedDay, species.entries])

  const bigFishOverall = useMemo(
    () =>
      weighedFishOverallByWeight(
        teams.teams,
        catches.catches,
        days.days,
        species.entries,
      ),
    [teams.teams, catches.catches, days.days, species.entries],
  )

  const bigFishPerSpecies = useMemo(
    () =>
      weighedFishBestPerSpecies(
        teams.teams,
        catches.catches,
        days.days,
        species.entries,
      ),
    [teams.teams, catches.catches, days.days, species.entries],
  )

  const siteDown = teams.misconfigured || teams.loading

  function rowExpandKey(entityId: string) {
    return `${tab}:${entityId}`
  }

  function toggleRowExpand(entityId: string) {
    const k = rowExpandKey(entityId)
    setExpandedKey((cur) => (cur === k ? null : k))
  }

  async function refreshAll() {
    await Promise.all([
      days.refresh(),
      catches.refresh(),
      overrides.refresh(),
      species.refresh(),
    ])
  }

  async function saveDq() {
    setDqMsg(null)
    if (!dqTeam || !dqDay) {
      setDqMsg('Select team and day.')
      return
    }
    const { error } = await overrides.setDisqualified(
      dqTeam,
      dqDay,
      dqOn,
      dqReason.trim() || null,
    )
    setDqMsg(error ?? (dqOn ? 'Marked disqualified for the day.' : 'Override cleared.'))
  }

  return (
    <div className="panel boards-panel">
      <div className="boards-head">
        <h2 className="panel-title">Leaderboards</h2>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={siteDown || days.days.length === 0}
          onClick={() => void refreshAll()}
        >
          Refresh data
        </button>
      </div>

      <p className="empty-hint boards-hint">
        {tab === 'big-fish' ? (
          <>
            Weighed gamefish only, ordered by scale weight (kg). Every logged
            weighed entry with a weight is listed, including fish that scored zero
            points. <strong>Heaviest per species</strong> is one row per species
            key (the single heaviest fish recorded for that species).
          </>
        ) : (
          <>
            Team totals include per-day species diversity bonus from the whole
            boat’s catches that day (+2 per extra scoring species). Angler totals
            use each angler’s own catches only for that same bonus. Disqualified
            days force zero for that team day. Use <strong>▸</strong> on a row to
            see how points were built.
          </>
        )}
      </p>

      {days.days.length === 0 && !teams.misconfigured ? (
        <p className="banner banner-warn" role="status">
          Load competition days SQL migration to see boards.
        </p>
      ) : null}

      <div className="sub-tabs" role="tablist" aria-label="Leaderboard view">
        {(
          [
            ['team-overall', 'Teams overall'],
            ['angler-overall', 'Anglers overall'],
            ['team-day', 'Teams by day'],
            ['angler-day', 'Anglers by day'],
            ['big-fish', 'Biggest fish'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`sub-tab ${tab === id ? 'sub-tab-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {(tab === 'team-day' || tab === 'angler-day') && (
        <label className="field boards-day-pick">
          <span>Day</span>
          <select
            className="input"
            value={dayId}
            onChange={(e) => setDayId(e.target.value)}
            disabled={siteDown || !days.days.length}
          >
            {days.days.map((d) => (
              <option key={d.id} value={d.id}>
                Day {d.dayNumber} — {d.dayDate}
              </option>
            ))}
          </select>
        </label>
      )}

      {tab === 'team-overall' ? (
        <div className="table-wrap">
          <table className="data-table boards-expandable-table">
            <thead>
              <tr>
                <th className="boards-col-expand" scope="col">
                  <span className="sr-only">Details</span>
                </th>
                <th>#</th>
                <th>Team</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {teamOverall.map((r, i) => {
                const k = rowExpandKey(r.teamId)
                const open = expandedKey === k
                const explain = open
                  ? explainTeamOverallPoints(
                      teams.teams,
                      catches.catches,
                      overrides.overrides,
                      days.days,
                      r.teamId,
                      species.entries,
                    )
                  : null
                return (
                  <Fragment key={r.teamId}>
                    <tr className={open ? 'boards-row-open' : undefined}>
                      <td className="boards-col-expand">
                        <button
                          type="button"
                          className="boards-expand-btn"
                          aria-expanded={open}
                          aria-controls={`board-detail-${k}`}
                          id={`board-trigger-${k}`}
                          onClick={() => toggleRowExpand(r.teamId)}
                        >
                          {open ? '▾' : '▸'}
                        </button>
                      </td>
                      <td>{i + 1}</td>
                      <td>{r.name}</td>
                      <td>{formatPointsFixed2(r.points)}</td>
                    </tr>
                    {open && explain ? (
                      <BoardExpandRow colSpan={4}>
                        <div
                          id={`board-detail-${k}`}
                          role="region"
                          aria-labelledby={`board-trigger-${k}`}
                        >
                          <TeamOverallExplainView
                            days={explain.days}
                            grandTotal={explain.grandTotal}
                          />
                        </div>
                      </BoardExpandRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'angler-overall' ? (
        <div className="table-wrap">
          <table className="data-table boards-expandable-table">
            <thead>
              <tr>
                <th className="boards-col-expand" scope="col">
                  <span className="sr-only">Details</span>
                </th>
                <th>#</th>
                <th>Angler</th>
                <th>Team</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {anglerOverall.map((r, i) => {
                const k = rowExpandKey(r.anglerId)
                const open = expandedKey === k
                const explain = open
                  ? explainAnglerOverallPoints(
                      teams.teams,
                      catches.catches,
                      overrides.overrides,
                      days.days,
                      r.anglerId,
                      species.entries,
                    )
                  : null
                return (
                  <Fragment key={r.anglerId}>
                    <tr className={open ? 'boards-row-open' : undefined}>
                      <td className="boards-col-expand">
                        <button
                          type="button"
                          className="boards-expand-btn"
                          aria-expanded={open}
                          aria-controls={`board-detail-${k}`}
                          id={`board-trigger-${k}`}
                          onClick={() => toggleRowExpand(r.anglerId)}
                        >
                          {open ? '▾' : '▸'}
                        </button>
                      </td>
                      <td>{i + 1}</td>
                      <td>{r.name}</td>
                      <td>{r.teamName}</td>
                      <td>{formatPointsFixed2(r.points)}</td>
                    </tr>
                    {open && explain ? (
                      <BoardExpandRow colSpan={5}>
                        <div
                          id={`board-detail-${k}`}
                          role="region"
                          aria-labelledby={`board-trigger-${k}`}
                        >
                          <AnglerOverallExplainView
                            perDay={explain.perDay}
                            grandTotal={explain.grandTotal}
                          />
                        </div>
                      </BoardExpandRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'team-day' && selectedDay ? (
        <div className="table-wrap">
          <table className="data-table boards-expandable-table">
            <thead>
              <tr>
                <th className="boards-col-expand" scope="col">
                  <span className="sr-only">Details</span>
                </th>
                <th>#</th>
                <th>Team</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {teamByDay.map((r, i) => {
                const k = rowExpandKey(r.teamId)
                const open = expandedKey === k
                const explain = open
                  ? explainTeamDayPoints(
                      teams.teams,
                      catches.catches,
                      overrides.overrides,
                      selectedDay,
                      r.teamId,
                      species.entries,
                    )
                  : null
                return (
                  <Fragment key={r.teamId}>
                    <tr className={open ? 'boards-row-open' : undefined}>
                      <td className="boards-col-expand">
                        <button
                          type="button"
                          className="boards-expand-btn"
                          aria-expanded={open}
                          aria-controls={`board-detail-${k}`}
                          id={`board-trigger-${k}`}
                          onClick={() => toggleRowExpand(r.teamId)}
                        >
                          {open ? '▾' : '▸'}
                        </button>
                      </td>
                      <td>{i + 1}</td>
                      <td>{r.name}</td>
                      <td>{formatPointsFixed2(r.points)}</td>
                    </tr>
                    {open && explain ? (
                      <BoardExpandRow colSpan={4}>
                        <div
                          id={`board-detail-${k}`}
                          role="region"
                          aria-labelledby={`board-trigger-${k}`}
                        >
                          <TeamDayExplainView row={explain} />
                        </div>
                      </BoardExpandRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'angler-day' && selectedDay ? (
        <div className="table-wrap">
          <table className="data-table boards-expandable-table">
            <thead>
              <tr>
                <th className="boards-col-expand" scope="col">
                  <span className="sr-only">Details</span>
                </th>
                <th>#</th>
                <th>Angler</th>
                <th>Team</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {anglerByDay.map((r, i) => {
                const k = rowExpandKey(r.anglerId)
                const open = expandedKey === k
                const explain = open
                  ? explainAnglerDayPoints(
                      teams.teams,
                      catches.catches,
                      overrides.overrides,
                      selectedDay,
                      r.anglerId,
                      species.entries,
                    )
                  : null
                return (
                  <Fragment key={r.anglerId}>
                    <tr className={open ? 'boards-row-open' : undefined}>
                      <td className="boards-col-expand">
                        <button
                          type="button"
                          className="boards-expand-btn"
                          aria-expanded={open}
                          aria-controls={`board-detail-${k}`}
                          id={`board-trigger-${k}`}
                          onClick={() => toggleRowExpand(r.anglerId)}
                        >
                          {open ? '▾' : '▸'}
                        </button>
                      </td>
                      <td>{i + 1}</td>
                      <td>{r.name}</td>
                      <td>{r.teamName}</td>
                      <td>{formatPointsFixed2(r.points)}</td>
                    </tr>
                    {open && explain ? (
                      <BoardExpandRow colSpan={5}>
                        <div
                          id={`board-detail-${k}`}
                          role="region"
                          aria-labelledby={`board-trigger-${k}`}
                        >
                          <AnglerDayExplainView row={explain} />
                        </div>
                      </BoardExpandRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'big-fish' ? (
        <div className="boards-bigfish">
          <section className="boards-bigfish-block" aria-labelledby="bigfish-overall-heading">
            <h3 id="bigfish-overall-heading" className="boards-bigfish-title">
              Heaviest weighed fish (overall)
            </h3>
            {bigFishOverall.length === 0 ? (
              <p className="empty-hint">No weighed fish with a recorded weight yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th className="num">Weight</th>
                      <th>Species</th>
                      <th>Angler</th>
                      <th>Team</th>
                      <th>Day</th>
                      <th className="num">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bigFishOverall.map((r, i) => (
                      <tr key={r.catchId}>
                        <td>{i + 1}</td>
                        <td className="num">{formatKg(r.weightKg)}</td>
                        <td>{r.speciesLabel}</td>
                        <td>{r.anglerName}</td>
                        <td>{r.teamName}</td>
                        <td>
                          Day {r.dayNumber} — {r.dayDate}
                        </td>
                        <td className="num">{formatPointsFixed2(r.pointsTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="boards-bigfish-block" aria-labelledby="bigfish-species-heading">
            <h3 id="bigfish-species-heading" className="boards-bigfish-title">
              Heaviest per species
            </h3>
            {bigFishPerSpecies.length === 0 ? (
              <p className="empty-hint">No weighed fish with a recorded weight yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Species</th>
                      <th className="num">Weight</th>
                      <th>Angler</th>
                      <th>Team</th>
                      <th>Day</th>
                      <th className="num">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bigFishPerSpecies.map((r) => (
                      <tr key={r.speciesKey}>
                        <td>{r.speciesLabel}</td>
                        <td className="num">{formatKg(r.weightKg)}</td>
                        <td>{r.anglerName}</td>
                        <td>{r.teamName}</td>
                        <td>
                          Day {r.dayNumber} — {r.dayDate}
                        </td>
                        <td className="num">{formatPointsFixed2(r.pointsTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {canMutate ? (
        <section className="dq-panel" aria-labelledby="dq-heading">
          <h3 id="dq-heading" className="dq-title">
            Day disqualification (committee)
          </h3>
          <p className="empty-hint small">
            Use for life-jacket violations, missed backline, etc. Team scores zero
            for that day on all boards.
          </p>
          <div className="dq-grid">
            <label className="field">
              <span>Team</span>
              <select
                className="input"
                value={dqTeam}
                onChange={(e) => setDqTeam(e.target.value)}
                disabled={siteDown}
              >
                <option value="">Select</option>
                {teams.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Day</span>
              <select
                className="input"
                value={dqDay}
                onChange={(e) => setDqDay(e.target.value)}
                disabled={siteDown || !days.days.length}
              >
                <option value="">Select</option>
                {days.days.map((d) => (
                  <option key={d.id} value={d.id}>
                    Day {d.dayNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-check">
              <input
                type="checkbox"
                checked={dqOn}
                onChange={(e) => setDqOn(e.target.checked)}
                disabled={siteDown}
              />
              <span>Disqualified for this day</span>
            </label>
            <label className="field field-span">
              <span>Reason</span>
              <input
                className="input"
                type="text"
                value={dqReason}
                onChange={(e) => setDqReason(e.target.value)}
                disabled={siteDown}
                placeholder="Optional"
              />
            </label>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={siteDown}
            onClick={() => void saveDq()}
          >
            Save override
          </button>
          {dqMsg ? (
            <p className="empty-hint" role="status">
              {dqMsg}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
