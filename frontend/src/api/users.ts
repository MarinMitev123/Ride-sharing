import { apiRequest } from './client'
import type { UserDto } from '../types/api'

export interface UpdateProfileRequest {
  name?: string
  phone?: string
  iban?: string
}

export async function getCurrentUser(token: string): Promise<UserDto> {
  return apiRequest<UserDto>('/users/me', { token })
}

export async function updateProfile(
  body: UpdateProfileRequest,
  token: string
): Promise<UserDto> {
  return apiRequest<UserDto>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
    token,
  })
}

export async function getUserById(id: number, token: string): Promise<UserDto> {
  return apiRequest<UserDto>(`/users/${id}`, { token })
}
