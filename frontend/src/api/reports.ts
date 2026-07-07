import { apiRequest } from './client'
import type { CreateReportRequest, UserReportDto } from '../types/api'

export async function createReport(body: CreateReportRequest, token: string): Promise<UserReportDto> {
  return apiRequest<UserReportDto>('/reports', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function getMyReports(token: string, rideId?: number): Promise<UserReportDto[]> {
  const query = rideId != null ? `?rideId=${rideId}` : ''
  const data = await apiRequest<UserReportDto[]>(`/reports/mine${query}`, { token })
  return Array.isArray(data) ? data : []
}
