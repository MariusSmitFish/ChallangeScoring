import { type FormEvent, useState } from 'react'
import BusyButton from '../components/BusyButton'
import { useCompetition } from '../context/CompetitionContext'
import { useMutationBusy } from '../context/MutationBusyContext'

type Props = {
  canMutate: boolean
}

export default function CompetitionsPage({ canMutate }: Props) {
  const {
    competitions,
    activeCompetition,
    viewCompetition,
    loading,
    createCompetition,
    setSelectedCompetitionId,
    setAsActive,
  } = useCompetition()

  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [venue, setVenue] = useState('')
  const { runMutation } = useMutationBusy()
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!canMutate) return
    setBusy(true)
    try {
      await runMutation('Creating competition…', async () => {
        const { error } = await createCompetition({
          slug,
          name,
          year: year.trim() ? Number.parseInt(year, 10) : null,
          venue: venue.trim() || null,
          cloneSpeciesFromId: activeCompetition?.id ?? viewCompetition?.id ?? null,
        })
        if (error) setMsg(error)
        else {
          setMsg(
            'Competition created. Switch to it in the header, then add teams and species.',
          )
          setSlug('')
          setName('')
          setYear('')
          setVenue('')
        }
      })
    } finally {
      setBusy(false)
    }
  }

  if (!canMutate) {
    return (
      <div className="panel">
        <p className="empty-hint">Admin sign-in required to manage competitions.</p>
      </div>
    )
  }

  return (
    <div className="panel competitions-panel">
      <h2 className="panel-title">Competitions</h2>
      <p className="empty-hint competitions-intro">
        Only one competition is <strong>public active</strong> at a time — that is what
        visitors see on Rules, Schedule, Leaderboards, and Updates. Admins can switch the
        working competition in the header to set up another event without affecting the
        public site until you activate it.
      </p>

      {loading ? (
        <p className="empty-hint" role="status">
          Loading competitions…
        </p>
      ) : null}

      <ul className="competitions-list">
        {competitions.map((c) => (
          <li key={c.id} className="competition-card">
            <div className="competition-card-head">
              <h3 className="competition-card-title">{c.name}</h3>
              <div className="competition-card-badges">
                {c.isActive ? (
                  <span className="status-pill status-pill-ok">Public active</span>
                ) : null}
                {viewCompetition?.id === c.id ? (
                  <span className="status-pill">Editing</span>
                ) : null}
              </div>
            </div>
            <p className="competition-card-meta">
              <code className="env-code">{c.slug}</code>
              {c.year ? ` · ${c.year}` : ''}
              {c.venue ? ` · ${c.venue}` : ''}
            </p>
            <div className="competition-card-actions">
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setSelectedCompetitionId(c.id)}
              >
                Work on this
              </button>
              {!c.isActive ? (
                <BusyButton
                  type="button"
                  className="btn btn-secondary btn-small"
                  busy={activatingId === c.id}
                  busyLabel="Activating…"
                  disabled={activatingId !== null}
                  onClick={() => {
                    setActivatingId(c.id)
                    void runMutation('Activating competition…', async () => {
                      const err = await setAsActive(c.id)
                      if (err) setMsg(err)
                    }).finally(() => setActivatingId(null))
                  }}
                >
                  Set as public active
                </BusyButton>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <section className="competitions-create" aria-labelledby="comp-create-heading">
        <h3 id="comp-create-heading" className="competitions-create-title">
          New competition
        </h3>
        <form className="competitions-form" onSubmit={(e) => void handleCreate(e)}>
          <label className="field">
            <span>Name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="THE CHALLENGE 2027"
              required
            />
          </label>
          <label className="field">
            <span>Slug</span>
            <input
              className="input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="challenge-2027"
              required
            />
          </label>
          <label className="field">
            <span>Year (optional)</span>
            <input
              className="input"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2027"
            />
          </label>
          <label className="field">
            <span>Venue (optional)</span>
            <input
              className="input"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Barcos"
            />
          </label>
          <p className="empty-hint small">
            Creates default schedule days from the template, copies species from the
            current active competition when available, and uses default scoring rules.
          </p>
          <BusyButton
            type="submit"
            className="btn btn-primary"
            disabled={busy}
            busy={busy}
            busyLabel="Creating…"
          >
            Create competition
          </BusyButton>
        </form>
        {msg ? (
          <p className="banner banner-info competitions-msg" role="status">
            {msg}
          </p>
        ) : null}
      </section>
    </div>
  )
}
