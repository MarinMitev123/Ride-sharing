import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await forgotPassword(email)
      setMessage(res.message)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при изпращане')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-page__card">
          <h1 className="auth-page__title">Проверете имейла си</h1>
          <p style={{ marginBottom: 20 }}>
            {message || 'Ако съществува акаунт с този имейл, ще получите инструкции за възстановяване.'}
          </p>
          <Link to="/login">Обратно към входа</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <h1 className="auth-page__title">Забравена парола</h1>
        <p className="auth-page__tagline" style={{ marginBottom: 20 }}>
          Въведете имейла си и натиснете „Изпрати инструкции“.
        </p>
        <form onSubmit={handleSubmit} className="auth-page__form">
          {error && <div className="form-error">{error}</div>}
          <label>
            Имейл
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="вашият@имейл.com"
              style={{ width: '100%', padding: '10px 12px', marginTop: 4, border: '1px solid #d1d5db', borderRadius: 8 }}
            />
          </label>
          <button type="submit" disabled={submitting} className="auth-page__btn" style={{ marginTop: 16 }}>
            {submitting ? 'Изпращане...' : 'Изпрати инструкции'}
          </button>
        </form>
        <p className="form-footer" style={{ marginTop: 20 }}>
          <Link to="/login">Обратно към входа</Link>
        </p>
      </div>
    </div>
  )
}
