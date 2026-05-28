import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmCheckoutSession } from '../api/payments'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const { token } = useAuth()
  const { addToast } = useToast()
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!token || !sessionId) return
    let cancelled = false
    setConfirming(true)
    confirmCheckoutSession(sessionId, token)
      .then(() => {
        if (!cancelled) {
          setConfirmed(true)
          addToast('Резервацията е маркирана като платена.', 'success')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          addToast(err instanceof Error ? err.message : 'Грешка при потвърждение', 'error')
        }
      })
      .finally(() => {
        if (!cancelled) setConfirming(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, sessionId])

  return (
    <div className="app-main page-content">
      <h1>Плащането е успешно</h1>
      <p>Резервацията ви беше платена успешно с карта чрез защитената Stripe Checkout страница.</p>
      {sessionId && confirming && <p>Обновяване на статуса…</p>}
      {sessionId && !confirming && confirmed && (
        <p>Статусът в приложението е обновен. Можете да отворите „Мои резервации“.</p>
      )}
      {sessionId && !confirming && !confirmed && token && (
        <p>
          Ако статусът не се обнови автоматично, отворете отново{' '}
          <Link to="/my-bookings">Мои резервации</Link> или пуснете Stripe webhook (stripe listen).
        </p>
      )}
      {!sessionId && (
        <p>
          Липсва параметър <code>session_id</code> в адреса. Отворете „Мои резервации“ – ако плащането е минало,
          използвайте Stripe CLI webhook или направете ново плащане.
        </p>
      )}
      <p style={{ marginTop: 16 }}>
        <Link to="/my-bookings">Към моите резервации</Link>
      </p>
    </div>
  )
}
