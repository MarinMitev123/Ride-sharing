import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRidesFiltered } from '../api/rides'
import { useAuth } from '../contexts/AuthContext'
import { useInView } from '../hooks/useInView'
import { CITIES } from '../constants/cities'
import type { RideDto } from '../types/api'

const FAVORITES_KEY = 'carpool_favorites'
type FavoriteRoute = { fromCity: string; toCity: string }

/** Популярни маршрути – за бързо попълване на търсенето */
const POPULAR_ROUTES: { from: string; to: string }[] = [
  { from: 'София', to: 'Пловдив' },
  { from: 'София', to: 'Варна' },
  { from: 'София', to: 'Бургас' },
  { from: 'Пловдив', to: 'София' },
  { from: 'Пловдив', to: 'Варна' },
  { from: 'Варна', to: 'София' },
  { from: 'Бургас', to: 'София' },
]

function loadFavorites(): FavoriteRoute[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

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
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterFromCity, setFilterFromCity] = useState('')
  const [filterToCity, setFilterToCity] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [sortBy] = useState('departureTime')
  const [sortDir] = useState('asc')
  const [favorites, setFavorites] = useState<FavoriteRoute[]>(() => loadFavorites())
  const { ref: listRef, inView: listInView } = useInView({ threshold: 0.05 })

  const currentIsFavorite = filterFromCity && filterToCity && favorites.some(
    (f) => f.fromCity === filterFromCity && f.toCity === filterToCity
  )

  const addToFavorites = () => {
    if (!filterFromCity || !filterToCity) return
    const next = [...favorites, { fromCity: filterFromCity, toCity: filterToCity }]
    setFavorites(next)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  }

  const removeFromFavorites = (from: string, to: string) => {
    const next = favorites.filter((f) => !(f.fromCity === from && f.toCity === to))
    setFavorites(next)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  }

  const applyFavorite = (f: FavoriteRoute) => {
    setFilterFromCity(f.fromCity)
    setFilterToCity(f.toCity)
    setPage(0)
  }

  const applyPopularRoute = (from: string, to: string) => {
    setFilterFromCity(from)
    setFilterToCity(to)
    const today = new Date()
    setFilterDate(today.toISOString().slice(0, 10))
    setPage(0)
  }

  const allFiltersFilled = filterFromCity !== '' && filterToCity !== '' && filterDate !== ''

  useEffect(() => {
    if (!allFiltersFilled) {
      setRides([])
      setTotalPages(0)
      setLoading(false)
      setError('')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    getRidesFiltered(
      {
        fromCity: filterFromCity || undefined,
        toCity: filterToCity || undefined,
        date: filterDate || undefined,
        page,
        size: 20,
        sortBy,
        sortDir,
      },
      token
    )
      .then((data) => {
        if (!cancelled) {
          setRides(data.content ?? [])
          setTotalPages(data.totalPages ?? 0)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Грешка при зареждане')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token, allFiltersFilled, filterFromCity, filterToCity, filterDate, page, sortBy, sortDir])

  if (loading && allFiltersFilled) {
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
      <div className="rides-hero">
        <div className="rides-hero-inner">
          <div className="rides-hero-icon" aria-hidden>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17h14v-5H5v5z" />
              <path d="M5 9h14V4H5v5z" />
              <circle cx="7.5" cy="6.5" r="1.5" />
              <circle cx="16.5" cy="14.5" r="1.5" />
            </svg>
          </div>
          <h1>Пътувания</h1>
          <p>Изберете маршрут и дата, за да видите налични споделени пътувания. Споделете пътя с други – по-евтино и екологично.</p>
        </div>
      </div>
      <p style={{ marginBottom: 16 }}>
        <Link to="/rides/new" className="btn-primary">Създай пътуване</Link>
      </p>
      {favorites.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ whiteSpace: 'nowrap', fontSize: 14, color: '#6b7280' }}>Фаворитни маршрути:</span>
          {favorites.map((f) => (
            <span key={`${f.fromCity}-${f.toCity}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                onClick={() => applyFavorite(f)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #1e3a5f', background: '#fff', color: '#1e3a5f', cursor: 'pointer', fontSize: 14 }}
              >
                {f.fromCity} → {f.toCity}
              </button>
              <button
                type="button"
                onClick={() => removeFromFavorites(f.fromCity, f.toCity)}
                aria-label="Премахни от фаворити"
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 12 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ whiteSpace: 'nowrap' }}>От град:</span>
          <select
            value={filterFromCity}
            onChange={(e) => { setFilterFromCity(e.target.value); setPage(0) }}
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
            onChange={(e) => { setFilterToCity(e.target.value); setPage(0) }}
            style={{ padding: '8px 12px', minWidth: 180, border: '1px solid #d1d5db', borderRadius: 8 }}
          >
            <option value="">Всички градове</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ whiteSpace: 'nowrap' }}>Дата:</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setPage(0) }}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
          />
        </label>
        {filterFromCity && filterToCity && !currentIsFavorite && (
          <button
            type="button"
            onClick={addToFavorites}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #86efac', background: '#f0fdf4', color: '#166534', cursor: 'pointer', fontSize: 14 }}
          >
            Добави към фаворити
          </button>
        )}
      </div>
      {!allFiltersFilled ? (
        <div className="rides-empty-state">
          <div className="rides-empty-state-card">
            <div className="rides-empty-state-icon" aria-hidden>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <h2 className="rides-empty-state-title">Изберете маршрут и дата</h2>
            <p className="rides-empty-state-text">
              Попълнете <strong>от град</strong>, <strong>до град</strong> и <strong>дата</strong> по-горе, за да видите наличните споделени пътувания.
            </p>
            <p className="rides-empty-state-sub">Или изберете един от популярните маршрути:</p>
            <div className="rides-popular-routes">
              {POPULAR_ROUTES.map((r) => (
                <button
                  key={`${r.from}-${r.to}`}
                  type="button"
                  onClick={() => applyPopularRoute(r.from, r.to)}
                  className="rides-popular-chip"
                >
                  {r.from} → {r.to}
                </button>
              ))}
            </div>
          </div>
          <section className="rides-why-section" aria-label="Защо споделено пътуване">
            <h3 className="rides-why-title">Защо споделено пътуване?</h3>
            <ul className="rides-why-list">
              <li><span className="rides-why-icon">💰</span> По-евтино – споделете разходите за гориво</li>
              <li><span className="rides-why-icon">🌱</span> По-екологично – по-малко коли по пътищата</li>
              <li><span className="rides-why-icon">👋</span> Удобно – намерете пътуване до желаната дестинация</li>
            </ul>
          </section>
        </div>
      ) : rides.length === 0 && !loading ? (
        <div className="rides-empty-state">
          <div className="rides-empty-state-card rides-empty-state-card--no-results">
            <div className="rides-empty-state-icon" aria-hidden>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17h14v-5H5v5z" /><path d="M5 9h14V4H5v5z" />
                <circle cx="7.5" cy="6.5" r="1.5" /><circle cx="16.5" cy="14.5" r="1.5" />
              </svg>
            </div>
            <h2 className="rides-empty-state-title">Няма намерени пътувания</h2>
            <p className="rides-empty-state-text">
              За избраните градове и дата все още няма обявени пътувания. Опитайте друга дата или маршрут, или <Link to="/rides/new" className="rides-empty-state-link">създайте пътуване</Link> и бъдете първи.
            </p>
          </div>
          <section className="rides-why-section" aria-label="Защо споделено пътуване">
            <h3 className="rides-why-title">Защо споделено пътуване?</h3>
            <ul className="rides-why-list">
              <li><span className="rides-why-icon">💰</span> По-евтино – споделете разходите за гориво</li>
              <li><span className="rides-why-icon">🌱</span> По-екологично – по-малко коли по пътищата</li>
              <li><span className="rides-why-icon">👋</span> Удобно – намерете пътуване до желаната дестинация</li>
            </ul>
          </section>
        </div>
      ) : (
        <>
        <ul ref={listRef} className={`rides-list scroll-reveal ${listInView ? 'scroll-reveal-visible' : ''}`}>
          {rides.map((ride, index) => (
            <li key={ride.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
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
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="btn-primary"
              style={{ opacity: page === 0 ? 0.6 : 1 }}
            >
              Предишна
            </button>
            <span>Страница {page + 1} от {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="btn-primary"
              style={{ opacity: page >= totalPages - 1 ? 0.6 : 1 }}
            >
              Следваща
            </button>
          </div>
        )}
        </>
      )}
    </div>
  )
}
