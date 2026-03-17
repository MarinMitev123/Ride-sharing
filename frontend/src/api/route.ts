import { apiRequest } from './client'

export interface RouteDto {
  coordinates: [number, number][] // [lat, lng] per point
}

export async function getDrivingRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  token?: string | null
): Promise<RouteDto> {
  const params = new URLSearchParams({
    fromLat: String(fromLat),
    fromLng: String(fromLng),
    toLat: String(toLat),
    toLng: String(toLng),
  })
  const data = await apiRequest<{ coordinates: number[][] }>(
    `/route?${params.toString()}`,
    { token }
  )
  const coordinates = (data?.coordinates ?? []).map((c) => [c[0], c[1]] as [number, number])
  return { coordinates }
}

/** Маршрут за шофьора: старт → точки за качване → край. Само за шофьор на пътуването. */
export async function getDriverRoute(rideId: number, token: string): Promise<RouteDto> {
  const data = await apiRequest<{ coordinates: number[][] }>(
    `/rides/${rideId}/driver-route`,
    { token }
  )
  const coordinates = (data?.coordinates ?? []).map((c) => [c[0], c[1]] as [number, number])
  return { coordinates }
}
