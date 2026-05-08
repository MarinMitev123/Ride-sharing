import { apiRequest } from './client'
import type { ConversationDto, MessageCreateRequest, MessageDto } from '../types/api'

export async function getConversations(token: string): Promise<ConversationDto[]> {
  const data = await apiRequest<ConversationDto[]>('/conversations', { token })
  return Array.isArray(data) ? data : []
}

export async function getConversationMessages(
  conversationId: number,
  token: string
): Promise<MessageDto[]> {
  const data = await apiRequest<MessageDto[]>(`/conversations/${conversationId}/messages`, { token })
  return Array.isArray(data) ? data : []
}

export async function sendConversationMessage(
  conversationId: number,
  body: MessageCreateRequest,
  token: string
): Promise<MessageDto> {
  return apiRequest<MessageDto>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

// Compatibility wrapper for RideDetail legacy chat flow.
export async function getConversation(
  rideId: number,
  otherUserId: number,
  token: string
): Promise<MessageDto[]> {
  const conversations = await getConversations(token)
  const conversation = conversations.find(
    (c) => c.ride.id === rideId && c.otherUser.id === otherUserId
  )
  if (!conversation) return []
  return getConversationMessages(conversation.id, token)
}

// Compatibility wrapper for ride detail chat composer.
export async function sendMessage(
  body: { rideId: number; receiverId: number; content: string },
  token: string
): Promise<MessageDto> {
  const conversations = await getConversations(token)
  const conversation = conversations.find(
    (c) => c.ride.id === body.rideId && c.otherUser.id === body.receiverId
  )
  if (!conversation) {
    throw new Error('Conversation not found for this ride and user')
  }
  return sendConversationMessage(conversation.id, { content: body.content }, token)
}
