import { useState } from 'react'

export default function AuthScreen({
  isSupabaseReady,
  isLoading,
  error,
  onSubmit,
  onSignUp,
  onDemoContinue,
}) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('owner@gurufitness.com')
  const [password, setPassword] = useState('GuruFitness123!')
  const [fullName, setFullName] = useState('Gym Owner')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (mode === 'signup' && onSignUp) {
      onSignUp(email, password, fullName)
    } else {
      onSubmit(email, password)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="brand-mark auth-brand-mark">GF</div>
          <div>
            <p className="brand-title">Guru Fitness</p>
            <p className="brand-subtitle">Health Club</p>
          </div>
        </div>

        <div className="auth-copy">
          <p className="eyebrow">
            {isSupabaseReady ? (mode === 'signup' ? 'Create Owner Account' : 'Secure access') : 'Local Demo Access'}
          </p>
          <h1>
            {isSupabaseReady
              ? mode === 'signup'
                ? 'Register your Gym Account'
                : 'Sign in to Guru Fitness OS'
              : 'Local demo access'}
          </h1>
          <p>
            {isSupabaseReady
              ? mode === 'signup'
                ? 'Create your gym owner profile to connect Guru Fitness Health Club.'
                : 'Use your gym owner, admin, or staff account to access live data.'
              : 'Supabase is not configured yet. Continue in local demo mode while the backend is being connected.'}
          </p>
        </div>

        {isSupabaseReady ? (
          <form className="auth-form" onSubmit={handleSubmit}>
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
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@gurufitness.com"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="primary-button auth-button" disabled={isLoading}>
              {isLoading
                ? mode === 'signup'
                  ? 'Creating Account & Bootstrapping...'
                  : 'Signing in...'
                : mode === 'signup'
                ? 'Create Account'
                : 'Sign in'}
            </button>

            <div className="auth-footer-toggle" style={{ marginTop: '1rem', textAlign: 'center' }}>
              {mode === 'signin' ? (
                <button
                  type="button"
                  className="ghost-button"
                  style={{ fontSize: '0.875rem', width: '100%' }}
                  onClick={() => setMode('signup')}
                >
                  Need an owner account? Sign up
                </button>
              ) : (
                <button
                  type="button"
                  className="ghost-button"
                  style={{ fontSize: '0.875rem', width: '100%' }}
                  onClick={() => setMode('signin')}
                >
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="auth-demo-actions">
            {error && <div className="auth-error">{error}</div>}
            <button type="button" className="primary-button auth-button" onClick={onDemoContinue}>
              Continue in demo mode
            </button>
            <p className="auth-muted">
              Add <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> to enable real authentication.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

