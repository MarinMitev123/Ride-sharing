import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { updateProfile } from '../api/users'
import { getRatingsForUser } from '../api/ratings'
import type { RatingDto } from '../types/api'
import { StarRating } from '../components/StarRating'

const inputStyle = { width: '100%', padding: '10px 12px', marginTop: 4, border: '1px solid #d1d5db', borderRadius: 8 }

export function Profile() {
  const { user, token, refreshUser } = useAuth()
  const { addToast } = useToast()
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editIban, setEditIban] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [ratings, setRatings] = useState<RatingDto[]>([])

  useEffect(() => {
    if (user) {
      setEditName(user.name)
      setEditPhone(user.phone ?? '')
      setEditIban(user.iban ?? '')
    }
  }, [user])

  useEffect(() => {
    if (!user?.id || !token) return
    getRatingsForUser(user.id, token)
      .then(setRatings)
      .catch(() => {})
  }, [user?.id, token])

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setEditSubmitting(true)
    try {
      await updateProfile({
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        iban: editIban.trim() || undefined,
      }, token)
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
      {user && (
        <>
          <div style={{ marginBottom: 8, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {user.ratingAverage != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <StarRating value={Number(user.ratingAverage)} readOnly size={18} />
                <span>
                  {Number(user.ratingAverage).toFixed(1)} ★
                  {ratings.length > 0 && <span style={{ marginLeft: 4, color: '#9ca3af' }}>({ratings.length} оценки)</span>}
                </span>
              </span>
            )}
          </div>
          <div className="page-form" style={{ maxWidth: 400, marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Редактиране на профил</h2>
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
                Имейл
                <input
                  type="email"
                  value={user.email}
                  disabled
                  readOnly
                  style={{ ...inputStyle, color: '#64748b', background: '#f8fafc' }}
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
              <label style={{ display: 'block', marginTop: 12 }}>
                IBAN за получаване (за шофьор)
                <input
                  type="text"
                  value={editIban}
                  onChange={(e) => setEditIban(e.target.value)}
                  placeholder="напр. BG80BNBG96611020345678"
                  style={inputStyle}
                />
              </label>
              <p style={{ marginTop: 6, marginBottom: 0, fontSize: 12, color: '#64748b' }}>
                Без въведен IBAN картовото плащане за вашите обяви е изключено.
              </p>
              <button type="submit" disabled={editSubmitting} style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer' }}>
                {editSubmitting ? 'Запазване...' : 'Запази'}
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
