import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { changePassword } from '../api/auth'
import { updateProfile } from '../api/users'
import { getRatingsForUser } from '../api/ratings'
import type { RatingDto } from '../types/api'

const inputStyle = { width: '100%', padding: '10px 12px', marginTop: 4, border: '1px solid #d1d5db', borderRadius: 8 }

export function Profile() {
  const { user, token, refreshUser } = useAuth()
  const { addToast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [ratings, setRatings] = useState<RatingDto[]>([])

  useEffect(() => {
    if (user) {
      setEditName(user.name)
      setEditPhone(user.phone ?? '')
    }
  }, [user])

  useEffect(() => {
    if (!user?.id || !token) return
    getRatingsForUser(user.id, token)
      .then(setRatings)
      .catch(() => {})
  }, [user?.id, token])

  async function handlePasswordSubmit(e: React.FormEvent) {
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
      await changePassword({ currentPassword, newPassword }, token)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при смяна на паролата')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setEditSubmitting(true)
    try {
      await updateProfile({ name: editName.trim(), phone: editPhone.trim() || undefined }, token)
      addToast('Профилът е обновен.', 'success')
      await refreshUser()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при запазване', 'error')
    } finally {
      setEditSubmitting(false)
    }
  }

  return (
    <div className="app-main page-content">
      <h1>Профил</h1>
      <p style={{ marginBottom: 16 }}>
        <Link to="/rides">← Обратно към пътуванията</Link>
      </p>
      {user && (
        <>
          <p style={{ marginBottom: 8, color: '#6b7280' }}>
            {user.email}
            {user.ratingAverage != null && (
              <span style={{ marginLeft: 12 }}>· Средна оценка: {Number(user.ratingAverage).toFixed(1)} ★</span>
            )}
          </p>
          <div className="page-form" style={{ maxWidth: 400, marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Редактиране на име и телефон</h2>
            <form onSubmit={handleProfileSubmit}>
              <label>
                Име
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  minLength={1}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'block', marginTop: 12 }}>
                Телефон
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <button type="submit" disabled={editSubmitting} style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer' }}>
                {editSubmitting ? 'Запазване...' : 'Запази'}
              </button>
            </form>
          </div>
          <div className="page-form" style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Смяна на парола</h2>
            <form onSubmit={handlePasswordSubmit}>
              {error && <div className="form-error">{error}</div>}
              {success && (
                <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, marginBottom: 16, color: '#166534' }}>
                  Паролата е сменена успешно.
                </div>
              )}
              <label>
                Текуща парола
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={inputStyle} />
              </label>
              <label style={{ display: 'block', marginTop: 12 }}>
                Нова парола (мин. 6 символа)
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} style={inputStyle} />
              </label>
              <button type="submit" disabled={submitting} style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer' }}>
                {submitting ? 'Смяна...' : 'Смени паролата'}
              </button>
            </form>
          </div>
          {ratings.length > 0 && (
            <div style={{ marginTop: 32, maxWidth: 560 }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Последни оценки</h2>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {ratings.slice(0, 10).map((r) => (
                  <li key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb', fontSize: '0.95rem' }}>
                    <strong>{r.score} ★</strong> от {r.fromUserName}
                    {r.comment && <span style={{ color: '#6b7280', marginLeft: 8 }}> – {r.comment}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
