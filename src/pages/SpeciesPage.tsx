import { type FormEvent, useEffect, useMemo, useState } from 'react'
import type { SpeciesCategory, SpeciesRegistryEntry } from '../domain/species'
import BusyButton from '../components/BusyButton'
import ViewOnlyBanner from '../components/ViewOnlyBanner'
import { useCompetition } from '../context/CompetitionContext'
import { useMutationBusy } from '../context/MutationBusyContext'
import { useSpeciesRegistry } from '../context/SpeciesRegistryContext'
import {
  deleteSpeciesByKey,
  insertSpeciesEntry,
  updateSpeciesEntry,
  validateSpeciesKey,
} from '../lib/speciesQueries'
import { getSupabaseClient } from '../lib/supabaseClient'
import type { UseCatchesResult } from '../hooks/useCatches'

type Props = {
  canMutate: boolean
  signedInNonAdmin: boolean
  catches: UseCatchesResult
}

function createEmptyAddForm() {
  return {
    key: '',
    label: '',
    category: 'weighed_gamefish' as SpeciesCategory,
    capGroup: '',
    active: true,
  }
}

/** New species are appended after existing rows in the same category (dropdown order). */
function defaultSortOrderForCategory(
  entries: SpeciesRegistryEntry[],
  category: SpeciesCategory,
): number {
  let max = 0
  for (const e of entries) {
    if (e.category === category && e.sortOrder > max) max = e.sortOrder
  }
  return max > 0 ? max + 10 : 100
}

export default function SpeciesPage({
  canMutate,
  signedInNonAdmin,
  catches,
}: Props) {
  const species = useSpeciesRegistry()
  const { competitionId } = useCompetition()
  const { runMutation } = useMutationBusy()
  const blocked =
    species.loading || catches.syncing || !canMutate || !competitionId
  const [msg, setMsg] = useState<string | null>(null)
  const [addForm, setAddForm] = useState(createEmptyAddForm)
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [addBusy, setAddBusy] = useState(false)

  const sorted = useMemo(
    () =>
      [...species.entries].sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.sortOrder - b.sortOrder ||
          a.key.localeCompare(b.key),
      ),
    [species.entries],
  )

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const client = getSupabaseClient()
    if (!client) {
      setMsg('Supabase not configured.')
      return
    }
    const keyErr = validateSpeciesKey(addForm.key)
    if (keyErr) {
      setMsg(keyErr)
      return
    }
    if (!competitionId) {
      setMsg('No competition selected.')
      return
    }
    setAddBusy(true)
    try {
      await runMutation('Adding species…', async () => {
        const { error } = await insertSpeciesEntry(client, competitionId, {
          key: addForm.key.trim().toLowerCase(),
          label: addForm.label,
          category: addForm.category,
          capGroup: addForm.capGroup.trim() || addForm.key.trim().toLowerCase(),
          sortOrder: defaultSortOrderForCategory(species.entries, addForm.category),
          active: addForm.active,
        })
        if (error) setMsg(error)
        else {
          setMsg('Species added.')
          setAddForm(createEmptyAddForm())
          await species.refresh()
          await catches.refresh(true)
        }
      })
    } finally {
      setAddBusy(false)
    }
  }

  async function saveRow(row: SpeciesRegistryEntry) {
    setMsg(null)
    const client = getSupabaseClient()
    if (!client) {
      setMsg('Supabase not configured.')
      return
    }
    if (!competitionId) {
      setMsg('No competition selected.')
      return
    }
    setRowBusy(row.key)
    try {
      await runMutation(`Saving ${row.key}…`, async () => {
        const { error } = await updateSpeciesEntry(client, competitionId, row.key, {
          label: row.label,
          category: row.category,
          capGroup: row.capGroup,
          sortOrder: row.sortOrder,
          active: row.active,
        })
        if (error) setMsg(error)
        else {
          setMsg(`Saved “${row.key}”.`)
          await species.refresh()
          await catches.refresh(true)
        }
      })
    } finally {
      setRowBusy(null)
    }
  }

  async function deleteRow(row: SpeciesRegistryEntry) {
    setMsg(null)
    const used = catches.catches.filter((c) => c.speciesKey === row.key).length
    const usedNote =
      used > 0
        ? `${used} score ${used === 1 ? 'entry still' : 'entries still'} use this species key. Those rows are not removed; leaderboards may show the raw key until you edit or delete them.\n\n`
        : ''
    if (
      !window.confirm(
        `${usedNote}Delete “${row.label}” (${row.key}) from the species catalogue?`,
      )
    ) {
      return
    }
    const client = getSupabaseClient()
    if (!client) {
      setMsg('Supabase not configured.')
      return
    }
    if (!competitionId) {
      setMsg('No competition selected.')
      return
    }
    setRowBusy(row.key)
    try {
      await runMutation(`Deleting ${row.key}…`, async () => {
        const { error } = await deleteSpeciesByKey(client, competitionId, row.key)
        if (error) setMsg(error)
        else {
          setMsg(`Deleted “${row.key}”.`)
          await species.refresh()
          await catches.refresh(true)
        }
      })
    } finally {
      setRowBusy(null)
    }
  }

  return (
    <section className="panel" aria-labelledby="species-heading">
      <h2 id="species-heading" className="panel-title">
        Species catalogue
      </h2>
      <p className="empty-hint small species-page-lead">
        Keys are stored on catch rows: edit labels here, delete a catalogue row, or turn off
        Active to hide a species from new entries. Existing catches are never removed when you
        delete a species; boards may show the raw key until those entries are updated. Billfish
        stay on the separate billfish entry (not listed here).
      </p>

      <ViewOnlyBanner
        show={!species.loading && !canMutate}
        signedInNonAdmin={signedInNonAdmin}
      />

      {species.error ? (
        <div className="banner banner-error" role="alert">
          {species.error}
        </div>
      ) : null}

      {msg ? (
        <p className="empty-hint" role="status">
          {msg}
        </p>
      ) : null}

      <form className="score-form species-add-form" onSubmit={handleAdd}>
        <h3 className="score-day-log-title">Add species</h3>
        <div className="field-grid">
          <label className="field">
            <span>Key (slug)</span>
            <input
              className="input"
              value={addForm.key}
              onChange={(e) => setAddForm((f) => ({ ...f, key: e.target.value }))}
              placeholder="e.g. cobia"
              disabled={blocked}
              autoComplete="off"
              maxLength={64}
            />
          </label>
          <label className="field">
            <span>Display label</span>
            <input
              className="input"
              value={addForm.label}
              onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Cobia"
              disabled={blocked}
              maxLength={200}
            />
          </label>
          <label className="field">
            <span>Entry category</span>
            <select
              className="input"
              value={addForm.category}
              onChange={(e) =>
                setAddForm((f) => ({
                  ...f,
                  category: e.target.value as SpeciesCategory,
                }))
              }
              disabled={blocked}
            >
              <option value="weighed_gamefish">Weighed gamefish</option>
              <option value="length_release">Length (measure &amp; release)</option>
            </select>
          </label>
          <label className="field">
            <span>Cap group</span>
            <input
              className="input"
              value={addForm.capGroup}
              onChange={(e) => setAddForm((f) => ({ ...f, capGroup: e.target.value }))}
              placeholder="Usually same as key; share a value to cap together"
              disabled={blocked}
              maxLength={64}
            />
          </label>
          <label className="field field-check">
            <input
              type="checkbox"
              checked={addForm.active}
              onChange={(e) => setAddForm((f) => ({ ...f, active: e.target.checked }))}
              disabled={blocked}
            />
            <span>Active (shown in entry form)</span>
          </label>
        </div>
        <BusyButton
          type="submit"
          className="btn btn-primary"
          disabled={blocked}
          busy={addBusy}
          busyLabel="Adding…"
        >
          Add species
        </BusyButton>
      </form>

      <h3 className="score-day-log-title species-table-heading">
        All species ({sorted.length})
      </h3>
      {species.loading ? (
        <p className="empty-hint">Loading species…</p>
      ) : sorted.length === 0 ? (
        <p className="empty-hint">
          No species rows yet. Run <code>supabase-schema-04-species.sql</code> in the Supabase SQL
          editor, then refresh.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data-table species-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Label</th>
                <th>Category</th>
                <th>Cap group</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <SpeciesRowEditor
                  key={row.key}
                  initial={row}
                  allEntries={species.entries}
                  disabled={blocked}
                  rowBusy={rowBusy === row.key}
                  onSave={saveRow}
                  onDelete={deleteRow}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function SpeciesRowEditor({
  initial,
  allEntries,
  disabled,
  rowBusy,
  onSave,
  onDelete,
}: {
  initial: SpeciesRegistryEntry
  allEntries: SpeciesRegistryEntry[]
  disabled: boolean
  rowBusy: boolean
  onSave: (row: SpeciesRegistryEntry) => void | Promise<void>
  onDelete: (row: SpeciesRegistryEntry) => void | Promise<void>
}) {
  const [label, setLabel] = useState(initial.label)
  const [category, setCategory] = useState<SpeciesCategory>(initial.category)
  const [capGroup, setCapGroup] = useState(initial.capGroup)
  const [active, setActive] = useState(initial.active)

  useEffect(() => {
    setLabel(initial.label)
    setCategory(initial.category)
    setCapGroup(initial.capGroup)
    setActive(initial.active)
  }, [initial])

  const dirty =
    label !== initial.label ||
    category !== initial.category ||
    capGroup !== initial.capGroup ||
    active !== initial.active

  return (
    <tr>
      <td>
        <code>{initial.key}</code>
      </td>
      <td>
        <input
          className="input input-table"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={disabled}
        />
      </td>
      <td>
        <select
          className="input input-table"
          value={category}
          onChange={(e) => setCategory(e.target.value as SpeciesCategory)}
          disabled={disabled}
        >
          <option value="weighed_gamefish">Weighed</option>
          <option value="length_release">Length</option>
        </select>
      </td>
      <td>
        <input
          className="input input-table"
          value={capGroup}
          onChange={(e) => setCapGroup(e.target.value)}
          disabled={disabled}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          disabled={disabled}
        />
      </td>
      <td>
        <div className="species-row-actions">
          <BusyButton
            type="button"
            className="btn btn-secondary btn-small"
            disabled={disabled || !dirty}
            busy={rowBusy}
            busyLabel="Saving…"
            onClick={() => {
              const others = allEntries.filter((e) => e.key !== initial.key)
              const sortOrder =
                category === initial.category
                  ? initial.sortOrder
                  : defaultSortOrderForCategory(others, category)
              void onSave({
                ...initial,
                label,
                category,
                capGroup,
                sortOrder,
                active,
              })
            }}
          >
            Save
          </BusyButton>
          <BusyButton
            type="button"
            className="btn btn-danger btn-small"
            disabled={disabled}
            busy={rowBusy}
            busyLabel="Deleting…"
            onClick={() => void onDelete(initial)}
          >
            Delete
          </BusyButton>
        </div>
      </td>
    </tr>
  )
}
