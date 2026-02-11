import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RideMap } from '../components/RideMap'
import { getRideById, getBookingsForRide } from '../api/rides'
import { useAuth } from '../contexts/AuthContext'
import type { RideDto, BookingDto, PickupPoint } from '../types/api'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RideDetail() {
  const { id } = useParams<{ id: string }>()
  const { token, user } = useAuth()
  const [ride, setRide] = useState<RideDto | null>(null)
  const [bookings, setBookings] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([])
  const [selectMode, setSelectMode] = useState(false)

  const rideId = id ? parseInt(id, 10) : NaN
  const isDriver = user && ride && ride.driverId === user.id

  useEffect(() => {
    if (!rideId || isNaN(rideId)) {
      setError('Невалидно пътуване')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    getRideById(rideId, token)
      .then((data) => {
        if (!cancelled) setRide(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Грешка при зареждане')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [rideId, token])

  useEffect(() => {
    if (!isDriver || !token || !rideId) return
    getBookingsForRide(rideId, token)
      .then(setBookings)
      .catch(() => setBookings([]))
  }, [isDriver, token, rideId])

  useEffect(() => {
    if (!ride || !bookings.length) {
      setPickupPoints([])
      return
    }
    const points: PickupPoint[] = bookings
      .filter((b) => b.pickupLat != null && b.pickupLng != null)
      .map((b) => ({
        lat: b.pickupLat!,
        lng: b.pickupLng!,
        label: b.passengerName ?? b.pickupAddress ?? 'Качване',
      }))
    setPickupPoints(points)
  }, [ride, bookings])

  const handlePickupClick = (lat: number, lng: number) => {
    setPickupPoints((prev) => [...prev, { lat, lng, label: `Качване ${prev.length + 1}` }])
    setSelectMode(false)
  }

  if (loading) return <div className="page-content"><p>Зареждане...</p></div>
  if (error || !ride) {
    return (
      <div className="page-content">
        <div className="form-error">{error || 'Пътуването не е намерено.'}</div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <h1>{ride.fromCity} → {ride.toCity}</h1>
      <p className="ride-meta">
        {formatDate(ride.departureTime)} · {ride.availableSeats} места · {ride.price} лв
        {ride.carDetails && <> · {ride.carDetails}</>}
      </p>
      <RideMap
        ride={ride}
        pickupPoints={pickupPoints}
        onPickupClick={handlePickupClick}
        selectPickupMode={selectMode}
      />
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setSelectMode((m) => !m)}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          {selectMode ? 'Отказ от избор' : 'Избери място за качване'}
        </button>
        {pickupPoints.length > 0 && (
          <button
            type="button"
            onClick={() => setPickupPoints([])}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Изчисти точки
          </button>
        )}
      </div>
      {isDriver && bookings.length > 0 && (
        <section className="ride-bookings" style={{ marginTop: 24 }}>
          <h2>Резервации</h2>
          <ul>
            {bookings.map((b) => (
              <li key={b.id}>
                {b.passengerName ?? `Пасажер #${b.passengerId}`} – {b.status}
                {b.pickupAddress && ` · ${b.pickupAddress}`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
