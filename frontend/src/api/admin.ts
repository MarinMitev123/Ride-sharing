import { apiRequest } from './client'
import type { UserDto, AdminStatsDto, UserReportDto, ReportStatus } from '../types/api'

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

export async function getAdminReports(
  token: string,
  status?: ReportStatus
): Promise<UserReportDto[]> {
  const query = status ? `?status=${status}` : ''
  const data = await apiRequest<UserReportDto[]>(`/admin/reports${query}`, { token })
  return Array.isArray(data) ? data : []
}

export async function dismissAdminReport(
  id: number,
  token: string,
  adminNote?: string
): Promise<UserReportDto> {
  return apiRequest<UserReportDto>(`/admin/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'DISMISSED', adminNote: adminNote ?? null }),
    token,
  })
}

export async function blockUserFromReport(id: number, token: string): Promise<UserReportDto> {
  return apiRequest<UserReportDto>(`/admin/reports/${id}/block-user`, {
    method: 'POST',
    token,
  })
}
