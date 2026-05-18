type Props = {
  busy: boolean
  label: string | null
}

export default function MutationStatusBar({ busy, label }: Props) {
  if (!busy) return null

  return (
    <div className="mutation-status" role="status" aria-live="polite" aria-busy="true">
      <span className="mutation-status-spinner" aria-hidden="true" />
      <span className="mutation-status-text">{label ?? 'Saving?'}</span>
    </div>
  )
}
