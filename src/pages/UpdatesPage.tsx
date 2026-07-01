import { type FormEvent, useMemo, useState } from 'react'
import BusyButton from '../components/BusyButton'
import ViewOnlyBanner from '../components/ViewOnlyBanner'
import { useCompetition } from '../context/CompetitionContext'
import { useMutationBusy } from '../context/MutationBusyContext'
import type { UseCommitteeUpdatesResult } from '../hooks/useCommitteeUpdates'
import type { CommitteeUpdate } from '../lib/committeeUpdateQueries'
import {
  deleteCommitteeUpdate,
  insertCommitteeUpdate,
  updateCommitteeUpdate,
  validateCommitteeUpdateBody,
  validateCommitteeUpdateTitle,
} from '../lib/committeeUpdateQueries'
import { getSupabaseClient } from '../lib/supabaseClient'

type Props = {
  updates: UseCommitteeUpdatesResult
  canMutate: boolean
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function emptyForm() {
  return { title: '', body: '' }
}

function isFormSuccessMessage(m: string): boolean {
  return (
    m.startsWith('Update published') ||
    m.startsWith('Draft saved') ||
    m.startsWith('Published') ||
    m.startsWith('Changes saved') ||
    m.startsWith('Moved to drafts') ||
    m.startsWith('Deleted')
  )
}

export default function UpdatesPage({
  updates: { updates, loading, error: loadError, refresh },
  canMutate,
}: Props) {
  const { viewCompetition, activeCompetition, competitionId } = useCompetition()
  const comp = viewCompetition ?? activeCompetition
  const { runMutation } = useMutationBusy()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const editing = useMemo(
    () => (editingId ? updates.find((u) => u.id === editingId) : undefined),
    [editingId, updates],
  )

  function startNew() {
    setEditingId(null)
    setForm(emptyForm())
    setMsg(null)
  }

  function startEdit(row: CommitteeUpdate) {
    setEditingId(row.id)
    setForm({ title: row.title, body: row.body })
    setMsg(null)
  }

  function validateForPublish(title: string, body: string): string | null {
    const tErr = validateCommitteeUpdateTitle(title)
    if (tErr) return tErr
    const bErr = validateCommitteeUpdateBody(body)
    if (bErr) return bErr
    if (!body.trim()) return 'Add some body text before publishing.'
    return null
  }

  async function handleCreate(e: FormEvent, publish: boolean) {
    e.preventDefault()
    setMsg(null)
    const client = getSupabaseClient()
    if (!client) {
      setMsg('Supabase not configured.')
      return
    }
    const titleErr = validateCommitteeUpdateTitle(form.title)
    if (titleErr) {
      setMsg(titleErr)
      return
    }
    const bodyErr = validateCommitteeUpdateBody(form.body)
    if (bodyErr) {
      setMsg(bodyErr)
      return
    }
    if (publish) {
      const pubErr = validateForPublish(form.title, form.body)
      if (pubErr) {
        setMsg(pubErr)
        return
      }
    }
    if (!competitionId) {
      setMsg('No competition selected.')
      return
    }
    setSaving(true)
    try {
      await runMutation(publish ? 'Publishing update…' : 'Saving draft…', async () => {
        const { error: err } = await insertCommitteeUpdate(client, competitionId, {
          title: form.title,
          body: form.body,
          publish,
        })
        if (err) setMsg(err)
        else {
          setMsg(publish ? 'Update published.' : 'Draft saved.')
          startNew()
          await refresh()
        }
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(
    e: FormEvent,
    mode: 'draft' | 'publish' | 'save_published' | 'unpublish',
  ) {
    e.preventDefault()
    if (!editingId || !editing) return
    setMsg(null)
    const client = getSupabaseClient()
    if (!client) {
      setMsg('Supabase not configured.')
      return
    }
    const titleErr = validateCommitteeUpdateTitle(form.title)
    if (titleErr) {
      setMsg(titleErr)
      return
    }
    const bodyErr = validateCommitteeUpdateBody(form.body)
    if (bodyErr) {
      setMsg(bodyErr)
      return
    }

    let publishedAt: string | null = editing.publishedAt

    if (mode === 'unpublish') {
      publishedAt = null
    } else if (mode === 'publish') {
      const pubErr = validateForPublish(form.title, form.body)
      if (pubErr) {
        setMsg(pubErr)
        return
      }
      publishedAt = editing.publishedAt ?? new Date().toISOString()
    } else if (mode === 'draft') {
      publishedAt = null
    } else if (mode === 'save_published') {
      publishedAt = editing.publishedAt
      if (!publishedAt) {
        setMsg('This post is not published; use Publish instead.')
        return
      }
    }

    const labels: Record<typeof mode, string> = {
      draft: 'Saving draft…',
      publish: 'Publishing…',
      save_published: 'Saving changes…',
      unpublish: 'Unpublishing…',
    }
    setSaving(true)
    try {
      await runMutation(labels[mode], async () => {
        const { error: err } = await updateCommitteeUpdate(client, editingId, {
          title: form.title,
          body: form.body,
          publishedAt,
        })
        if (err) setMsg(err)
        else {
          setMsg(
            mode === 'unpublish'
              ? 'Moved to drafts (no longer visible to the public).'
              : mode === 'publish'
                ? 'Published.'
                : mode === 'save_published'
                  ? 'Changes saved.'
                  : 'Draft saved.',
          )
          startNew()
          await refresh()
        }
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this update permanently?')) return
    setMsg(null)
    const client = getSupabaseClient()
    if (!client) {
      setMsg('Supabase not configured.')
      return
    }
    setSaving(true)
    try {
      await runMutation('Deleting update…', async () => {
        const { error: err } = await deleteCommitteeUpdate(client, id)
        if (err) setMsg(err)
        else {
          setMsg('Deleted.')
          if (editingId === id) startNew()
          await refresh()
        }
      })
    } finally {
      setSaving(false)
    }
  }

  const showAdminForm = canMutate

  return (
    <div className="panel updates-panel">
      <h2 className="panel-title">Committee updates</h2>
      <p className="updates-intro">
        News and notices from the <strong>{comp?.name ?? 'the'}</strong> committee.
        {showAdminForm
          ? ' Signed-in admins can publish or edit drafts below.'
          : ' Check back here for launch briefings, schedule changes, and scoring notes.'}
      </p>

      <ViewOnlyBanner show={!canMutate} />

      {loading ? (
        <p className="empty-hint" role="status">
          Loading updates…
        </p>
      ) : null}

      {loadError ? (
        <div className="banner banner-error" role="alert">
          {loadError}
        </div>
      ) : null}

      {showAdminForm ? (
        <section className="updates-admin" aria-labelledby="updates-admin-heading">
          <h3 id="updates-admin-heading" className="updates-admin-title">
            {editingId ? 'Edit update' : 'New update'}
          </h3>
          <form className="updates-form" onSubmit={(e) => e.preventDefault()}>
            <label className="field">
              <span>Title</span>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={500}
                placeholder="Short headline"
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>Body</span>
              <textarea
                className="input updates-body-input"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={8}
                maxLength={20000}
                placeholder="Details for teams and anglers (line breaks are kept)."
              />
            </label>
            <div className="updates-form-actions">
              {editingId ? (
                <>
                  {editing?.publishedAt ? (
                    <>
                      <BusyButton
                        type="button"
                        className="btn btn-primary"
                        busy={saving}
                        busyLabel="Saving…"
                        disabled={saving}
                        onClick={(e) => void handleUpdate(e, 'save_published')}
                      >
                        Save changes
                      </BusyButton>
                      <BusyButton
                        type="button"
                        className="btn btn-secondary"
                        busy={saving}
                        busyLabel="Unpublishing…"
                        disabled={saving}
                        onClick={(e) => void handleUpdate(e, 'unpublish')}
                      >
                        Unpublish (draft)
                      </BusyButton>
                    </>
                  ) : (
                    <>
                      <BusyButton
                        type="button"
                        className="btn btn-secondary"
                        busy={saving}
                        busyLabel="Saving…"
                        disabled={saving}
                        onClick={(e) => void handleUpdate(e, 'draft')}
                      >
                        Save draft
                      </BusyButton>
                      <BusyButton
                        type="button"
                        className="btn btn-primary"
                        busy={saving}
                        busyLabel="Publishing…"
                        disabled={saving}
                        onClick={(e) => void handleUpdate(e, 'publish')}
                      >
                        Publish
                      </BusyButton>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => startNew()}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <BusyButton
                    type="button"
                    className="btn btn-secondary"
                    busy={saving}
                    busyLabel="Saving…"
                    disabled={saving}
                    onClick={(e) => void handleCreate(e, false)}
                  >
                    Save draft
                  </BusyButton>
                  <BusyButton
                    type="button"
                    className="btn btn-primary"
                    busy={saving}
                    busyLabel="Publishing…"
                    disabled={saving}
                    onClick={(e) => void handleCreate(e, true)}
                  >
                    Publish
                  </BusyButton>
                </>
              )}
            </div>
          </form>
          {msg ? (
            <p
              className={
                isFormSuccessMessage(msg)
                  ? 'banner banner-info updates-msg'
                  : 'banner banner-warn updates-msg'
              }
              role="status"
            >
              {msg}
            </p>
          ) : null}
        </section>
      ) : null}

      {!loading && updates.length === 0 ? (
        <p className="empty-hint">
          {canMutate
            ? 'No updates yet. Write the first one above.'
            : 'No published updates yet. The committee will post news here.'}
        </p>
      ) : null}

      <ul className="updates-list">
        {updates.map((u) => (
          <li key={u.id} className="update-card">
            <div className="update-card-head">
              <div className="update-meta">
                {!u.publishedAt ? (
                  <span className="status-pill status-pill-warn">Draft</span>
                ) : null}
                <time dateTime={u.publishedAt ?? u.updatedAt}>
                  {u.publishedAt
                    ? formatWhen(u.publishedAt)
                    : `Draft · edited ${formatWhen(u.updatedAt)}`}
                </time>
              </div>
              {showAdminForm ? (
                <div className="update-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => startEdit(u)}
                  >
                    Edit
                  </button>
                  <BusyButton
                    type="button"
                    className="btn btn-ghost btn-small"
                    busy={saving}
                    busyLabel="Deleting…"
                    disabled={saving}
                    onClick={() => void handleDelete(u.id)}
                  >
                    Delete
                  </BusyButton>
                </div>
              ) : null}
            </div>
            <h3 className="update-title">{u.title}</h3>
            <div className="update-body">{u.body}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
