type Props = {
  show: boolean
}

export default function ViewOnlyBanner({ show }: Props) {
  if (!show) return null
  return (
    <div className="banner banner-info" role="status">
      <strong>View only.</strong> Public visitors can browse rules, schedule,
      teams, scores, and boards. Committee members must sign in to add teams,
      enter catches, or set day disqualifications.
    </div>
  )
}
