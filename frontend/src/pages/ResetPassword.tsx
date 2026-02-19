import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token') ?? ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Паролите не съвпадат')
      return
    }
    if (newPassword.length < 6) {
      setError('Паролата трябва да е поне 6 символа')
      return
    }
    if (!tokenFromUrl.trim()) {
      setError('Липсва токен за възстановяване. Използвайте връзката от имейла.')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword({ token: tokenFromUrl, newPassword })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при смяна на паролата')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-page__card">
          <h1 className="auth-page__title">Паролата е сменена</h1>
          <p style={{ marginBottom: 20 }}>
            Можете да влезете с новата си парола.
          </p>
          <Link to="/login">Към вход</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <h1 className="auth-page__title">Нова парола</h1>
        <p className="auth-page__tagline" style={{ marginBottom: 20 }}>
          Въведете нова парола за акаунта си.
        </p>
        <form onSubmit={handleSubmit} className="auth-page__form">
          {error && <div className="form-error">{error}</div>}
          <label>
            Нова парола
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', marginTop: 4, border: '1px solid #d1d5db', borderRadius: 8 }}
            />
          </label>
          <label style={{ marginTop: 12 }}>
            Потвърди паролата
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', marginTop: 4, border: '1px solid #d1d5db', borderRadius: 8 }}
            />
          </label>
          <button type="submit" disabled={submitting} className="auth-page__btn" style={{ marginTop: 16 }}>
            {submitting ? 'Запазване...' : 'Запази новата парола'}
          </button>
        </form>
        <p className="form-footer" style={{ marginTop: 20 }}>
          <Link to="/login">Обратно към входа</Link>
        </p>
      </div>
    </div>
  )
}
