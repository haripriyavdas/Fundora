import type {
  ForgotBody,
  GoogleAuthBody,
  LoginBody,
  MeResponse,
  RegisterBody,
  ResetBody,
  UserResponse,
} from '@shared/schemas'
import { apiGet, apiPost } from '@/lib/api'

export const register = (body: RegisterBody) => apiPost<UserResponse>('/auth/register', body)
export const login = (body: LoginBody) => apiPost<UserResponse>('/auth/login', body)
export const googleSignIn = (body: GoogleAuthBody) => apiPost<UserResponse>('/auth/google', body)
export const logout = () => apiPost<void>('/auth/logout')
export const verifyEmail = (token: string) => apiPost<UserResponse>('/auth/verify', { token })
export const resendVerification = () => apiPost<void>('/auth/resend-verification')
export const forgotPassword = (body: ForgotBody) => apiPost<{ ok: true }>('/auth/forgot', body)
export const resetPassword = (body: ResetBody) => apiPost<void>('/auth/reset', body)
export const getMe = () => apiGet<MeResponse>('/me')
