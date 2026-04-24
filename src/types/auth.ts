import { User } from '@supabase/supabase-js'

export interface AuthUser extends User {
  user_metadata: {
    full_name?: string
    phone?: string
    tier?: number
  }
}

export interface LoginCredentials {
  email: string
  password: string
  twoFactorCode?: string
}

export interface SignupData {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export interface TwoFactorSetup {
  secret: string
  qrCode: string
  recoveryCodes: string[]
}

export interface Session {
  user: AuthUser
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
}

export interface AuthResponse {
  success: boolean
  data?: Session
  error?: string
  requiresTwoFactor?: boolean
}