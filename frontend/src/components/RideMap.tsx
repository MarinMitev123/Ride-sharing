import { useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { RideDto } from '../types/api'
import 'leaflet/dist/leaflet.css'

const defaultCenter: [number, number] = [42.7339, 25.4858] // Bulgaria center

// Всички областни градове в България (координати за картата)
const cityCoords: Record<string, [number, number]> = {
  Благоевград: [42.0167, 23.0944],
  Бургас: [42.5048, 27.4626],
  Варна: [43.2141, 27.9147],
  'Велико Търново': [43.0812, 25.6291],
  Видин: [43.9992, 22.8725],
  Враца: [43.21, 23.5625],
  Габрово: [42.8747, 25.3342],
  Добрич: [43.5667, 27.8333],
  Кърджали: [41.65, 25.3667],
  Кюстендил: [42.2839, 22.6911],
  Ловеч: [43.1333, 24.7167],
  Монтана: [43.4125, 23.2253],
  Пазарджик: [42.2, 24.3333],
  Перник: [42.6, 23.0333],
  Плевен: [43.417, 24.617],
  Пловдив: [42.1354, 24.7453],
  Разград: [43.5333, 26.5167],
  Русе: [43.8476, 25.9532],
  Силистра: [44.1167, 27.2667],
  Сливен: [42.6858, 26.3292],
  Смолян: [41.5853, 24.6919],
  София: [42.6977, 23.3219],
  'Стара Загора': [42.4257, 25.6345],
  Търговище: [43.25, 26.5833],
  Хасково: [41.9344, 25.5556],
  Шумен: [43.2706, 26.9229],
  Ямбол: [42.4833, 26.5],
}

function getCoords(lat?: number, lng?: number, city?: string): [number, number] | null {
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return [lat, lng]
  }
  if (city && cityCoords[city]) return cityCoords[city]
  return null
}

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const pickupIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  const bounds = useMemo(() => {
    if (points.length === 0) return null
    return L.latLngBounds(points)
  }, [points])
  useEffect(() => {
    if (bounds && points.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
    }
  }, [map, bounds, points.length])
  return null
}

function MapClickHandler({
  selectPickupMode,
  onPickupClick,
}: {
  selectPickupMode: boolean
  onPickupClick?: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (selectPickupMode && onPickupClick) {
        onPickupClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export interface RideMapProps {
  ride: RideDto
  pickupPoints?: { lat: number; lng: number; label?: string }[]
  onPickupClick?: (lat: number, lng: number) => void
  selectPickupMode?: boolean
}

export function RideMap({ ride, pickupPoints = [], onPickupClick, selectPickupMode = false }: RideMapProps) {
  const from = getCoords(ride.fromLat, ride.fromLng, ride.fromCity)
  const to = getCoords(ride.toLat, ride.toLng, ride.toCity)

  const allPoints = useMemo(() => {
    const pts: [number, number][] = []
    if (from) pts.push(from)
    if (to) pts.push(to)
    pickupPoints.forEach((p) => pts.push([p.lat, p.lng]))
    return pts
  }, [from, to, pickupPoints])

  const center = from ?? to ?? defaultCenter

  return (
    <div style={{ height: 360, width: '100%', borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <MapClickHandler selectPickupMode={selectPickupMode} onPickupClick={onPickupClick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {allPoints.length > 0 && <FitBounds points={allPoints} />}
        {from && (
          <Marker position={from} icon={defaultIcon}>
            <Popup>От: {ride.fromCity}</Popup>
          </Marker>
        )}
        {to && (
          <Marker position={to} icon={defaultIcon}>
            <Popup>До: {ride.toCity}</Popup>
          </Marker>
        )}
        {from && to && <Polyline positions={[from, to]} color="#2563eb" weight={4} />}
        {pickupPoints.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={pickupIcon}>
            <Popup>{p.label ?? 'Място за качване'}</Popup>
          </Marker>
        ))}
      </MapContainer>
      {selectPickupMode && (
        <p style={{ margin: 8, fontSize: 14, color: '#666' }}>
          Кликни на картата, за да избереш място за качване.
        </p>
      )}
    </div>
  )
}
