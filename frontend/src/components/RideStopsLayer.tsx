import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

export interface RideStopDto {
  id: number
  rideId: number
  name: string | null
  latitude: number
  longitude: number
  stopOrder: number
  type: string
}

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const stopLabels: Record<string, string> = {
  START: 'Старт',
  END: 'Край',
  PICKUP: 'Качване',
  DROPOFF: 'Слизане',
}

export interface RideStopsLayerProps {
  stops: RideStopDto[]
}

export function RideStopsLayer({ stops }: RideStopsLayerProps) {
  if (!stops?.length) return null
  return (
    <>
      {stops.map((s) => (
        <Marker key={s.id} position={[s.latitude, s.longitude]} icon={defaultIcon}>
          <Popup>{s.name || stopLabels[s.type] || s.type}</Popup>
        </Marker>
      ))}
    </>
  )
}
