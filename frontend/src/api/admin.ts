import { apiRequest } from './client'
import type { UserDto, AdminStatsDto } from '../types/api'

export async function getAdminUsers(token: string): Promise<UserDto[]> {
  const data = await apiRequest<UserDto[]>('/admin/users', { token })
  return Array.isArray(data) ? data : []
}

export async function blockUser(id: number, token: string): Promise<UserDto> {
  return apiRequest<UserDto>(`/admin/users/${id}/block`, {
    method: 'POST',
    token,
  })
}

export async function unblockUser(id: number, token: string): Promise<UserDto> {
  return apiRequest<UserDto>(`/admin/users/${id}/unblock`, {
    method: 'POST',
    token,
  })
}

export async function getAdminStats(token: string): Promise<AdminStatsDto> {
  return apiRequest<AdminStatsDto>('/admin/stats', { token })
}
