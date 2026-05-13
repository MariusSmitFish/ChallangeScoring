import { type FormEvent, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

type Props = {
  onSuccess: (isAdmin: boolean) => void
}

export default function LoginPage({ onSuccess }: Props) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err, isAdmin } = await signIn(email.trim(), password)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    onSuccess(isAdmin)
  }

  return (
    <div className="panel login-panel">
      <h2 className="panel-title">Admin sign in</h2>
      <p className="empty-hint login-hint">
        Committee accounts only. Everyone else can use the site without signing
        in (read-only).
      </p>
      <form className="login-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={busy}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={busy}
          />
        </label>
        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="empty-hint small login-foot">
        First admin: create the user under Supabase Authentication, then run the
        SQL in <code className="env-code">supabase-schema-03-admin-auth.sql</code>{' '}
        to add their UUID to <code className="env-code">app_admins</code>.
      </p>
    </div>
  )
}
