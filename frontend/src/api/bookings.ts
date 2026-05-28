import { apiRequest } from './client'
import type { BookingDto, CreateCheckoutSessionResponse } from '../types/api'

export async function getBookingsForRide(rideId: number, token: string): Promise<BookingDto[]> {
  const data = await apiRequest<BookingDto[]>(`/rides/${rideId}/bookings`, { token })
  return Array.isArray(data) ? data : []
}

export async function getMyBookings(token: string): Promise<BookingDto[]> {
  const data = await apiRequest<BookingDto[]>('/bookings/my', { token })
  return Array.isArray(data) ? data : []
}

export async function getPendingBookingsForDriver(token: string): Promise<BookingDto[]> {
  const data = await apiRequest<BookingDto[]>('/bookings/pending-for-driver', { token })
  return Array.isArray(data) ? data : []
}

export async function getActiveBookingsForDriver(token: string): Promise<BookingDto[]> {
  const data = await apiRequest<BookingDto[]>('/bookings/active-for-driver', { token })
  return Array.isArray(data) ? data : []
}

export async function createBooking(rideId: number, token: string): Promise<BookingDto> {
  return apiRequest<BookingDto>('/bookings', {
    method: 'POST',
    body: JSON.stringify({ rideId }),
    token,
  })
}

export async function setPickupLocation(
  bookingId: number,
  lat: number,
  lng: number,
  address: string,
  token: string,
  options?: { pickupNeighborhood?: string | null; passengerNote?: string | null }
): Promise<BookingDto> {
  return apiRequest<BookingDto>(`/bookings/${bookingId}/pickup`, {
    method: 'PATCH',
    body: JSON.stringify({
      pickupLat: lat,
      pickupLng: lng,
      pickupAddress: address || null,
      pickupNeighborhood: options?.pickupNeighborhood ?? null,
      passengerNote: options?.passengerNote ?? null,
    }),
    token,
  })
}

export async function approveBooking(bookingId: number, token: string): Promise<BookingDto> {
  return apiRequest<BookingDto>(`/bookings/${bookingId}/approve`, {
    method: 'PATCH',
    token,
  })
}

export async function rejectBooking(bookingId: number, token: string): Promise<BookingDto> {
  return apiRequest<BookingDto>(`/bookings/${bookingId}/reject`, {
    method: 'PATCH',
    token,
  })
}

export async function cancelBooking(bookingId: number, token: string): Promise<void> {
  await apiRequest<void>(`/bookings/${bookingId}`, {
    method: 'DELETE',
    token,
  })
}

export async function removePassengerByDriver(bookingId: number, token: string): Promise<void> {
  await apiRequest<void>(`/bookings/${bookingId}/remove`, {
    method: 'PATCH',
    token,
  })
}

export async function createCheckoutSession(
  bookingId: number,
  token: string,
  frontendOrigin: string | undefined = typeof window !== 'undefined' ? window.location.origin : undefined
): Promise<CreateCheckoutSessionResponse> {
  return apiRequest<CreateCheckoutSessionResponse>('/payments/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({
      bookingId,
      ...(frontendOrigin ? { frontendOrigin } : {}),
    }),
    token,
  })
}

export async function markBookingCashPaid(bookingId: number, token: string): Promise<BookingDto> {
  return apiRequest<BookingDto>(`/bookings/${bookingId}/mark-cash-paid`, {
    method: 'PATCH',
    token,
  })
}
