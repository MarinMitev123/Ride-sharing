import { apiRequest } from './client'
import type { NotificationDto } from '../types/api'

export async function getNotifications(token: string): Promise<NotificationDto[]> {
  const data = await apiRequest<NotificationDto[]>('/notifications', { token })
  return Array.isArray(data) ? data : []
}

export async function markNotificationRead(notificationId: number, token: string): Promise<NotificationDto> {
  return apiRequest<NotificationDto>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  })
}
