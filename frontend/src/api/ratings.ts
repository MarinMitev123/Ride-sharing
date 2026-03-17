import { apiRequest } from './client'
import type { RatingDto, RatingCreateRequest } from '../types/api'

export async function getRatingsForUser(userId: number, token?: string | null): Promise<RatingDto[]> {
  const data = await apiRequest<RatingDto[]>(`/ratings/user/${userId}`, { token })
  return Array.isArray(data) ? data : []
}

export async function createRating(
  body: RatingCreateRequest,
  token: string
): Promise<RatingDto> {
  return apiRequest<RatingDto>('/ratings', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}
