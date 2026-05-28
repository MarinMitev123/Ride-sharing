import { useMemo, useCallback, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { RideStopDto } from '../types/api'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER: [number, number] = [42.7339, 25.4858]
const DEFAULT_ZOOM = 11
const ROUTE_COLOR = '#2563eb'
const ROUTE_WEIGHT = 4

const STOP_TYPE_LABELS: Record<string, string> = {
  START: 'Старт',
  END: 'Край',
  PICKUP: 'Качване',
  DROPOFF: 'Слизане',
}

function createStopIcon(type: string): L.DivIcon {
  const colors: Record<string, string> = {
    START: '#16a34a',
    END: '#dc2626',
    PICKUP: '#2563eb',
    DROPOFF: '#ea580c',
  }
  const color = colors[type] ?? '#6b7280'
  return L.divIcon({
    className: 'ride-stop-marker',
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

const PICKUP_ICON = L.divIcon({
  className: 'pickup-marker',
  html: '<div style="width:28px;height:28px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const SUGGESTED_ICON = L.divIcon({
  className: 'suggested-point-marker',
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#16a34a;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const DROPOFF_ICON = L.divIcon({
  className: 'dropoff-marker',
  html: '<div style="width:26px;height:26px;border-radius:50%;background:#ea580c;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

const PASSENGER_PICKUP_ICON = L.divIcon({
  className: 'passenger-pickup-marker',
  html: '<div style="width:28px;height:28px;border-radius:50%;background:#7c3aed;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const DRIVER_LOCATION_ICON = L.divIcon({
  className: 'driver-location-marker',
  html: '<div style="width:30px;height:30px;border-radius:50%;background:#0f766e;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;">🚗</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

/** Текуща GPS позиция на потребителя (напр. шофьор при отваряне на картата). */
const MY_LOCATION_ICON = L.divIcon({
  className: 'my-gps-marker',
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#0284c7;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function FitBounds({ points, zoom }: { points: [number, number][]; zoom?: number }) {
  const map = useMap()
  const mountedRef = useRef(true)
  const bounds = useMemo(() => {
    if (points.length === 0) return null
    return L.latLngBounds(points)
  }, [points])
  useEffect(() => {
    mountedRef.current = true
    if (!bounds || points.length === 0) return
    const id = setTimeout(() => {
      if (!mountedRef.current) return
      try {
        const container = map.getContainer?.()
        if (!container || !document.contains(container)) return
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: zoom ?? 13 })
      } catch {
        // Map may be unmounted during Leaflet zoom (_leaflet_pos etc.)
      }
    }, 50)
    return () => {
      mountedRef.current = false
      clearTimeout(id)
    }
  }, [map, bounds, points.length, zoom])
  return null
}

function MapResizeFix() {
  const map = useMap()
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    const t = setTimeout(() => {
      if (!mountedRef.current) return
      try {
        const container = map.getContainer?.()
        if (!container || !document.contains(container)) return
        map.invalidateSize()
      } catch {
        // Map may be unmounted
      }
    }, 150)
    return () => {
      mountedRef.current = false
      clearTimeout(t)
    }
  }, [map])
  return null
}

function MapClickHandler({
  selectingMode,
  onPickupChange,
  onDropoffChange,
}: {
  selectingMode: 'pickup' | 'dropoff' | null
  onPickupChange: (lat: number, lng: number) => void
  onDropoffChange?: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (selectingMode === 'pickup') onPickupChange(e.latlng.lat, e.latlng.lng)
      if (selectingMode === 'dropoff' && onDropoffChange) onDropoffChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export interface RideMapProps {
  /** Координати на маршрута от GET /api/v1/rides/{id}/route */
  routeCoordinates: [number, number][]
  /** Спирки от същия endpoint */
  stops: RideStopDto[]
  /** Текуща избрана точка за качване (показва се като draggable marker) */
  pickupPoint: { lat: number; lng: number } | null
  /** Предложена от backend точка (suggestedLat, suggestedLng) */
  suggestedPoint: { lat: number; lng: number } | null
  /** Извиква се при клик на картата и при drag end на pickup marker. Родителят трябва да извика validate-point. */
  onPickupChange: (lat: number, lng: number) => void
  /** Извиква се при натискане на „Използвай предложената точка“. */
  onUseSuggestedPoint?: () => void
  /** Дали да се приема клик и drag за избор на място за качване */
  allowPickupSelection?: boolean
  /** Височина на картата в px */
  height?: number
  /** Режим на избор: pickup / dropoff (при null клик не прави нищо) */
  selectingMode?: 'pickup' | 'dropoff' | null
  /** Точка за слизане (опционално, за резервация с качване+слизане) */
  dropoffPoint?: { lat: number; lng: number } | null
  /** Извиква се при клик/драг за точка за слизане */
  onDropoffChange?: (lat: number, lng: number) => void
  /** Уникален ключ за MapContainer (използвай при втора карта на същата страница, напр. "driver-route-map") */
  mapKey?: string
  /** Допълнителни точки за качване на пътници (за изгледа на шофьора) */
  passengerPickupPoints?: { lat: number; lng: number; title?: string }[]
  /** Текуща позиция на шофьора при live tracking */
  driverLocation?: { lat: number; lng: number } | null
  /** GPS на текущия потребител – центриране и маркер (напр. „откъде тръгвам“) */
  myLocation?: { lat: number; lng: number } | null
}

export function RideMap({
  routeCoordinates,
  stops,
  pickupPoint,
  suggestedPoint,
  onPickupChange,
  onUseSuggestedPoint,
  allowPickupSelection = true,
  height = 360,
  selectingMode = null,
  dropoffPoint = null,
  onDropoffChange,
  mapKey,
  passengerPickupPoints = [],
  driverLocation = null,
  myLocation = null,
}: RideMapProps) {
  const allPoints = useMemo(() => {
    const pts: [number, number][] = [...routeCoordinates]
    stops.forEach((s) => pts.push([s.latitude, s.longitude]))
    if (pickupPoint) pts.push([pickupPoint.lat, pickupPoint.lng])
    if (dropoffPoint) pts.push([dropoffPoint.lat, dropoffPoint.lng])
    if (suggestedPoint) pts.push([suggestedPoint.lat, suggestedPoint.lng])
    passengerPickupPoints.forEach((p) => pts.push([p.lat, p.lng]))
    if (driverLocation) pts.push([driverLocation.lat, driverLocation.lng])
    if (myLocation) pts.push([myLocation.lat, myLocation.lng])
    return pts
  }, [routeCoordinates, stops, pickupPoint, dropoffPoint, suggestedPoint, passengerPickupPoints, driverLocation, myLocation])

  const center = useMemo((): [number, number] => {
    if (myLocation) return [myLocation.lat, myLocation.lng]
    if (routeCoordinates.length > 0) {
      const first = routeCoordinates[0]
      return [first[0], first[1]]
    }
    if (stops.length > 0) return [stops[0].latitude, stops[0].longitude]
    return DEFAULT_CENTER
  }, [myLocation, routeCoordinates, stops])

  const handlePickupDragEnd = useCallback(
    (e: L.LeafletEvent) => {
      const pos = (e.target as L.Marker).getLatLng()
      onPickupChange(pos.lat, pos.lng)
    },
    [onPickupChange]
  )

  const handleDropoffDragEnd = useCallback(
    (e: L.LeafletEvent) => {
      if (!onDropoffChange) return
      const pos = (e.target as L.Marker).getLatLng()
      onDropoffChange(pos.lat, pos.lng)
    },
    [onDropoffChange]
  )

  return (
    <div style={{ width: '100%' }}>
      <div
        className="ride-map-wrapper"
        style={{
          height: `${height}px`,
          width: '100%',
          minHeight: 280,
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
          background: '#e5e7eb',
        }}
      >
        <MapContainer
          key={mapKey ?? 'ride-map'}
          center={center}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%', minHeight: 280 }}
          scrollWheelZoom
          zoomAnimation={false}
          fadeAnimation={false}
          markerZoomAnimation={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapResizeFix />
          {allPoints.length > 0 && <FitBounds points={allPoints} zoom={13} />}
          <MapClickHandler
            selectingMode={allowPickupSelection ? selectingMode : null}
            onPickupChange={onPickupChange}
            onDropoffChange={onDropoffChange}
          />

          {routeCoordinates.length > 0 && (
            <Polyline positions={routeCoordinates} color={ROUTE_COLOR} weight={ROUTE_WEIGHT} />
          )}

          {stops.map((s, index) => (
            <Marker
              key={s.id ?? `stop-${s.type}-${index}`}
              position={[s.latitude, s.longitude]}
              icon={createStopIcon(s.type)}
              title={s.name || STOP_TYPE_LABELS[s.type] || s.type}
            />
          ))}

          {suggestedPoint && (
            <Marker
              position={[suggestedPoint.lat, suggestedPoint.lng]}
              icon={SUGGESTED_ICON}
              title="Предложена точка"
            />
          )}

          {pickupPoint && (
            <Marker
              position={[pickupPoint.lat, pickupPoint.lng]}
              icon={PICKUP_ICON}
              draggable={allowPickupSelection && (selectingMode === 'pickup' || selectingMode === null)}
              eventHandlers={
                allowPickupSelection ? { dragend: handlePickupDragEnd } : undefined
              }
              title="Място за качване – плъзнете за преместване"
            />
          )}

          {dropoffPoint && (
            <Marker
              position={[dropoffPoint.lat, dropoffPoint.lng]}
              icon={DROPOFF_ICON}
              draggable={!!(allowPickupSelection && selectingMode === 'dropoff' && onDropoffChange)}
              eventHandlers={onDropoffChange ? { dragend: handleDropoffDragEnd } : undefined}
              title="Място за слизане – плъзнете за преместване"
            />
          )}

          {passengerPickupPoints.map((p, idx) => (
            <Marker
              key={`passenger-pickup-${idx}-${p.lat}-${p.lng}`}
              position={[p.lat, p.lng]}
              icon={PASSENGER_PICKUP_ICON}
              title={p.title ?? 'Точка за качване на пътник'}
            />
          ))}

          {driverLocation && (
            <Marker
              position={[driverLocation.lat, driverLocation.lng]}
              icon={DRIVER_LOCATION_ICON}
              title="Шофьор"
            />
          )}

          {myLocation && (
            <Marker
              position={[myLocation.lat, myLocation.lng]}
              icon={MY_LOCATION_ICON}
              title="Вашата позиция (GPS)"
            />
          )}
        </MapContainer>
      </div>

      {allowPickupSelection && (
        <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748b' }}>
          {selectingMode === 'dropoff'
            ? 'Кликнете на картата за място за слизане или плъзнете маркера.'
            : 'Кликнете на картата за място за качване или плъзнете маркера.'}
        </p>
      )}

      {suggestedPoint && onUseSuggestedPoint && (
        <button
          type="button"
          onClick={onUseSuggestedPoint}
          style={{
            marginTop: 10,
            padding: '8px 16px',
            fontSize: 14,
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Използвай предложената точка
        </button>
      )}
    </div>
  )
}
