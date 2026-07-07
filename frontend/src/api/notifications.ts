import { apiRequest } from './client'
import type { NotificationDto } from '../types/api'

function normalizeNotification(raw: NotificationDto & { read?: boolean }): NotificationDto {
  return {
    ...raw,
    isRead: raw.isRead ?? raw.read ?? false,
  }
}

export async function getNotifications(token: string): Promise<NotificationDto[]> {
  const data = await apiRequest<(NotificationDto & { read?: boolean })[]>('/notifications', { token })
  return Array.isArray(data) ? data.map(normalizeNotification) : []
}

export async function markNotificationRead(notificationId: number, token: string): Promise<NotificationDto> {
  const data = await apiRequest<NotificationDto & { read?: boolean }>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  })
  return normalizeNotification(data)
}
