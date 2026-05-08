import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { createCheckoutSession, getMyBookings } from '../api/bookings'
import { getConversations } from '../api/chat'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
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
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payingBookingId, setPayingBookingId] = useState<number | null>(null)
  const [openingChatBookingId, setOpeningChatBookingId] = useState<number | null>(null)
  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

  const loadBookings = () => {
    if (!token) return Promise.resolve()
    return getMyBookings(token).then(setBookings)
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    loadBookings()
      .catch((err) => setError(err instanceof Error ? err.message : 'Грешка при зареждане'))
      .finally(() => setLoading(false))
  }, [token])

  const paymentText = (b: BookingDto) => {
    if (b.paymentMethod === 'CARD') {
      if (b.paymentStatus === 'PAID') return 'Платено с карта'
      if (b.paymentStatus === 'REFUNDED') return 'Възстановено по карта'
      return 'Карта (чака плащане)'
    }
    if (b.paymentStatus === 'PAID') return 'Кеш (потвърдено)'
    return 'Кеш при качване'
  }

  const handlePayCard = async (bookingId: number) => {
    if (!token) return
    if (!stripePublishableKey) {
      addToast('Липсва VITE_STRIPE_PUBLISHABLE_KEY във frontend конфигурацията.', 'error')
      return
    }
    setPayingBookingId(bookingId)
    try {
      const { sessionId } = await createCheckoutSession(bookingId, token)
      if (!sessionId) throw new Error('Липсва Stripe sessionId')
      const stripe = await loadStripe(stripePublishableKey)
      if (!stripe) throw new Error('Stripe.js не можа да се инициализира')
      const result = await stripe.redirectToCheckout({ sessionId })
      if (result.error?.message) throw new Error(result.error.message)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при плащане', 'error')
    } finally {
      setPayingBookingId(null)
    }
  }

  const handleOpenDriverChat = async (booking: BookingDto) => {
    if (!token) return
    setOpeningChatBookingId(booking.id)
    try {
      const conversations = await getConversations(token)
      const conversation = conversations.find((c) => c.ride.id === booking.rideId)
      if (!conversation) {
        addToast('Разговорът все още не е наличен. Опитайте след малко.', 'info')
        return
      }
      navigate(`/messages?conversationId=${conversation.id}`)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при отваряне на разговора', 'error')
    } finally {
      setOpeningChatBookingId(null)
    }
  }

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
              <div className="ride-card">
                <Link to={`/rides/${b.rideId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="route">
                    {b.fromCity ?? '?'} → {b.toCity ?? '?'}
                  </span>
                  <span className="meta">
                    {b.departureTime ? formatDateTime(b.departureTime) : ''} · Статус: {b.status}
                  </span>
                  <span className="car">Плащане: {paymentText(b)}</span>
                  {b.pickupAddress && <span className="car">Място: {b.pickupAddress}</span>}
                </Link>
                {b.paymentMethod === 'CARD' && b.status === 'PENDING_PAYMENT' && b.paymentStatus !== 'PAID' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePayCard(b.id)}
                      disabled={payingBookingId === b.id}
                      style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer' }}
                    >
                      {payingBookingId === b.id ? 'Плащане…' : 'Плати с карта'}
                    </button>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                      Плащането е с карта през защитена страница (без IBAN).
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => void handleOpenDriverChat(b)}
                  disabled={openingChatBookingId === b.id}
                  style={{
                    marginTop: 10,
                    marginLeft: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #0f766e',
                    background: '#ecfeff',
                    color: '#0f766e',
                    cursor: openingChatBookingId === b.id ? 'not-allowed' : 'pointer',
                    opacity: openingChatBookingId === b.id ? 0.7 : 1,
                    fontWeight: 600,
                  }}
                >
                  {openingChatBookingId === b.id ? 'Зареждане...' : 'Пиши на шофьора'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
