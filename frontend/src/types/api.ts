export type UserRole = 'ROLE_PASSENGER' | 'ROLE_DRIVER' | 'ROLE_ADMIN'
export type UserStatus = 'ACTIVE' | 'BLOCKED'

export interface UserDto {
  id: number
  email: string
  name: string
  phone?: string
  role: UserRole
  status: UserStatus
  ratingAverage?: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  phone?: string
  role?: UserRole
}

export interface AuthResponse {
  token: string
  user: UserDto
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface RideDto {
  id: number
  driverId: number
  fromCity: string
  toCity: string
  fromLat?: number
  fromLng?: number
  toLat?: number
  toLng?: number
  departureTime: string
  availableSeats: number
  price: number
  carDetails?: string
  status: string
}

/** За създаване на пътуване – дата/час в ISO формат (напр. 2025-02-15T10:00) */
export interface RideCreateRequest {
  fromCity: string
  toCity: string
  fromLat?: number
  fromLng?: number
  toLat?: number
  toLng?: number
  departureTime: string
  availableSeats: number
  price: number
  carDetails?: string
}

export interface BookingDto {
  id: number
  rideId: number
  passengerId: number
  passengerName?: string
  status: string
  fromCity?: string
  toCity?: string
  departureTime?: string
  pickupLat?: number
  pickupLng?: number
  pickupAddress?: string
}

export interface PickupPoint {
  lat: number
  lng: number
  label?: string
}
