import type { AuthResponse, LoginRequest, RegisterRequest, ChangePasswordRequest } from '../types/api'
import { apiRequest } from './client'

export async function login(body: LoginRequest, token?: string | null): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function register(body: RegisterRequest, token?: string | null): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function changePassword(
  body: ChangePasswordRequest,
  token: string
): Promise<void> {
  return apiRequest<void>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}
