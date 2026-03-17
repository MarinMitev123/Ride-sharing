import { useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { RideStopsLayer } from './RideStopsLayer'
import type { RideStopDto } from './RideStopsLayer'
import 'leaflet/dist/leaflet.css'

const defaultCenter: [number, number] = [42.7339, 25.4858]

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
  selectingMode,
  onSelectPickup,
  onSelectDropoff,
}: {
  selectingMode: 'pickup' | 'dropoff' | null
  onSelectPickup?: (lat: number, lng: number) => void
  onSelectDropoff?: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (selectingMode === 'pickup' && onSelectPickup) {
        onSelectPickup(e.latlng.lat, e.latlng.lng)
      }
      if (selectingMode === 'dropoff' && onSelectDropoff) {
        onSelectDropoff(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export interface MapComponentProps {
  routeCoordinates?: [number, number][]
  stops?: RideStopDto[]
  pickup?: { lat: number; lng: number } | null
  dropoff?: { lat: number; lng: number } | null
  selectingMode?: 'pickup' | 'dropoff' | null
  onSelectPickup?: (lat: number, lng: number) => void
  onSelectDropoff?: (lat: number, lng: number) => void
  height?: number
}

export function MapComponent({
  routeCoordinates = [],
  stops = [],
  pickup = null,
  dropoff = null,
  selectingMode = null,
  onSelectPickup,
  onSelectDropoff,
  height = 360,
}: MapComponentProps) {
  const allPoints = useMemo(() => {
    const pts: [number, number][] = []
    routeCoordinates.forEach((c) => pts.push(c))
    if (pickup) pts.push([pickup.lat, pickup.lng])
    if (dropoff) pts.push([dropoff.lat, dropoff.lng])
    stops.forEach((s) => pts.push([s.latitude, s.longitude]))
    return pts
  }, [routeCoordinates, pickup, dropoff, stops])

  const center = useMemo(() => {
    if (routeCoordinates.length > 0)
      return routeCoordinates[Math.floor(routeCoordinates.length / 2)] as [number, number]
    if (pickup) return [pickup.lat, pickup.lng] as [number, number]
    if (stops.length > 0) return [stops[0].latitude, stops[0].longitude] as [number, number]
    return defaultCenter
  }, [routeCoordinates, pickup, stops])

  return (
    <div style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {allPoints.length > 0 && <FitBounds points={allPoints} />}
        {routeCoordinates.length > 0 && (
          <Polyline positions={routeCoordinates} color="#2563eb" weight={4} />
        )}
        <RideStopsLayer stops={stops} />
        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>Качване</Popup>
          </Marker>
        )}
        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={pickupIcon}>
            <Popup>Слизане</Popup>
          </Marker>
        )}
        <MapClickHandler
          selectingMode={selectingMode}
          onSelectPickup={onSelectPickup}
          onSelectDropoff={onSelectDropoff}
        />
      </MapContainer>
      {selectingMode && (
        <p style={{ margin: 8, fontSize: 14, color: '#666' }}>
          {selectingMode === 'pickup'
            ? 'Кликнете на картата за място за качване.'
            : 'Кликнете на картата за място за слизане.'}
        </p>
      )}
    </div>
  )
}
