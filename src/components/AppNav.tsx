export type AppView =
  | 'rules'
  | 'schedule'
  | 'teams'
  | 'species'
  | 'score'
  | 'boards'
  | 'data-reset'
  | 'login'

type NavProps = {
  view: AppView
  onChange: (v: AppView) => void
  /** When false, committee-only tabs (teams, score entry) are hidden. */
  showCommitteeTabs: boolean
}

const LINKS: { id: AppView; label: string; committeeOnly?: true }[] = [
  { id: 'rules', label: 'Rules' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'teams', label: 'Teams', committeeOnly: true },
  { id: 'species', label: 'Species', committeeOnly: true },
  { id: 'data-reset', label: 'Data reset', committeeOnly: true },
  { id: 'score', label: 'Score entry', committeeOnly: true },
  { id: 'boards', label: 'Leaderboards' },
]

export default function AppNav({
  view,
  onChange,
  showCommitteeTabs,
}: NavProps) {
  const mainView = view === 'login' ? null : view
  const visibleLinks = showCommitteeTabs
    ? LINKS
    : LINKS.filter((l) => !l.committeeOnly)

  return (
    <nav className="app-nav" aria-label="Main">
      <div className="app-nav-scroll">
        {visibleLinks.map((l) => {
          const active = mainView === l.id
          return (
            <button
              key={l.id}
              type="button"
              className={`nav-btn ${active ? 'nav-btn-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(l.id)}
            >
              {l.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
