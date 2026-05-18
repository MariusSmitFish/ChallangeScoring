import { useCompetition } from '../context/CompetitionContext'

type Props = {
  canMutate: boolean
}

export default function CompetitionSwitcher({ canMutate }: Props) {
  const {
    competitions,
    viewCompetition,
    loading,
    setSelectedCompetitionId,
    setAsActive,
  } = useCompetition()

  if (!canMutate || competitions.length === 0) return null

  const selectedId = viewCompetition?.id ?? ''

  return (
    <div className="comp-switcher" aria-label="Competition selector">
      <label className="comp-switcher-label">
        <span className="sr-only">Working competition</span>
        <select
          className="input comp-switcher-select"
          value={selectedId}
          disabled={loading}
          onChange={(e) => setSelectedCompetitionId(e.target.value)}
        >
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isActive ? ' (public)' : ''}
            </option>
          ))}
        </select>
      </label>
      {viewCompetition && !viewCompetition.isActive ? (
        <button
          type="button"
          className="btn btn-secondary btn-small comp-switcher-activate"
          disabled={loading}
          onClick={() => void setAsActive(viewCompetition.id)}
        >
          <span className="comp-switcher-activate-long">Set as public active</span>
          <span className="comp-switcher-activate-short">Make public</span>
        </button>
      ) : null}
      {viewCompetition?.isActive ? (
        <span className="status-pill status-pill-ok comp-switcher-pill">
          Public site
        </span>
      ) : viewCompetition ? (
        <span className="status-pill status-pill-warn comp-switcher-pill">
          Admin preview
        </span>
      ) : null}
    </div>
  )
}
