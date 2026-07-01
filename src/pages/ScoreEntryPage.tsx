import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  type CatchKind,
  sameTeamDaySpeciesCounts,
  scoreSingleCatch,
} from '../domain/scoringEngine'
import { billfishVariantLabels } from '../domain/competitionConfig'
import { useCompetition } from '../context/CompetitionContext'
import { useSpeciesRegistry } from '../context/SpeciesRegistryContext'
import {
  SPECIES_KEYS,
  speciesDisplayLabel,
} from '../domain/species'
import type { CatchRow } from '../domain/aggregates'
import type { UseCatchesResult } from '../hooks/useCatches'
import type { UseCompetitionDaysResult } from '../hooks/useCompetitionDays'
import type { UseTeamsResult } from '../hooks/useTeams'
import BusyButton from '../components/BusyButton'
import ViewOnlyBanner from '../components/ViewOnlyBanner'
import { formatPointsDisplay, roundPoints } from '../lib/formatPoints'

type Props = {
  teams: UseTeamsResult
  days: UseCompetitionDaysResult
  catches: UseCatchesResult
  canMutate: boolean
}

export default function ScoreEntryPage({
  teams,
  days,
  catches,
  canMutate,
}: Props) {
  const species = useSpeciesRegistry()
  const { scoringConfig } = useCompetition()
  const billfishOptions = useMemo(
    () => billfishVariantLabels(scoringConfig),
    [scoringConfig],
  )
  const saving = catches.syncing
  const blocked =
    teams.misconfigured ||
    teams.loading ||
    days.loading ||
    saving ||
    !canMutate
  const noDays = !teams.misconfigured && !days.loading && days.days.length === 0

  const [editingCatchId, setEditingCatchId] = useState<string | null>(null)

  const [dayId, setDayId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [anglerId, setAnglerId] = useState('')
  const [catchKind, setCatchKind] = useState<CatchKind>('weighed_gamefish')
  const [speciesKey, setSpeciesKey] = useState<string>(SPECIES_KEYS.yellowfin)
  const [weightStr, setWeightStr] = useState('')
  const [lengthStr, setLengthStr] = useState('')
  const [billVariant, setBillVariant] = useState('sailfish')
  const [notes, setNotes] = useState('')
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)

  useEffect(() => {
    if (catchKind !== 'billfish_release') return
    if (!billfishOptions.some((o) => o.id === billVariant)) {
      setBillVariant(billfishOptions[0]?.id ?? 'sailfish')
    }
  }, [catchKind, billfishOptions, billVariant])

  const members = useMemo(() => {
    const t = teams.teams.find((x) => x.id === teamId)
    return t?.members ?? []
  }, [teams.teams, teamId])

  useEffect(() => {
    if (!editingCatchId) return
    const c = catches.catches.find((x) => x.id === editingCatchId)
    if (!c) {
      setEditingCatchId(null)
      return
    }
    if (c.teamId !== teamId || c.competitionDayId !== dayId) {
      setEditingCatchId(null)
      setSubmitMsg(null)
    }
  }, [teamId, dayId, editingCatchId, catches.catches])

  const speciesOptions = useMemo(() => {
    if (catchKind === 'weighed_gamefish') return species.weighedOptions
    if (catchKind === 'length_release') return species.lengthOptions
    return [] as { key: string; label: string }[]
  }, [catchKind, species.weighedOptions, species.lengthOptions])

  useEffect(() => {
    if (catchKind === 'billfish_release') return
    const keys = speciesOptions.map((o) => o.key)
    if (keys.length === 0) return
    if (!keys.includes(speciesKey)) setSpeciesKey(keys[0])
  }, [catchKind, speciesOptions, speciesKey])

  const weightKg =
    weightStr.trim() === '' ? null : Number.parseFloat(weightStr.replace(',', '.'))
  const lengthCm =
    lengthStr.trim() === '' ? null : Number.parseFloat(lengthStr.replace(',', '.'))

  const preview = useMemo(() => {
    if (!teamId || !dayId) return null
    const counts = sameTeamDaySpeciesCounts(
      catches.catches,
      teamId,
      dayId,
      editingCatchId ?? undefined,
      species.entries,
    )
    const sk = catchKind === 'billfish_release' ? billVariant : speciesKey
    return scoreSingleCatch(
      {
        catchKind,
        speciesKey: sk,
        weightKg: Number.isFinite(weightKg as number) ? weightKg : null,
        lengthCm: Number.isFinite(lengthCm as number) ? lengthCm : null,
        billfishVariant: catchKind === 'billfish_release' ? billVariant : null,
      },
      {
        sameTeamDaySpeciesCounts: counts,
        speciesRegistry: species.entries,
        scoringConfig,
      },
    )
  }, [
    teamId,
    dayId,
    catches.catches,
    catchKind,
    speciesKey,
    billVariant,
    weightKg,
    scoringConfig,
    lengthCm,
    editingCatchId,
    species.entries,
  ])

  const dayCatchLog = useMemo(() => {
    if (!teamId || !dayId) return []
    return catches.catches.filter(
      (c) => c.teamId === teamId && c.competitionDayId === dayId,
    )
  }, [catches.catches, teamId, dayId])

  function anglerName(teamKey: string, memberId: string) {
    const t = teams.teams.find((x) => x.id === teamKey)
    return t?.members.find((m) => m.id === memberId)?.name ?? '—'
  }

  function entryTypeLabel(kind: string) {
    if (kind === 'weighed_gamefish') return 'Weighed'
    if (kind === 'length_release') return 'Length'
    if (kind === 'billfish_release') return 'Billfish'
    return kind
  }

  function catchDetailSummary(c: CatchRow) {
    if (c.catchKind === 'weighed_gamefish')
      return c.weightKg != null ? `${c.weightKg} kg` : '—'
    if (c.catchKind === 'length_release')
      return c.lengthCm != null ? `${c.lengthCm} cm` : '—'
    return '—'
  }

  function beginEditCatch(c: CatchRow) {
    setSubmitMsg(null)
    setEditingCatchId(c.id)
    setDayId(c.competitionDayId)
    setTeamId(c.teamId)
    setAnglerId(c.anglerId)
    setCatchKind(c.catchKind as CatchKind)
    if (c.catchKind === 'billfish_release') {
      setBillVariant(c.billfishVariant ?? c.speciesKey ?? 'sailfish')
    } else {
      setSpeciesKey(c.speciesKey)
    }
    setWeightStr(c.weightKg != null ? String(c.weightKg) : '')
    setLengthStr(c.lengthCm != null ? String(c.lengthCm) : '')
    setNotes(c.notes ?? '')
  }

  function cancelEditCatch() {
    setEditingCatchId(null)
    setSubmitMsg(null)
  }

  async function handleDeleteCatch(c: CatchRow) {
    if (
      !window.confirm(
        `Delete this score entry (${entryTypeLabel(c.catchKind)}, ${speciesDisplayLabel(c.speciesKey, species.entries)}, ${formatPointsDisplay(c.pointsTotal)} pts)?`,
      )
    ) {
      return
    }
    setSubmitMsg(null)
    const { error } = await catches.deleteCatch(c.id)
    if (error) setSubmitMsg(error)
    else {
      setSubmitMsg('Entry deleted.')
      if (editingCatchId === c.id) cancelEditCatch()
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitMsg(null)
    if (!dayId || !teamId || !anglerId) {
      setSubmitMsg('Choose competition day, team, and angler.')
      return
    }
    if (!preview || preview.errors.length) {
      setSubmitMsg(preview?.errors.join(' ') ?? 'Fix validation errors before saving.')
      return
    }
    const sk = catchKind === 'billfish_release' ? billVariant : speciesKey
    const payload = {
      teamId,
      anglerId,
      competitionDayId: dayId,
      catchKind,
      speciesKey: sk,
      weightKg: Number.isFinite(weightKg as number) ? weightKg : null,
      lengthCm: Number.isFinite(lengthCm as number) ? lengthCm : null,
      billfishVariant: catchKind === 'billfish_release' ? billVariant : null,
      pointsTotal: roundPoints(preview.points),
      notes: notes.trim() || null,
    }
    if (editingCatchId) {
      const { error } = await catches.updateCatch(editingCatchId, payload)
      if (error) setSubmitMsg(error)
      else {
        setSubmitMsg('Entry updated.')
        setEditingCatchId(null)
        setWeightStr('')
        setLengthStr('')
        setNotes('')
      }
    } else {
      const { error } = await catches.addCatch(payload)
      if (error) setSubmitMsg(error)
      else {
        setSubmitMsg('Saved.')
        setWeightStr('')
        setLengthStr('')
        setNotes('')
      }
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Score entry</h2>

      <ViewOnlyBanner
        show={
          !teams.misconfigured &&
          !teams.loading &&
          !days.loading &&
          !canMutate
        }
      />

      <p className="empty-hint score-hint">
        Record one fish at a time. Points are calculated from the rules (caps,
        minimum weights, billfish fixed scores, length table for kingfish/kakaap).
        Billfish: add video reference in notes. Use the log below to edit or remove
        entries for the selected team and day.
      </p>

      {noDays ? (
        <p className="banner banner-warn" role="status">
          No competition days in the database. Run{' '}
          <code className="env-code">supabase-schema-02-competition.sql</code> in
          Supabase SQL Editor, then refresh.
        </p>
      ) : null}

      <form className="score-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="field">
            <span>Competition day</span>
            <select
              className="input"
              value={dayId}
              onChange={(e) => setDayId(e.target.value)}
              disabled={blocked || noDays}
              required
            >
              <option value="">Select day</option>
              {days.days.map((d) => (
                <option key={d.id} value={d.id}>
                  Day {d.dayNumber} — {d.dayDate}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Team</span>
            <select
              className="input"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value)
                setAnglerId('')
              }}
              disabled={blocked}
              required
            >
              <option value="">Select team</option>
              {teams.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Angler</span>
            <select
              className="input"
              value={anglerId}
              onChange={(e) => setAnglerId(e.target.value)}
              disabled={blocked || !teamId}
              required
            >
              <option value="">Select angler</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Entry type</span>
            <select
              className="input"
              value={catchKind}
              onChange={(e) => {
                const k = e.target.value as CatchKind
                setCatchKind(k)
                if (k === 'weighed_gamefish') {
                  setSpeciesKey(
                    species.weighedOptions[0]?.key ?? SPECIES_KEYS.yellowfin,
                  )
                }
                if (k === 'length_release') {
                  setSpeciesKey(
                    species.lengthOptions[0]?.key ?? SPECIES_KEYS.kingfish,
                  )
                }
              }}
              disabled={blocked}
            >
              <option value="weighed_gamefish">Weighed gamefish</option>
              <option value="length_release">Measure & release (length table)</option>
              <option value="billfish_release">Billfish (tag & release)</option>
            </select>
          </label>

          {catchKind === 'billfish_release' ? (
            <label className="field">
              <span>Billfish</span>
              <select
                className="input"
                value={billVariant}
                onChange={(e) => setBillVariant(e.target.value)}
                disabled={blocked}
              >
                {billfishOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label} ({o.points} pts)
                  </option>
                ))}
              </select>
            </label>
          ) : catchKind === 'length_release' ? (
            <label className="field">
              <span>Species</span>
              <select
                className="input"
                value={speciesKey}
                onChange={(e) => setSpeciesKey(e.target.value)}
                disabled={blocked}
              >
                {speciesOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>Species</span>
              <select
                className="input"
                value={speciesKey}
                onChange={(e) => setSpeciesKey(e.target.value)}
                disabled={blocked}
              >
                {speciesOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {catchKind === 'weighed_gamefish' ? (
            <label className="field">
              <span>Weight (kg)</span>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 12.4"
                value={weightStr}
                onChange={(e) => setWeightStr(e.target.value)}
                disabled={blocked}
              />
            </label>
          ) : null}

          {catchKind === 'length_release' ? (
            <label className="field">
              <span>Length (cm)</span>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 92"
                value={lengthStr}
                onChange={(e) => setLengthStr(e.target.value)}
                disabled={blocked}
              />
            </label>
          ) : null}

          <label className="field field-span">
            <span>Notes (e.g. video link for billfish)</span>
            <textarea
              className="input textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={blocked}
            />
          </label>
        </div>

        {preview ? (
          <div className="preview-box" aria-live="polite">
            <strong>Preview:</strong>{' '}
            {preview.errors.length ? (
              <span className="text-danger">{preview.errors.join(' ')}</span>
            ) : (
              <span>
                {formatPointsDisplay(preview.points)} points
                {preview.warnings.length ? ` — ${preview.warnings.join(' ')}` : ''}
              </span>
            )}
          </div>
        ) : null}

        {submitMsg ? (
          <p className="empty-hint" role="status">
            {submitMsg}
          </p>
        ) : null}

        <div className="score-form-actions">
          {editingCatchId ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={blocked || noDays}
              onClick={cancelEditCatch}
            >
              Cancel edit
            </button>
          ) : null}
          <BusyButton
            type="submit"
            className="btn btn-primary"
            disabled={blocked || noDays}
            busy={saving}
            busyLabel={editingCatchId ? 'Updating…' : 'Saving…'}
          >
            {editingCatchId ? 'Update catch' : 'Save catch'}
          </BusyButton>
        </div>
      </form>

      {canMutate && teamId && dayId && !noDays ? (
        <section className="score-day-log" aria-labelledby="score-log-heading">
          <h3 id="score-log-heading" className="score-day-log-title">
            Entries for this team &amp; day ({dayCatchLog.length})
          </h3>
          {dayCatchLog.length === 0 ? (
            <p className="empty-hint small">No catches logged yet for this selection.</p>
          ) : (
            <div className="table-wrap score-day-log-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Angler</th>
                    <th>Type</th>
                    <th>Species</th>
                    <th>Detail</th>
                    <th className="num">Pts</th>
                    <th className="score-day-log-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dayCatchLog.map((c) => (
                    <tr
                      key={c.id}
                      className={
                        c.id === editingCatchId ? 'score-day-log-row-active' : undefined
                      }
                    >
                      <td>{anglerName(c.teamId, c.anglerId)}</td>
                      <td>{entryTypeLabel(c.catchKind)}</td>
                      <td>{speciesDisplayLabel(c.speciesKey, species.entries)}</td>
                      <td>{catchDetailSummary(c)}</td>
                      <td className="num">{formatPointsDisplay(c.pointsTotal)}</td>
                      <td className="score-day-log-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          disabled={blocked}
                          onClick={() => beginEditCatch(c)}
                        >
                          Edit
                        </button>
                        <BusyButton
                          type="button"
                          className="btn btn-danger btn-small"
                          disabled={blocked}
                          busy={saving}
                          busyLabel="Deleting…"
                          onClick={() => void handleDeleteCatch(c)}
                        >
                          Delete
                        </BusyButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
