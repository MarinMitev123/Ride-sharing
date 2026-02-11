import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRides, type RidesSearchParams } from '../api/rides'
import { useAuth } from '../contexts/AuthContext'
import { CITIES } from '../constants/cities'
import { parseBgDate, apiDateToBg } from '../constants/dateLocale'
import type { RideDto } from '../types/api'

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

export function RidesList() {
  const { token } = useAuth()
  const [rides, setRides] = useState<RideDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fromCity, setFromCity] = useState<string>('')
  const [toCity, setToCity] = useState<string>('')
  const [dateInput, setDateInput] = useState('')
  const dateInputRef = React.useRef<HTMLInputElement>(null)

  const date = dateInput.trim() ? parseBgDate(dateInput) ?? '' : ''

  const hasSearch = Boolean(fromCity || toCity || date)

  useEffect(() => {
    if (!hasSearch) {
      setRides([])
      setLoading(false)
      setError('')
      return
    }
    const params: RidesSearchParams = {}
    if (fromCity) params.fromCity = fromCity
    if (toCity) params.toCity = toCity
    if (date) params.date = date

    let cancelled = false
    setLoading(true)
    setError('')
    getRides(params, token)
      .then((data) => {
        if (!cancelled) setRides(data)
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
  }, [fromCity, toCity, dateInput, date, hasSearch, token])

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Пътувания</h1>
        <Link to="/rides/new" className="btn-primary" style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 500 }}>
          Създай пътуване
        </Link>
      </div>
      <p style={{ color: '#555', marginBottom: 12, fontSize: '0.95rem' }}>
        Избери от кой град до кой град искаш да пътуваш – ще видиш само тези обяви.
      </p>
      <div className="rides-search">
        <label className="rides-search-label">
          От град
          <select
            value={fromCity}
            onChange={(e) => setFromCity(e.target.value)}
            className="rides-search-select"
          >
            <option value="">— Избери град —</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label className="rides-search-label">
          До град
          <select
            value={toCity}
            onChange={(e) => setToCity(e.target.value)}
            className="rides-search-select"
          >
            <option value="">— Избери град —</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label className="rides-search-label">
          Дата (по избор)
          <span className="date-input-with-calendar">
            <input
              type="text"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="rides-search-input"
              maxLength={10}
            />
            <input
              ref={dateInputRef}
              type="date"
              aria-hidden
              tabIndex={-1}
              className="date-picker-hidden"
              onChange={(e) => {
                const v = e.target.value
                if (v) setDateInput(apiDateToBg(v))
              }}
            />
            <button
              type="button"
              className="btn-calendar-icon"
              onClick={() => {
                if (dateInputRef.current) {
                  if (typeof dateInputRef.current.showPicker === 'function') {
                    dateInputRef.current.showPicker()
                  } else {
                    dateInputRef.current.click()
                  }
                }
              }}
              title="Избери от календар"
              aria-label="Календар"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
          </span>
        </label>
      </div>
      {error && <div className="form-error">{error}</div>}
      {!hasSearch ? (
        <p className="rides-empty-hint">Изберете от град и/или до град (и по избор дата), за да видите обяви.</p>
      ) : loading ? (
        <p>Зареждане...</p>
      ) : rides.length === 0 ? (
        <p>Няма намерени пътувания за този маршрут.</p>
      ) : (
        <ul className="rides-list">
          {rides.map((r) => (
            <li key={r.id}>
              <Link to={`/rides/${r.id}`} className="ride-card">
                <span className="route">{r.fromCity} → {r.toCity}</span>
                <span className="meta">
                  {formatDate(r.departureTime)} · {r.availableSeats} места · {r.price} лв
                </span>
                {r.carDetails && <span className="car">{r.carDetails}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
