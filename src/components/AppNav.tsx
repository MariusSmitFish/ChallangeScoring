export type AppView =
  | 'rules'
  | 'schedule'
  | 'updates'
  | 'competitions'
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
  /** When false, super-admin-only tabs (competitions, data reset) are hidden. */
  showSuperAdminTabs: boolean
}

const LINKS: {
  id: AppView
  label: string
  shortLabel?: string
  committeeOnly?: true
  superAdminOnly?: true
}[] = [
  { id: 'rules', label: 'Rules' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'updates', label: 'Updates' },
  {
    id: 'competitions',
    label: 'Competitions',
    shortLabel: 'Comps',
    committeeOnly: true,
    superAdminOnly: true,
  },
  { id: 'teams', label: 'Teams', committeeOnly: true },
  { id: 'species', label: 'Species', committeeOnly: true },
  {
    id: 'data-reset',
    label: 'Data reset',
    shortLabel: 'Reset',
    committeeOnly: true,
    superAdminOnly: true,
  },
  { id: 'score', label: 'Score entry', shortLabel: 'Score', committeeOnly: true },
  { id: 'boards', label: 'Leaderboards', shortLabel: 'Boards' },
]

export default function AppNav({
  view,
  onChange,
  showCommitteeTabs,
  showSuperAdminTabs,
}: NavProps) {
  const mainView = view === 'login' ? null : view
  const visibleLinks = LINKS.filter((l) => {
    if (l.superAdminOnly && !showSuperAdminTabs) return false
    if (l.committeeOnly && !showCommitteeTabs) return false
    return true
  })

  return (
    <nav className="app-nav" aria-label="Main">
      <div className="app-nav-scroll">
        {visibleLinks.map((l) => {
          const active = mainView === l.id
          const short = l.shortLabel ?? l.label
          return (
            <button
              key={l.id}
              type="button"
              className={`nav-btn ${active ? 'nav-btn-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(l.id)}
            >
              <span className="nav-label-long">{l.label}</span>
              <span className="nav-label-short">{short}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
