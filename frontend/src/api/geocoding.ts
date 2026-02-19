import { apiRequest } from './client'

export interface GeocodingResult {
  lat: number
  lng: number
  displayName: string
  provider?: string | null
  osmType?: string | null
}

export async function searchAddress(
  query: string,
  token?: string | null
): Promise<GeocodingResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const url = `/geocode?q=${encodeURIComponent(trimmed)}`
  const data = await apiRequest<GeocodingResult[]>(url, { token: token ?? undefined })
  return Array.isArray(data) ? data : []
}
