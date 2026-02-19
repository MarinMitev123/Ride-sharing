import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings } from '../api/bookings'
import { useAuth } from '../contexts/AuthContext'
import type { BookingDto } from '../types/api'

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MyBookings() {
  const { token } = useAuth()
  const [bookings, setBookings] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    getMyBookings(token)
      .then(setBookings)
      .catch((err) => setError(err instanceof Error ? err.message : 'Грешка при зареждане'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="app-main">
        <p>Зареждане на резервации...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-main">
        <p className="form-error">{error}</p>
        <Link to="/my-bookings">Опитай отново</Link>
      </div>
    )
  }

  return (
    <div className="app-main page-content">
      <h1>Мои резервации</h1>
      <p style={{ marginBottom: 20 }}>
        <Link to="/rides">← Към пътуванията</Link>
      </p>
      {bookings.length === 0 ? (
        <p className="rides-empty-hint">Нямате резервации.</p>
      ) : (
        <ul className="rides-list">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link to={`/rides/${b.rideId}`} className="ride-card">
                <span className="route">
                  {b.fromCity ?? '?'} → {b.toCity ?? '?'}
                </span>
                <span className="meta">
                  {b.departureTime ? formatDateTime(b.departureTime) : ''} · Статус: {b.status}
                </span>
                {b.pickupAddress && <span className="car">Място: {b.pickupAddress}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
