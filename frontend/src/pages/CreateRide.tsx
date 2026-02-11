import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createRide } from '../api/rides'
import { useAuth } from '../contexts/AuthContext'
import { CITIES } from '../constants/cities'
import { parseBgDateTime, apiDateToBg } from '../constants/dateLocale'
import type { RideCreateRequest } from '../types/api'

export function CreateRide() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [fromCity, setFromCity] = useState('')
  const [toCity, setToCity] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const departureDatePickerRef = React.useRef<HTMLInputElement>(null)
  const [availableSeats, setAvailableSeats] = useState(1)
  const [price, setPrice] = useState('')
  const [carDetails, setCarDetails] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      if (!departureDate.trim() || !departureTime.trim()) {
        setError('Въведете дата (ДД.ММ.ГГГГ) и час на тръгване.')
        setSubmitting(false)
        return
      }
      const departureTimeIso = parseBgDateTime(departureDate.trim(), departureTime.trim())
      if (!departureTimeIso) {
        setError('Невалидна дата или час. Дата: ДД.ММ.ГГГГ, час: ЧЧ:ММ')
        setSubmitting(false)
        return
      }
      const body: RideCreateRequest = {
        fromCity: fromCity,
        toCity: toCity,
        departureTime: departureTimeIso,
        availableSeats,
        price: priceNum,
        ...(carDetails.trim() && { carDetails: carDetails.trim() }),
      }
      const created = await createRide(body, token!)
      navigate(`/rides/${created.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при създаване на пътуване')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-form" style={{ maxWidth: 480 }}>
      <h1>Създай пътуване</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
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
        <label>
          Дата на тръгване (ден.месец.година)
          <span className="date-input-with-calendar">
            <input
              type="text"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              placeholder="dd/mm/yyyy"
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
          </span>
        </label>
        <label>
          Час на тръгване
          <input
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            required
          />
        </label>
        <label>
          Брой места
          <input
            type="number"
            min={1}
            value={availableSeats}
            onChange={(e) => setAvailableSeats(parseInt(e.target.value, 10) || 1)}
            required
          />
        </label>
        <label>
          Цена (лв)
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="напр. 15"
          />
        </label>
        <label>
          Автомобил (по избор)
          <input
            type="text"
            value={carDetails}
            onChange={(e) => setCarDetails(e.target.value)}
            placeholder="напр. VW Golf, червен"
          />
        </label>
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
