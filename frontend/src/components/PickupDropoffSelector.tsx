export interface ValidatePointsResponse {
  valid: boolean
  suggestedPickupLat?: number
  suggestedPickupLng?: number
  suggestedDropoffLat?: number
  suggestedDropoffLng?: number
  message?: string
}

export interface PickupDropoffSelectorProps {
  pickup: { lat: number; lng: number } | null
  dropoff: { lat: number; lng: number } | null
  validated: ValidatePointsResponse | null
  validating: boolean
  onValidate: () => void
  selectingMode: 'pickup' | 'dropoff' | null
  onSetSelectingMode: (mode: 'pickup' | 'dropoff' | null) => void
  canValidate: boolean
  /** Дали маршрутът вече е зареден (за подсказка). */
  routeLoaded?: boolean
  /** Показва бутон „Размени качване и слизане“ при грешка „качването трябва да е преди слизането“. */
  showSwapButton?: boolean
  onSwapPickupDropoff?: () => void
}

export function PickupDropoffSelector({
  pickup,
  dropoff,
  validated,
  validating,
  onValidate,
  selectingMode,
  onSetSelectingMode,
  canValidate,
  routeLoaded = true,
  showSwapButton = false,
  onSwapPickupDropoff,
}: PickupDropoffSelectorProps) {
  return (
    <div style={{ marginTop: 16, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Място за качване и слизане</p>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: '#64748b' }}>
        Изберете двете точки на картата, след което натиснете „Провери точките“.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => onSetSelectingMode(selectingMode === 'pickup' ? null : 'pickup')}
          style={{
            padding: '6px 12px',
            fontSize: 14,
            background: selectingMode === 'pickup' ? '#2563eb' : '#f1f5f9',
            color: selectingMode === 'pickup' ? '#fff' : '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
          }}
        >
          {pickup ? `Качване: ${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}` : 'Избери качване'}
        </button>
        <button
          type="button"
          onClick={() => onSetSelectingMode(selectingMode === 'dropoff' ? null : 'dropoff')}
          style={{
            padding: '6px 12px',
            fontSize: 14,
            background: selectingMode === 'dropoff' ? '#2563eb' : '#f1f5f9',
            color: selectingMode === 'dropoff' ? '#fff' : '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
          }}
        >
          {dropoff ? `Слизане: ${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}` : 'Избери слизане'}
        </button>
      </div>
      <div style={{ marginTop: 4 }}>
        <button
          type="button"
          onClick={onValidate}
          disabled={!canValidate || validating || !pickup || !dropoff}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            background: canValidate && pickup && dropoff && !validating ? '#2563eb' : '#94a3b8',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: canValidate && pickup && dropoff && !validating ? 'pointer' : 'not-allowed',
          }}
        >
          {validating ? 'Проверка…' : 'Провери точките'}
        </button>
        {pickup && dropoff && !routeLoaded && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>
            Натиснете „Провери точките“ – при нужда маршрутът ще се зареди автоматично.
          </p>
        )}
      </div>
      {validated && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          {validated.valid ? (
            <p style={{ color: '#16a34a', margin: 0 }}>Точките са валидни. Можете да резервирате.</p>
          ) : (
            <>
              <p style={{ color: '#dc2626', margin: 0 }}>
                {validated.message || 'Точките не са валидни.'}
              </p>
              {showSwapButton && onSwapPickupDropoff && (
                <button
                  type="button"
                  onClick={onSwapPickupDropoff}
                  style={{ marginTop: 8, padding: '6px 12px', fontSize: 14, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  Размени качване и слизане
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
