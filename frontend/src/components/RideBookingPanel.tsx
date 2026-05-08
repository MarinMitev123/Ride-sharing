export interface ValidatePointsResponse {
  valid: boolean
  suggestedPickupLat?: number
  suggestedPickupLng?: number
  suggestedDropoffLat?: number
  suggestedDropoffLng?: number
  message?: string
}

import { useState } from 'react'

export interface RideBookingPanelProps {
  validated: ValidatePointsResponse | null
  suggestedPickup: { lat: number; lng: number } | null
  suggestedDropoff: { lat: number; lng: number } | null
  onBook: (
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    seatsReserved: number,
    paymentMethod: 'CASH' | 'CARD'
  ) => Promise<void>
  disabled?: boolean
  cardPaymentAvailable?: boolean
}

export function RideBookingPanel({
  validated,
  suggestedPickup,
  suggestedDropoff,
  onBook,
  disabled = false,
  cardPaymentAvailable = true,
}: RideBookingPanelProps) {
  const [seats, setSeats] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH')
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')

  const canBook =
    validated?.valid && suggestedPickup && suggestedDropoff && !booking && !disabled

  async function handleBook() {
    if (!canBook || !suggestedPickup || !suggestedDropoff) return
    setError('')
    setBooking(true)
    try {
      await onBook(
        suggestedPickup.lat,
        suggestedPickup.lng,
        suggestedDropoff.lat,
        suggestedDropoff.lng,
        seats,
        paymentMethod
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка при резервация')
    } finally {
      setBooking(false)
    }
  }

  const cardDisabled = !cardPaymentAvailable

  return (
    <div style={{ marginTop: 16, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Резервация</p>
      <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
        Брой места:{' '}
        <input
          type="number"
          min={1}
          max={10}
          value={seats}
          onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value, 10) || 1))}
          style={{ width: 60, padding: 4 }}
        />
      </label>
      <div style={{ marginTop: 10, marginBottom: 2 }}>
        <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>Начин на плащане:</p>
        <label style={{ marginRight: 14, fontSize: 14 }}>
          <input
            type="radio"
            name="paymentMethod"
            checked={paymentMethod === 'CASH'}
            onChange={() => setPaymentMethod('CASH')}
            disabled={booking}
          />{' '}
          Кеш (при качване)
        </label>
        <label style={{ fontSize: 14 }}>
          <input
            type="radio"
            name="paymentMethod"
            checked={paymentMethod === 'CARD'}
            onChange={() => setPaymentMethod('CARD')}
            disabled={booking || cardDisabled}
          />{' '}
          Карта (без IBAN)
        </label>
      </div>
      {cardDisabled && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#b45309' }}>
          Картово плащане е изключено за тази обява, защото шофьорът няма въведен IBAN.
        </p>
      )}
      {paymentMethod === 'CARD' && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
          Ще се отвори защитена страница за плащане с карта. Не се изисква IBAN.
        </p>
      )}
      <button
        type="button"
        onClick={handleBook}
        disabled={!canBook}
        style={{
          marginTop: 8,
          padding: '8px 16px',
          fontSize: 14,
          background: canBook ? '#16a34a' : '#94a3b8',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: canBook ? 'pointer' : 'not-allowed',
        }}
      >
        {booking ? 'Резервиране…' : 'Резервирай място'}
      </button>
      {!validated?.valid && (
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>
          Първо изберете качване и слизане на картата и натиснете „Провери точките“.
        </p>
      )}
      {error && (
        <p style={{ color: '#dc2626', fontSize: 14, marginTop: 8 }}>{error}</p>
      )}
    </div>
  )
}
