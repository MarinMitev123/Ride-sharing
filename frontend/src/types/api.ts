/** Auth */
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  phone?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
  resetLink: string | null
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface AuthResponse {
  token: string
  user: UserDto
}

/** User */
export type UserRole = 'ROLE_DRIVER' | 'ROLE_PASSENGER' | 'ROLE_ADMIN'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED'

export interface UserDto {
  id: number
  email: string
  name: string
  phone: string | null
  role: UserRole
  status: UserStatus
  ratingAverage: number | null
}

/** Rides */
export type RideStatus = 'OPEN' | 'FULL' | 'CANCELED' | 'FINISHED'

export interface RideDto {
  id: number
  driverId: number
  fromCity: string
  toCity: string
  fromLat?: number | null
  fromLng?: number | null
  toLat?: number | null
  toLng?: number | null
  departureTime: string
  availableSeats: number
  price: number
  carDetails: string | null
  status: RideStatus
}

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

/** Ride stops and route validation */
export type StopType = 'START' | 'PICKUP' | 'DROPOFF' | 'END'

export interface RideStopDto {
  id: number
  rideId: number
  name: string | null
  latitude: number
  longitude: number
  stopOrder: number
  type: StopType
}

export interface ValidatePointsResponse {
  valid: boolean
  suggestedPickupLat?: number
  suggestedPickupLng?: number
  suggestedDropoffLat?: number
  suggestedDropoffLng?: number
  message?: string
}

export interface ValidatePointRequest {
  lat: number
  lng: number
  type: 'PICKUP' | 'DROPOFF'
}

export interface ValidatePointResponse {
  valid: boolean
  suggestedLat?: number
  suggestedLng?: number
  message?: string
}

export interface ValidatePointsRequest {
  pickupLat: number
  pickupLng: number
  dropoffLat: number
  dropoffLng: number
  seatsRequested?: number
}

export interface BookRideRequest {
  pickupLat: number
  pickupLng: number
  dropoffLat: number
  dropoffLng: number
  seatsReserved?: number
}

/** Bookings */
export interface BookingDto {
  id: number
  rideId: number
  passengerId: number
  passengerName?: string
  status: string
  fromCity?: string
  toCity?: string
  departureTime?: string
  pickupLat?: number | null
  pickupLng?: number | null
  pickupAddress?: string | null
  pickupNeighborhood?: string | null
  passengerNote?: string | null
}

export interface PickupPoint {
  lat: number
  lng: number
  label?: string
}

/** Chat */
export interface ChatMessageDto {
  id: number
  rideId: number
  senderId: number
  senderName: string
  receiverId: number
  receiverName: string
  content: string
  sentAt: string
}

export interface ChatMessageCreateRequest {
  rideId: number
  receiverId: number
  content: string
}

/** Ratings */
export interface RatingDto {
  id: number
  fromUserId: number
  fromUserName: string
  toUserId: number
  toUserName: string
  rideId: number
  score: number
  comment: string | null
}

export interface RatingCreateRequest {
  toUserId: number
  rideId: number
  score: number
  comment?: string
}

/** Admin */
export interface AdminStatsDto {
  usersCount: number
  ridesCount: number
}

/** Rides paginated */
export interface RidesPageDto {
  content: RideDto[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}
