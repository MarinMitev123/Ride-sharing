import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { changePassword } from '../api/auth'

export function Profile() {
  const { user, token } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!token || !user) return
    if (newPassword.length < 6) {
      setError('Новата парола трябва да е поне 6 символа.')
      return
    }
    setSubmitting(true)
    try {
      await changePassword(
        { currentPassword, newPassword },
        token
      )
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при смяна на паролата')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-main page-content">
      <h1>Профил</h1>
      <p style={{ marginBottom: 16 }}>
        <Link to="/rides">← Обратно към пътуванията</Link>
      </p>
      {user && (
        <p style={{ marginBottom: 24, color: '#6b7280' }}>
          {user.name} · {user.email}
        </p>
      )}
      <div className="page-form" style={{ maxWidth: 400 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Смяна на парола</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          {success && (
            <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, marginBottom: 16, color: '#166534' }}>
              Паролата е сменена успешно.
            </div>
          )}
          <label>
            Текуща парола
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', marginTop: 4, border: '1px solid #d1d5db', borderRadius: 8 }}
            />
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            Нова парола (мин. 6 символа)
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', padding: '10px 12px', marginTop: 4, border: '1px solid #d1d5db', borderRadius: 8 }}
            />
          </label>
          <button type="submit" disabled={submitting} style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer' }}>
            {submitting ? 'Смяна...' : 'Смени паролата'}
          </button>
        </form>
      </div>
    </div>
  )
}
