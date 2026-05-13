type Props = {
  show: boolean
  /** When signed in but not in app_admins */
  signedInNonAdmin?: boolean
}

export default function ViewOnlyBanner({
  show,
  signedInNonAdmin = false,
}: Props) {
  if (!show) return null
  return (
    <div className="banner banner-info" role="status">
      {signedInNonAdmin ? (
        <>
          <strong>Signed in</strong> — this account is not listed as an admin, so
          changes are disabled. Ask the committee to add your user in Supabase (
          <code className="env-code">app_admins</code>).
        </>
      ) : (
        <>
          <strong>View only.</strong> Public visitors can browse rules, schedule,
          teams, scores, and boards. Admins must sign in to add teams, enter
          catches, or set day disqualifications.
        </>
      )}
    </div>
  )
}
