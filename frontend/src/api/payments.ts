import { apiRequest } from './client'
import type { BookingDto } from '../types/api'

export async function confirmCheckoutSession(sessionId: string, token: string): Promise<BookingDto> {
  return apiRequest<BookingDto>('/payments/confirm-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
    token,
  })
}
