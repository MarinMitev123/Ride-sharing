import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createRide } from '../api/rides'
import { searchAddress } from '../api/geocoding'
import { useAuth } from '../contexts/AuthContext'
import { CITIES } from '../constants/cities'
import { parseBgDateTime, apiDateToBg } from '../constants/dateLocale'
import type { RideCreateRequest } from '../types/api'

export function CreateRide() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [fromCity, setFromCity] = useState('')
  const [toCity, setToCity] = useState('')
  const [fromDistrict, setFromDistrict] = useState('')
  const [toDistrict, setToDistrict] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [departureHour, setDepartureHour] = useState('08')
  const [departureMinute, setDepartureMinute] = useState('00')
  const departureDatePickerRef = React.useRef<HTMLInputElement>(null)
  const [availableSeats, setAvailableSeats] = useState(1)
  const [price, setPrice] = useState('')
  const [carDetails, setCarDetails] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const SOFIA_DISTRICTS = [
    'Център',
    'Люлин',
    'Люлин 1',
    'Люлин 2',
    'Люлин 3',
    'Люлин 4',
    'Люлин 5',
    'Люлин 6',
    'Люлин 7',
    'Люлин 8',
    'Люлин 9',
    'Люлин 10',
    'Младост',
    'Младост 1',
    'Младост 1А',
    'Младост 2',
    'Младост 3',
    'Младост 4',
    'Студентски град',
    'Надежда',
    'Надежда 1',
    'Надежда 2',
    'Надежда 3',
    'Надежда 4',
    'Дружба',
    'Дружба 1',
    'Дружба 2',
    'Слатина',
    'Изток',
    'Западен парк',
    'Овча купел',
    'Овча купел 1',
    'Овча купел 2',
    'Красно село',
    'Красна поляна',
    'Красна поляна 1',
    'Красна поляна 2',
    'Красна поляна 3',
    'Лозенец',
    'Драгалевци',
    'Симеоново',
    'Бояна',
    'Манастирски ливади',
    'Хладилника',
    'Гоце Делчев',
    'Борово',
    'Белите брези',
    'Гео Милев',
    'Редута',
    'Левски',
    'Левски Г',
    'Обеля',
    'Обеля 1',
    'Обеля 2',
    'Суходол',
    'Филиповци',
    'Орландовци',
    'Банишора',
    'Илинден',
    'Захарна фабрика',
    'Сердика',
    'Подуяне',
    'Хаджи Димитър',
    'Сухата река',
    'Малашевци',
    'Лагера',
    'Иван Вазов',
    'Павлово',
    'Княжево',
    'Витоша',
    'Искър',
    'Връбница',
  ]
  const SOFIA_DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
    'Център': { lat: 42.6977, lng: 23.3219 },
    'Люлин': { lat: 42.7176, lng: 23.2478 },
    'Люлин 1': { lat: 42.7262, lng: 23.2585 },
    'Люлин 2': { lat: 42.7237, lng: 23.2528 },
    'Люлин 3': { lat: 42.7211, lng: 23.2472 },
    'Люлин 4': { lat: 42.7186, lng: 23.2418 },
    'Люлин 5': { lat: 42.7162, lng: 23.2368 },
    'Люлин 6': { lat: 42.7141, lng: 23.2325 },
    'Люлин 7': { lat: 42.7118, lng: 23.2284 },
    'Люлин 8': { lat: 42.7096, lng: 23.2242 },
    'Люлин 9': { lat: 42.7073, lng: 23.2202 },
    'Люлин 10': { lat: 42.7049, lng: 23.2163 },
    'Младост': { lat: 42.6522, lng: 23.3798 },
    'Младост 1': { lat: 42.6574, lng: 23.3734 },
    'Младост 1А': { lat: 42.6621, lng: 23.3668 },
    'Младост 2': { lat: 42.6546, lng: 23.3828 },
    'Младост 3': { lat: 42.6503, lng: 23.3898 },
    'Младост 4': { lat: 42.6462, lng: 23.3972 },
    'Студентски град': { lat: 42.6509, lng: 23.3387 },
    'Надежда': { lat: 42.7368, lng: 23.2824 },
    'Надежда 1': { lat: 42.7379, lng: 23.2925 },
    'Надежда 2': { lat: 42.7391, lng: 23.2861 },
    'Надежда 3': { lat: 42.7404, lng: 23.2798 },
    'Надежда 4': { lat: 42.7412, lng: 23.2733 },
    'Дружба': { lat: 42.6689, lng: 23.3992 },
    'Дружба 1': { lat: 42.6704, lng: 23.3897 },
    'Дружба 2': { lat: 42.6663, lng: 23.4078 },
    'Слатина': { lat: 42.6885, lng: 23.3586 },
    'Изток': { lat: 42.6712, lng: 23.3516 },
    'Западен парк': { lat: 42.7064, lng: 23.2687 },
    'Овча купел': { lat: 42.6785, lng: 23.2568 },
    'Овча купел 1': { lat: 42.6818, lng: 23.2474 },
    'Овча купел 2': { lat: 42.6751, lng: 23.2411 },
    'Красно село': { lat: 42.6865, lng: 23.2898 },
    'Красна поляна': { lat: 42.6922, lng: 23.2746 },
    'Красна поляна 1': { lat: 42.6941, lng: 23.2802 },
    'Красна поляна 2': { lat: 42.6918, lng: 23.2739 },
    'Красна поляна 3': { lat: 42.6897, lng: 23.2678 },
    'Лозенец': { lat: 42.673, lng: 23.3184 },
    'Драгалевци': { lat: 42.6326, lng: 23.3032 },
    'Симеоново': { lat: 42.6389, lng: 23.3318 },
    'Бояна': { lat: 42.6448, lng: 23.2691 },
    'Манастирски ливади': { lat: 42.6668, lng: 23.2897 },
    'Хладилника': { lat: 42.6642, lng: 23.3192 },
    'Гоце Делчев': { lat: 42.6724, lng: 23.2927 },
    'Борово': { lat: 42.6768, lng: 23.2826 },
    'Белите брези': { lat: 42.6841, lng: 23.2967 },
    'Гео Милев': { lat: 42.6822, lng: 23.3462 },
    'Редута': { lat: 42.6905, lng: 23.3412 },
    'Левски': { lat: 42.7087, lng: 23.3649 },
    'Левски Г': { lat: 42.7134, lng: 23.3702 },
    'Обеля': { lat: 42.7462, lng: 23.2728 },
    'Обеля 1': { lat: 42.7482, lng: 23.2795 },
    'Обеля 2': { lat: 42.7443, lng: 23.2667 },
    'Суходол': { lat: 42.7029, lng: 23.2324 },
    'Филиповци': { lat: 42.7295, lng: 23.2321 },
    'Орландовци': { lat: 42.7198, lng: 23.3207 },
    'Банишора': { lat: 42.7052, lng: 23.3154 },
    'Илинден': { lat: 42.7067, lng: 23.2859 },
    'Захарна фабрика': { lat: 42.7093, lng: 23.2796 },
    'Сердика': { lat: 42.7015, lng: 23.3178 },
    'Подуяне': { lat: 42.7018, lng: 23.3497 },
    'Хаджи Димитър': { lat: 42.7062, lng: 23.3478 },
    'Сухата река': { lat: 42.7113, lng: 23.3604 },
    'Малашевци': { lat: 42.7186, lng: 23.3369 },
    'Лагера': { lat: 42.6881, lng: 23.2939 },
    'Иван Вазов': { lat: 42.6807, lng: 23.3092 },
    'Павлово': { lat: 42.6713, lng: 23.2595 },
    'Княжево': { lat: 42.6554, lng: 23.2467 },
    'Витоша': { lat: 42.6407, lng: 23.3149 },
    'Искър': { lat: 42.683, lng: 23.4049 },
    'Връбница': { lat: 42.7471, lng: 23.2871 },
  }

  const normalize = (v: string) =>
    v
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const pickBestGeocode = (
    results: { lat: number; lng: number; displayName: string }[],
    district?: string
  ) => {
    if (results.length === 0) return undefined
    if (!district?.trim()) return results[0]
    const districtNorm = normalize(district)
    const matched = results.find((r) => normalize(r.displayName).includes(districtNorm))
    return matched ?? results[0]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const priceNum = parseFloat(price.replace(',', '.'))
      if (Number.isNaN(priceNum) || priceNum < 0) {
        setError('Въведете валидна цена (число ≥ 0).')
        setSubmitting(false)
        return
      }
      const timeString = `${departureHour}:${departureMinute}`
      if (!departureDate.trim() || !timeString.trim()) {
        setError('Въведете дата (ДД.ММ.ГГГГ) и час на тръгване (ЧЧ:ММ).')
        setSubmitting(false)
        return
      }
      if (fromCity === 'София' && !fromDistrict.trim()) {
        setError('При тръгване от София, посочете и квартал или район.')
        setSubmitting(false)
        return
      }
      if (toCity === 'София' && !toDistrict.trim()) {
        setError('При пристигане в София, посочете и квартал или район.')
        setSubmitting(false)
        return
      }
      const departureTimeIso = parseBgDateTime(departureDate.trim(), timeString)
      if (!departureTimeIso) {
        setError('Невалидна дата или час. Дата: ДД.ММ.ГГГГ, час: ЧЧ:ММ')
        setSubmitting(false)
        return
      }
      let fromLat: number | undefined
      let fromLng: number | undefined
      let toLat: number | undefined
      let toLng: number | undefined
      if (fromCity === 'София' && fromDistrict.trim()) {
        const districtCoords = SOFIA_DISTRICT_COORDS[fromDistrict.trim()]
        if (districtCoords) {
          fromLat = districtCoords.lat
          fromLng = districtCoords.lng
        }
      }
      if (toCity === 'София' && toDistrict.trim()) {
        const districtCoords = SOFIA_DISTRICT_COORDS[toDistrict.trim()]
        if (districtCoords) {
          toLat = districtCoords.lat
          toLng = districtCoords.lng
        }
      }
      try {
        // За стандартни градове оставяме координатите празни и backend ползва сигурен city-center.
        // Geocode ползваме само като fallback за избран квартал в София, ако липсва в локалната карта.
        const fromDistrictFirstQuery =
          fromLat == null && fromLng == null && fromCity === 'София' && fromDistrict.trim()
            ? `${fromDistrict.trim()}, София, Bulgaria`
            : null
        const toDistrictFirstQuery =
          toLat == null && toLng == null && toCity === 'София' && toDistrict.trim()
            ? `${toDistrict.trim()}, София, Bulgaria`
            : null

        const [fromResultsPrimary, toResultsPrimary] = await Promise.all([
          fromDistrictFirstQuery ? searchAddress(fromDistrictFirstQuery, token) : Promise.resolve([]),
          toDistrictFirstQuery ? searchAddress(toDistrictFirstQuery, token) : Promise.resolve([]),
        ])

        const bestFrom = pickBestGeocode(fromResultsPrimary, fromCity === 'София' ? fromDistrict : undefined)
        const bestTo = pickBestGeocode(toResultsPrimary, toCity === 'София' ? toDistrict : undefined)
        if (bestFrom && fromLat == null && fromLng == null) {
          fromLat = bestFrom.lat
          fromLng = bestFrom.lng
        }
        if (bestTo && toLat == null && toLng == null) {
          toLat = bestTo.lat
          toLng = bestTo.lng
        }
      } catch {
        // продължаваме без координати – бекендът ще ги попълни при отваряне на картата
      }
      const body: RideCreateRequest = {
        fromCity: fromCity,
        ...(fromCity === 'София' && fromDistrict.trim() ? { fromDistrict: fromDistrict.trim() } : {}),
        toCity: toCity,
        ...(toCity === 'София' && toDistrict.trim() ? { toDistrict: toDistrict.trim() } : {}),
        departureTime: departureTimeIso,
        availableSeats,
        price: priceNum,
        ...(carDetails.trim() && { carDetails: carDetails.trim() }),
        ...(fromLat != null && fromLng != null && { fromLat, fromLng }),
        ...(toLat != null && toLng != null && { toLat, toLng }),
      }
      const created = await createRide(body, token!)
      navigate(`/rides/${created.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при създаване на пътуване')
    } finally {
      setSubmitting(false)
    }
  }

  const IconMapPin = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
  const IconCalendar = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
  const IconDetails = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
  const IconPeople = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )

  return (
    <div className="page-form create-ride-form" style={{ maxWidth: 480 }}>
      <h1>Създай пътуване</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <section className="create-ride-section">
          <h2 className="create-ride-section-title">
            <span className="create-ride-section-icon" aria-hidden><IconMapPin /></span>
            Маршрут
          </h2>
          <label>
            От град
            <select
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              required
            >
              <option value="">— Избери град —</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
          {fromCity === 'София' && (
            <label>
              Квартал в София
              <input
                type="text"
                list="sofia-districts"
                value={fromDistrict}
                onChange={(e) => setFromDistrict(e.target.value)}
                placeholder="напр. Младост 4, Люлин 7, Драгалевци..."
                required
              />
            </label>
          )}
          <label>
            До град
            <select
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              required
            >
              <option value="">— Избери град —</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
          {toCity === 'София' && (
            <label>
              Квартал в София
              <input
                type="text"
                list="sofia-districts"
                value={toDistrict}
                onChange={(e) => setToDistrict(e.target.value)}
                placeholder="напр. Младост 4, Люлин 7, Драгалевци..."
                required
              />
            </label>
          )}
          <datalist id="sofia-districts">
            {Array.from(new Set(SOFIA_DISTRICTS)).map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </section>

        <section className="create-ride-section">
          <h2 className="create-ride-section-title">
            <span className="create-ride-section-icon" aria-hidden><IconCalendar /></span>
            Дата и час
          </h2>
          <div className="create-ride-date-time">
            <label>
              Дата
              <span className="date-input-with-calendar">
                <input
                  type="text"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  placeholder="дд.мм.гггг"
                  required
                  maxLength={10}
                />
                <input
                  ref={departureDatePickerRef}
                  type="date"
                  aria-hidden
                  tabIndex={-1}
                  className="date-picker-hidden"
                  onChange={(e) => {
                    const v = e.target.value
                    if (v) setDepartureDate(apiDateToBg(v))
                  }}
                />
                <button
                  type="button"
                  className="btn-calendar-icon"
                  onClick={() => {
                    if (departureDatePickerRef.current) {
                      if (typeof departureDatePickerRef.current.showPicker === 'function') {
                        departureDatePickerRef.current.showPicker()
                      } else {
                        departureDatePickerRef.current.click()
                      }
                    }
                  }}
                  title="Избери от календар"
                  aria-label="Календар"
                >
                  <IconCalendar />
                </button>
              </span>
            </label>
            <label>
              Час
              <div className="create-ride-time-selects">
                <select
                  value={departureHour}
                  onChange={(e) => setDepartureHour(e.target.value)}
                  required
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const v = i.toString().padStart(2, '0')
                    return (
                      <option key={v} value={v}>{v}</option>
                    )
                  })}
                </select>
                <span>:</span>
                <select
                  value={departureMinute}
                  onChange={(e) => setDepartureMinute(e.target.value)}
                  required
                >
                  {['00', '15', '30', '45'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </label>
          </div>
        </section>

        <section className="create-ride-section">
          <h2 className="create-ride-section-title">
            <span className="create-ride-section-icon" aria-hidden><IconDetails /></span>
            Детайли
          </h2>
          <label>
            <span className="create-ride-label-with-icon">
              <span className="create-ride-label-icon" aria-hidden><IconPeople /></span>
              Брой места
            </span>
            <input
              type="number"
              min={1}
              value={availableSeats}
              onChange={(e) => setAvailableSeats(parseInt(e.target.value, 10) || 1)}
              required
            />
          </label>
          <label>
            Цена (€)
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              placeholder="напр. 15 €"
            />
          </label>
          <label>
            Автомобил
            <input
              type="text"
              value={carDetails}
              onChange={(e) => setCarDetails(e.target.value)}
              placeholder="напр. VW Golf, червен"
            />
          </label>
        </section>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Създаване...' : 'Създай пътуване'}
        </button>
      </form>
      <p className="form-footer">
        <Link to="/rides">← Обратно към пътуванията</Link>
      </p>
    </div>
  )
}
