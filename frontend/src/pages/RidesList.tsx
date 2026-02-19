import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRides } from '../api/rides'
import { useAuth } from '../contexts/AuthContext'
import { CITIES } from '../constants/cities'
import type { RideDto } from '../types/api'

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

export function RidesList() {
  const { token } = useAuth()
  const [rides, setRides] = useState<RideDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterFromCity, setFilterFromCity] = useState('')
  const [filterToCity, setFilterToCity] = useState('')

  const filteredRides = useMemo(() => {
    return rides.filter(
      (ride) =>
        (!filterFromCity || ride.fromCity === filterFromCity) &&
        (!filterToCity || ride.toCity === filterToCity)
    )
  }, [rides, filterFromCity, filterToCity])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getRides(token)
      .then((data) => {
        if (!cancelled) setRides(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Грешка при зареждане')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return (
      <div className="app-main">
        <p>Зареждане на пътувания...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-main">
        <p className="form-error">{error}</p>
        <Link to="/rides">Опитай отново</Link>
      </div>
    )
  }

  return (
    <div className="app-main page-content">
      <h1>Пътувания</h1>
      <p style={{ marginBottom: 16 }}>
        <Link to="/rides/new" className="btn-primary">Създай пътуване</Link>
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ whiteSpace: 'nowrap' }}>От град:</span>
          <select
            value={filterFromCity}
            onChange={(e) => setFilterFromCity(e.target.value)}
            style={{ padding: '8px 12px', minWidth: 180, border: '1px solid #d1d5db', borderRadius: 8 }}
          >
            <option value="">Всички градове</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ whiteSpace: 'nowrap' }}>До град:</span>
          <select
            value={filterToCity}
            onChange={(e) => setFilterToCity(e.target.value)}
            style={{ padding: '8px 12px', minWidth: 180, border: '1px solid #d1d5db', borderRadius: 8 }}
          >
            <option value="">Всички градове</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </label>
      </div>
      {!filterFromCity && !filterToCity ? (
        <p className="rides-empty-hint">Изберете от град и/или до град, за да видите пътуванията.</p>
      ) : rides.length === 0 ? (
        <p className="rides-empty-hint">Няма налични пътувания. Създайте първо пътуване.</p>
      ) : filteredRides.length === 0 ? (
        <p className="rides-empty-hint">Няма пътувания за избраните градове.</p>
      ) : (
        <ul className="rides-list">
          {filteredRides.map((ride) => (
            <li key={ride.id}>
              <Link to={`/rides/${ride.id}`} className="ride-card">
                <span className="route">{ride.fromCity} → {ride.toCity}</span>
                <span className="meta">
                  {formatDateTime(ride.departureTime)} · {ride.availableSeats} места · {ride.price} лв
                </span>
                {ride.carDetails && <span className="car">{ride.carDetails}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
