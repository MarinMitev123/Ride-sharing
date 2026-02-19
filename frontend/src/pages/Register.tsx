import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getApiBaseUrl } from '../api/client'

export function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register: doRegister } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await doRegister(email, password, name, phone || undefined)
      navigate('/rides', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Грешка при регистрация'
      setError(msg)
      if (msg.includes('Не може да се свърже')) {
        const healthUrl = `${getApiBaseUrl()}/api/v1/health`
        setError(
          msg +
            ` Отворете в браузър ${healthUrl} – ако не се зарежда, пуснете първо бекенда (вижте ПЪРВИ_СТАРТ.md).`
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__header">
          <div className="auth-page__icon auth-page__icon--register" aria-hidden>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h1 className="auth-page__title">Регистрация</h1>
          <p className="auth-page__tagline">Създайте профил и започнете да споделяте или търсите пътувания</p>
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
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="вашият@имейл.com" />
            </span>
          </label>
          <label>
            Парола (минимум 6 символа)
            <span className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" placeholder="••••••••" />
            </span>
          </label>
          <label>
            Име
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Вашето име" />
          </label>
          <label>
            Телефон (по избор)
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="088 123 4567" />
          </label>
          <button type="submit" disabled={submitting} className="auth-page__btn">
            {submitting ? 'Регистриране...' : 'Регистрация'}
          </button>
        </form>
        <p className="form-footer">
          Вече имате профил? <Link to="/login">Вход</Link>
        </p>
      </div>
    </div>
  )
}
