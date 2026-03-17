import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getActiveBookingsForDriver,
  approveBooking,
  rejectBooking,
  removePassengerByDriver,
} from '../api/bookings'
import { useAuth } from '../contexts/AuthContext'
import type { BookingDto } from '../types/api'

function formatDateTime(iso: string | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Пътуванията се показват само до 2 часа след часа на тръгване. */
const HOURS_AFTER_DEPARTURE_VISIBLE = 2

function isRideStillVisible(departureTime: string | undefined): boolean {
  if (!departureTime) return true
  const dep = new Date(departureTime).getTime()
  const cutoff = Date.now() - HOURS_AFTER_DEPARTURE_VISIBLE * 60 * 60 * 1000
  return dep >= cutoff
}

function pickupText(b: BookingDto): string {
  if (b.pickupAddress) return b.pickupAddress
  if (b.pickupLat != null && b.pickupLng != null) {
    return `Координати: ${b.pickupLat.toFixed(5)}, ${b.pickupLng.toFixed(5)}`
  }
  return 'Пътникът още не е посочил място'
}

export function PendingDriverBookings() {
  const { token } = useAuth()
  const [list, setList] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<number | null>(null)

  const load = () => {
    if (!token) return
    getActiveBookingsForDriver(token).then(setList)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getActiveBookingsForDriver(token!)
      .then((data) => {
        if (!cancelled) setList(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Грешка при зареждане')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  const pendingList = list.filter((b) => b.status === 'PENDING' && isRideStillVisible(b.departureTime))
  const approvedList = list.filter((b) => b.status === 'APPROVED' && isRideStillVisible(b.departureTime))

  const handleApprove = async (bookingId: number) => {
    if (!token) return
    setActionId(bookingId)
    try {
      await approveBooking(bookingId, token)
      load()
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (bookingId: number) => {
    if (!token) return
    setActionId(bookingId)
    try {
      await rejectBooking(bookingId, token)
      load()
    } finally {
      setActionId(null)
    }
  }

  const handleRemove = async (bookingId: number) => {
    if (!token) return
    setActionId(bookingId)
    try {
      await removePassengerByDriver(bookingId, token)
      load()
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <div className="app-main">
        <p>Зареждане...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-main">
        <p className="form-error">{error}</p>
        <Link to="/rides">Обратно към пътуванията</Link>
      </div>
    )
  }

  return (
    <div className="app-main page-content">
      <h1>Чакащи резервации</h1>
      <p style={{ marginBottom: 24 }}>
        Тук виждате кой чака одобрение и кой вече е одобрен. Място за качване и действия са в списъците по-долу.
      </p>

      {pendingList.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Чакат одобрение</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {pendingList.map((b) => (
              <li
                key={b.id}
                style={{
                  marginBottom: 12,
                  padding: 14,
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.passengerName ?? 'Пътник'}</div>
                <div style={{ fontSize: 14, color: '#475569', marginBottom: 6 }}>
                  {b.fromCity && b.toCity ? `${b.fromCity} → ${b.toCity}` : `Пътуване #${b.rideId}`}
                  {b.departureTime && ` · ${formatDateTime(b.departureTime)}`}
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleApprove(b.id)}
                    disabled={actionId !== null}
                    className="btn-primary"
                    style={{ padding: '6px 14px' }}
                  >
                    Одобри
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(b.id)}
                    disabled={actionId !== null}
                    style={{ padding: '6px 14px', border: '1px solid #dc2626', color: '#dc2626', background: '#fff', borderRadius: 8, cursor: 'pointer' }}
                  >
                    Откажи
                  </button>
                  <Link to={`/rides/${b.rideId}`} style={{ fontSize: 14, marginLeft: 8 }}>
                    Отвори пътуване →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {approvedList.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Одобрени – от къде да ги вземете</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {approvedList.map((b) => (
              <li
                key={b.id}
                style={{
                  marginBottom: 12,
                  padding: 14,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.passengerName ?? 'Пътник'}</div>
                <div style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}>
                  {b.fromCity && b.toCity ? `${b.fromCity} → ${b.toCity}` : `Пътуване #${b.rideId}`}
                  {b.departureTime && ` · ${formatDateTime(b.departureTime)}`}
                </div>
                <div style={{ fontSize: 14, marginBottom: 4 }}>
                  <strong>Място за качване:</strong> {pickupText(b)}
                </div>
                {b.pickupNeighborhood && (
                  <div style={{ fontSize: 14, marginBottom: 4 }}>
                    <strong>Квартал:</strong> {b.pickupNeighborhood}
                  </div>
                )}
                {b.passengerNote && (
                  <div style={{ fontSize: 14, marginBottom: 8, fontStyle: 'italic', color: '#475569' }}>
                    <strong>Бележка:</strong> {b.passengerNote}
                  </div>
                )}
                {!b.pickupNeighborhood && !b.passengerNote && <div style={{ marginBottom: 8 }} />}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleRemove(b.id)}
                    disabled={actionId !== null}
                    style={{ padding: '6px 14px', border: '1px solid #dc2626', color: '#dc2626', background: '#fff', borderRadius: 8, cursor: 'pointer' }}
                  >
                    Премахни пътник
                  </button>
                  <Link to={`/rides/${b.rideId}`} style={{ fontSize: 14 }}>
                    Отвори пътуване →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {list.length === 0 && (
        <p className="rides-empty-hint">Няма чакащи или одобрени резервации.</p>
      )}

      <p style={{ marginTop: 24 }}>
        <Link to="/rides">← Обратно към пътуванията</Link>
      </p>
    </div>
  )
}
