import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getRideById } from '../api/rides'
import {
  getBookingsForRide,
  getMyBookings,
  createBooking,
  setPickupLocation,
  cancelBooking,
} from '../api/bookings'
import { searchAddress, type GeocodingResult } from '../api/geocoding'
import { useAuth } from '../contexts/AuthContext'
import { RideMap } from '../components/RideMap'
import type { RideDto, BookingDto } from '../types/api'

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

export function RideDetail() {
  const { id } = useParams<{ id: string }>()
  const { token, user } = useAuth()
  const [ride, setRide] = useState<RideDto | null>(null)
  const [bookings, setBookings] = useState<BookingDto[]>([])
  const [myBooking, setMyBooking] = useState<BookingDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pickupPoints, setPickupPoints] = useState<{ lat: number; lng: number; label?: string }[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [pendingPickup, setPendingPickup] = useState<{ lat: number; lng: number } | null>(null)
  const [pendingPickupAddress, setPendingPickupAddress] = useState('')
  const [pickupSaving, setPickupSaving] = useState(false)
  const [pickupError, setPickupError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [bookingActionId, setBookingActionId] = useState<number | null>(null)
  const [pickupNeighborhood, setPickupNeighborhood] = useState('')
  const [pickupNote, setPickupNote] = useState('')

  const rideId = id ? parseInt(id, 10) : NaN
  const isDriver = user && ride && ride.driverId === user.id
  const hasActiveBooking = myBooking && (myBooking.status === 'PENDING' || myBooking.status === 'APPROVED')

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
    return () => { cancelled = true }
  }, [rideId, token])

  useEffect(() => {
    if (!rideId || isNaN(rideId) || !token) return
    getBookingsForRide(rideId, token).then((data) => {
      setBookings(data)
      if (ride && user && ride.driverId === user.id) {
        const active = data.filter((b) => b.status === 'PENDING' || b.status === 'APPROVED')
        const points = active
          .filter((b) => b.pickupLat != null && b.pickupLng != null)
          .map((b) => ({
            lat: b.pickupLat!,
            lng: b.pickupLng!,
            label: b.passengerName ?? b.pickupAddress ?? 'Качване',
          }))
        setPickupPoints(points)
      }
    })
    getMyBookings(token).then((list) => {
      const b = list.find((x) => x.rideId === rideId)
      setMyBooking(b ?? null)
      if (ride && user && ride.driverId !== user.id) {
        const active = b && (b.status === 'PENDING' || b.status === 'APPROVED')
        if (active && b.pickupLat != null && b.pickupLng != null) {
          setPickupPoints([
            { lat: b.pickupLat, lng: b.pickupLng, label: b.passengerName ?? b.pickupAddress ?? 'Качване' },
          ])
        } else {
          setPickupPoints([])
        }
      }
    })
  }, [rideId, token, ride, user])

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 4) {
      setSearchResults([])
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      setSearchLoading(true)
      setSearchError('')
      searchAddress(q, token)
        .then((results) => {
          if (!cancelled) setSearchResults(results)
        })
        .catch((err) => {
          if (!cancelled) setSearchError(err instanceof Error ? err.message : 'Грешка при търсене')
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false)
        })
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [searchQuery, token])

  const handleMapClick = (lat: number, lng: number) => {
    setPendingPickup({ lat, lng })
    setPendingPickupAddress('')
    setPickupError('')
  }

  const handleSelectSearchResult = (r: GeocodingResult) => {
    console.log('[geocode] selected', {
      provider: r.provider ?? undefined,
      displayName: r.displayName,
      osmType: r.osmType ?? undefined,
      lat: r.lat,
      lng: r.lng,
    })
    setPendingPickup({ lat: r.lat, lng: r.lng })
    setPendingPickupAddress(r.displayName)
    setSearchResults([])
    setSearchQuery(r.displayName)
    setSearchError('')
  }

  const handleSavePickup = async () => {
    if (!pendingPickup || !token) return
    setPickupSaving(true)
    setPickupError('')
    try {
      let bookingId = hasActiveBooking ? myBooking!.id : undefined
      if (!bookingId) {
        const created = await createBooking(rideId, token)
        setMyBooking(created)
        bookingId = created.id
      }
      await setPickupLocation(
        bookingId,
        pendingPickup.lat,
        pendingPickup.lng,
        pendingPickupAddress || '',
        token,
        { pickupNeighborhood: pickupNeighborhood.trim() || null, passengerNote: pickupNote.trim() || null }
      )
      const list = await getMyBookings(token)
      const updated = list.find((b) => b.rideId === rideId)
      if (updated) setMyBooking(updated)
      setPendingPickup(null)
      setPendingPickupAddress('')
      setPickupNeighborhood('')
      setPickupNote('')
      setSelectMode(false)
      getBookingsForRide(rideId, token).then(setBookings)
    } catch (err) {
      setPickupError(err instanceof Error ? err.message : 'Грешка при запазване')
    } finally {
      setPickupSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!myBooking || !token) return
    setBookingActionId(myBooking.id)
    try {
      await cancelBooking(myBooking.id, token)
      setMyBooking(null)
      setPickupPoints([])
      setBookings(await getBookingsForRide(rideId, token))
      setRide((r) => r ? { ...r, availableSeats: r.availableSeats + 1 } : null)
    } finally {
      setBookingActionId(null)
    }
  }

  if (loading) {
    return (
      <div className="app-main">
        <p>Зареждане...</p>
      </div>
    )
  }

  if (error || !ride) {
    return (
      <div className="app-main">
        <p className="form-error">{error || 'Пътуването не е намерено.'}</p>
        <Link to="/rides">← Обратно към пътуванията</Link>
      </div>
    )
  }

  return (
    <div className="app-main page-content">
      <h1>{ride.fromCity} → {ride.toCity}</h1>
      <p style={{ marginBottom: 16 }}>
        <Link to="/rides">← Обратно към пътуванията</Link>
      </p>
      <div className="ride-meta">
        {formatDateTime(ride.departureTime)} · {ride.availableSeats} места · {ride.price} лв
        {ride.carDetails && <> · {ride.carDetails}</>}
      </div>

      {!isDriver && (
        <>
          {!hasActiveBooking ? (
            <p style={{ marginBottom: 16 }}>
              {ride.availableSeats <= 0 ? (
                <span style={{ color: '#b91c1c', fontWeight: 500 }}>Няма свободни места. Резервациите са затворени за това пътуване.</span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectMode(true)}
                    className="btn-primary"
                    style={{ padding: '10px 20px', cursor: 'pointer' }}
                  >
                    Резервирай място
                  </button>
                  {myBooking && (myBooking.status === 'CANCELED' || myBooking.status === 'REJECTED') && (
                    <span style={{ marginLeft: 12, fontSize: 14, color: '#6b7280' }}>
                      (Предишната резервация е отменена – можете да резервирате отново.)
                    </span>
                  )}
                </>
              )}
            </p>
          ) : (
            <p style={{ marginBottom: 16, color: '#166534' }}>
              Имате резервация (статус: {myBooking!.status === 'PENDING' ? 'Чака одобрение' : 'Одобрена'}).
              {myBooking!.status === 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => setSelectMode(true)}
                  style={{ marginLeft: 12, padding: '6px 12px', cursor: 'pointer' }}
                >
                  Избери/промени място за качване
                </button>
              )}
            </p>
          )}

          {selectMode && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ marginBottom: 8, fontSize: 14, color: '#374151' }}>
                Търсете адрес (мин. 4 символа) или кликнете на картата.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="напр. ул. Цар Калоян 80, Пазарджик"
                  style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
                />
                <button
                  type="button"
                  onClick={() => { setSelectMode(false); setPendingPickup(null); setPendingPickupAddress(''); setSearchResults([]); setPickupNeighborhood(''); setPickupNote('') }}
                  style={{ padding: '8px 16px', cursor: 'pointer' }}
                >
                  Отказ от избор
                </button>
              </div>
              <label style={{ display: 'block', marginTop: 12, marginBottom: 4, fontSize: 14 }}>
                Квартал (напр. за качване в града на тръгване)
              </label>
              <input
                type="text"
                value={pickupNeighborhood}
                onChange={(e) => setPickupNeighborhood(e.target.value)}
                placeholder="напр. Лозенец, Център, Младост"
                style={{ width: '100%', maxWidth: 400, padding: '10px 12px', marginBottom: 12, border: '1px solid #d1d5db', borderRadius: 8 }}
              />
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                Бележка (по желание)
              </label>
              <textarea
                value={pickupNote}
                onChange={(e) => setPickupNote(e.target.value)}
                placeholder="Допълнителна информация за шофьора"
                rows={2}
                style={{ width: '100%', maxWidth: 500, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
              />
              {searchError && <p style={{ color: '#b91c1c', fontSize: 14 }}>{searchError}</p>}
              {searchLoading && <p style={{ fontSize: 14, color: '#6b7280' }}>Търсене...</p>}
              {searchResults.length > 0 && (
                <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none', maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}>
                  {searchResults.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => handleSelectSearchResult(r)}
                        style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14 }}
                      >
                        {r.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {pendingPickup && (pendingPickupAddress || searchQuery.trim()) && (
                <p style={{ margin: '12px 0 0 0', padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 14, color: '#166534' }}>
                  <strong>Избран адрес:</strong> {pendingPickupAddress || searchQuery.trim()}
                </p>
              )}
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleSavePickup}
                  disabled={!pendingPickup || pickupSaving}
                  style={{ padding: '8px 16px', cursor: pendingPickup && !pickupSaving ? 'pointer' : 'not-allowed' }}
                >
                  {pickupSaving ? 'Запазване...' : 'Запази мястото'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectMode(false); setPendingPickup(null); setPendingPickupAddress(''); setSearchResults([]) }}
                  style={{ padding: '8px 16px', cursor: 'pointer' }}
                >
                  Отказ
                </button>
              </div>
              {pickupError && <p className="form-error" style={{ marginTop: 8 }}>{pickupError}</p>}
            </div>
          )}
        </>
      )}

      <RideMap
        ride={ride}
        pickupPoints={pickupPoints}
        pendingPickup={pendingPickup}
        onPickupClick={handleMapClick}
        selectPickupMode={selectMode}
      />

      {!isDriver && hasActiveBooking && (
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={bookingActionId !== null}
            style={{ padding: '8px 16px', cursor: 'pointer', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8 }}
          >
            Отмени резервацията
          </button>
        </div>
      )}
    </div>
  )
}
