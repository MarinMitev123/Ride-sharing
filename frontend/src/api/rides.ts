import { apiRequest } from './client'
import type { RideDto, RideCreateRequest } from '../types/api'

export async function getRides(token?: string | null): Promise<RideDto[]> {
  const data = await apiRequest<RideDto[]>('/rides', { token })
  return Array.isArray(data) ? data : []
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
