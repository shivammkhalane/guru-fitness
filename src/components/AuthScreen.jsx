import { useState } from 'react'
import { LockKeyhole, Mail } from 'lucide-react'

export default function AuthScreen({
  isSupabaseReady,
  isLoading,
  error,
  onSubmit,
  onSignUp,
  onGoogleSignIn,
  onDemoContinue,
}) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (mode === 'signup' && onSignUp) {
      onSignUp(email, password, fullName)
    } else {
      onSubmit(email, password)
    }
  }

  return (
    <main className="login-page-wrapper">
      <section className="login-branding" aria-label="Guru Fitness Health Club">
        <div className="login-brand">
          <span className="login-brand-mark">GF</span>
          <span className="login-brand-copy">
            <strong>Guru Fitness</strong>
            <small>HEALTH CLUB · DHULE</small>
          </span>
        </div>

        <div className="login-hero">
          <p className="login-eyebrow">GURU FITNESS HEALTH CLUB</p>
          <h1>Members, attendance and payments.</h1>
          <p className="login-hero-subtitle">
            The front-desk workspace for Guru Fitness Health Club in Dhule.
          </p>
        </div>

        <dl className="login-business-details">
          <div><dt>Location</dt><dd>Dhule, Maharashtra</dd></div>
          <div><dt>Owner</dt><dd>Mr. Khushal Solanke</dd></div>
        </dl>
      </section>

      <section className="login-access">
        <div className="login-card">
          <header className="login-card-header">
            <p className="login-card-eyebrow">{mode === 'signup' ? 'OWNER ACCESS' : 'STAFF ACCESS'}</p>
            <h2>{mode === 'signup' ? 'Create an owner account' : 'Sign in'}</h2>
            <p>
              {isSupabaseReady
                ? mode === 'signup'
                  ? 'Set up access to the gym records.'
                  : 'Open the gym member, attendance and payment records.'
                : 'Explore the app with local demo records.'}
            </p>
          </header>

          {isSupabaseReady ? (
            <form className="auth-form login-form" onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <label>
                  <span>Full Name</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Gym Owner Name"
                    required
                  />
                </label>
              )}

              <label>
                <span>Email</span>
                <span className="login-input-wrap">
                  <Mail size={17} aria-hidden="true" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="owner@gurufitness.com"
                    autoComplete="email"
                    required
                  />
                </span>
              </label>

              <label>
                <span className="login-password-label">
                  Password
                </span>
                <span className="login-input-wrap">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                  />
                </span>
              </label>

              {error && <div className="auth-error" role="alert">{error}</div>}

              <button type="submit" className="primary-button auth-button login-submit" disabled={isLoading}>
                {isLoading
                  ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
                  : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>

              <div className="login-divider"><span>OR</span></div>

              {onGoogleSignIn && (
                <button
                  type="button"
                  className="google-auth-button"
                  onClick={onGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg aria-hidden="true" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.73 7.18l7.64 5.93c4.46-4.12 7.13-10.2 7.13-17.58Z" />
                    <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.89.93 7.59 2.56 10.78l7.97-6.19Z" transform="translate(0 0)" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.64-5.93c-2.12 1.43-4.84 2.28-8.26 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
                  </svg>
                  Continue with Google
                </button>
              )}

              <button
                type="button"
                className="ghost-button login-signup-button"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                disabled={isLoading}
              >
                {mode === 'signin' ? 'Create an owner account' : 'Already have an account? Sign in'}
              </button>
            </form>
          ) : (
            <div className="auth-demo-actions">
              {error && <div className="auth-error" role="alert">{error}</div>}
              <button type="button" className="primary-button auth-button login-submit" onClick={onDemoContinue}>
                Open demo
              </button>
              <p className="auth-muted">Demo records are stored in this browser.</p>
            </div>
          )}

          <a href="/member" className="login-member-portal-link">Member sign-in</a>
        </div>
      </section>
    </main>
  )
}
