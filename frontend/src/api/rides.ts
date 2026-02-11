import type { RideDto, BookingDto, RideCreateRequest } from '../types/api'
import { apiRequest } from './client'

export interface RidesSearchParams {
  fromCity?: string
  toCity?: string
  date?: string // YYYY-MM-DD
}

export async function getRides(
  params?: RidesSearchParams,
  token?: string | null
): Promise<RideDto[]> {
  const search = new URLSearchParams()
  if (params?.fromCity) search.set('fromCity', params.fromCity)
  if (params?.toCity) search.set('toCity', params.toCity)
  if (params?.date) search.set('date', params.date)
  const qs = search.toString()
  const path = qs ? `/rides?${qs}` : '/rides'
  return apiRequest<RideDto[]>(path, { token })
}

export async function getRideById(id: number, token?: string | null): Promise<RideDto> {
  return apiRequest<RideDto>(`/rides/${id}`, { token })
}

export async function getBookingsForRide(rideId: number, token: string): Promise<BookingDto[]> {
  return apiRequest<BookingDto[]>(`/rides/${rideId}/bookings`, { token })
}

/** Създаване на пътуване – изисква JWT (текущият потребител става шофьор). */
export async function createRide(body: RideCreateRequest, token: string): Promise<RideDto> {
  return apiRequest<RideDto>('/rides', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}
