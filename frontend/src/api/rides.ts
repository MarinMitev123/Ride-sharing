import { apiRequest } from './client'
import type {
  RideDto,
  RideCreateRequest,
  RidesPageDto,
  RideStopDto,
  ValidatePointRequest,
  ValidatePointResponse,
  ValidatePointsRequest,
  ValidatePointsResponse,
  BookRideRequest,
  BookingDto,
} from '../types/api'

export interface RideRouteDto {
  coordinates: [number, number][]
  stops: RideStopDto[]
}

export interface GetRidesParams {
  fromCity?: string
  toCity?: string
  date?: string
  page?: number
  size?: number
  sortBy?: string
  sortDir?: string
}

export async function getRides(token?: string | null): Promise<RideDto[]> {
  const data = await apiRequest<RideDto[]>('/rides', { token })
  return Array.isArray(data) ? data : []
}

/** Пътувания, в които текущият потребител е шофьор (създал е пътуването). */
export async function getMyRidesAsDriver(token: string): Promise<RideDto[]> {
  const data = await apiRequest<RideDto[]>('/rides/my-as-driver', { token })
  return Array.isArray(data) ? data : []
}

export async function getRidesFiltered(
  params: GetRidesParams,
  token?: string | null
): Promise<RidesPageDto> {
  const search = new URLSearchParams()
  if (params.fromCity != null && params.fromCity !== '') search.set('fromCity', params.fromCity)
  if (params.toCity != null && params.toCity !== '') search.set('toCity', params.toCity)
  if (params.date != null && params.date !== '') search.set('date', params.date)
  if (params.page != null) search.set('page', String(params.page))
  if (params.size != null) search.set('size', String(params.size))
  if (params.sortBy != null) search.set('sortBy', params.sortBy)
  if (params.sortDir != null) search.set('sortDir', params.sortDir)
  const qs = search.toString()
  const path = qs ? `/rides?${qs}` : '/rides'
  return apiRequest<RidesPageDto>(path, { token })
}

export async function getRideById(id: number, token?: string | null): Promise<RideDto> {
  return apiRequest<RideDto>(`/rides/${id}`, { token })
}

export async function createRide(body: RideCreateRequest, token: string): Promise<RideDto> {
  return apiRequest<RideDto>('/rides', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function getRideRoute(
  rideId: number,
  token?: string | null
): Promise<RideRouteDto> {
  const data = await apiRequest<{ coordinates: number[][]; stops: RideStopDto[] }>(
    `/rides/${rideId}/route`,
    { token }
  )
  const coordinates = (data?.coordinates ?? []).map((c) => [c[0], c[1]] as [number, number])
  return { coordinates, stops: data?.stops ?? [] }
}

export async function validatePoint(
  rideId: number,
  body: ValidatePointRequest,
  token?: string | null
): Promise<ValidatePointResponse> {
  return apiRequest<ValidatePointResponse>(`/rides/${rideId}/validate-point`, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function validatePoints(
  rideId: number,
  body: ValidatePointsRequest,
  token?: string | null
): Promise<ValidatePointsResponse> {
  return apiRequest<ValidatePointsResponse>(`/rides/${rideId}/validate-points`, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function bookRide(
  rideId: number,
  body: BookRideRequest,
  token: string
): Promise<BookingDto> {
  return apiRequest<BookingDto>(`/rides/${rideId}/book`, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}
