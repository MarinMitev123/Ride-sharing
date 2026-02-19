import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from ?? '/rides', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при вход')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__header">
          <div className="auth-page__icon" aria-hidden>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
          <h1 className="auth-page__title">Вход</h1>
          <p className="auth-page__tagline">Влезте в профила си и намерете пътуване до желаната дестинация</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-page__form">
          {error && <div className="form-error">{error}</div>}
          <label>
            Имейл
            <span className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="вашият@имейл.com"
              />
            </span>
          </label>
          <label>
            Парола
            <span className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </span>
          </label>
          <p className="auth-page__forgot-wrap">
            <Link to="/forgot-password" className="auth-page__forgot-link">Забравена парола?</Link>
          </p>
          <button type="submit" disabled={submitting} className="auth-page__btn">
            {submitting ? 'Вход...' : 'Вход'}
          </button>
        </form>
        <p className="form-footer">
          Нямате профил? <Link to="/register">Регистрация</Link>
        </p>
      </div>
    </div>
  )
}
