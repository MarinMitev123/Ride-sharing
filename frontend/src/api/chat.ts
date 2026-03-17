import { apiRequest } from './client'
import type { ChatMessageDto, ChatMessageCreateRequest } from '../types/api'

export async function getMessagesForRide(
  rideId: number,
  token: string
): Promise<ChatMessageDto[]> {
  const data = await apiRequest<ChatMessageDto[]>(`/chat/ride/${rideId}`, { token })
  return Array.isArray(data) ? data : []
}

export async function getConversation(
  rideId: number,
  otherUserId: number,
  token: string
): Promise<ChatMessageDto[]> {
  const data = await apiRequest<ChatMessageDto[]>(
    `/chat/ride/${rideId}/with/${otherUserId}`,
    { token }
  )
  return Array.isArray(data) ? data : []
}

export async function sendMessage(
  body: ChatMessageCreateRequest,
  token: string
): Promise<ChatMessageDto> {
  return apiRequest<ChatMessageDto>('/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}
