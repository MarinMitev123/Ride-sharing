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
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface MessageResponse {
  message: string
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
  iban?: string | null
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
  fromDistrict?: string | null
  toCity: string
  toDistrict?: string | null
  cardPaymentAvailable?: boolean
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
  fromDistrict?: string
  toCity: string
  toDistrict?: string
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

export interface DriverLocationDto {
  rideId: number
  driverId: number
  targetPassengerId: number
  latitude: number
  longitude: number
  isActive: boolean
  updatedAt: string
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
  paymentMethod?: 'CASH' | 'CARD'
}

/** Bookings */
export interface BookingDto {
  id: number
  rideId: number
  passengerId: number
  passengerName?: string
  status: string
  paymentMethod?: 'CASH' | 'CARD'
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CASH_ON_RIDE'
  paymentReference?: string | null
  fromCity?: string
  toCity?: string
  departureTime?: string
  pickupLat?: number | null
  pickupLng?: number | null
  pickupAddress?: string | null
  pickupNeighborhood?: string | null
  passengerNote?: string | null
  pickupStopId?: number | null
  dropoffStopId?: number | null
  seatsReserved?: number | null
}

export interface CreateCheckoutSessionResponse {
  sessionId: string
}

export type NotificationType = 'BOOKING_REQUEST' | 'BOOKING_APPROVED' | 'BOOKING_REJECTED' | 'PAYMENT_REQUIRED'

export interface NotificationDto {
  id: number
  recipientUserId: number
  type: NotificationType
  title: string
  message: string
  bookingId?: number | null
  rideId?: number | null
  isRead: boolean
  createdAt: string
}

export interface PickupPoint {
  lat: number
  lng: number
  label?: string
}

/** Chat */
export interface ConversationDto {
  id: number
  createdAt: string
  otherUser: {
    id: number
    firstName?: string | null
    lastName?: string | null
    username: string
  }
  ride: {
    id: number
    origin: string
    destination: string
    departureTime: string
  }
}

export interface MessageDto {
  id: number
  conversationId: number
  senderId: number
  senderName?: string
  content: string
  createdAt: string
}

export interface MessageCreateRequest {
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
