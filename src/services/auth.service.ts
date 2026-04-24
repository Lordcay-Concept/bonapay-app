import { supabase } from './supabase'
import { LoginCredentials, SignupData, TwoFactorSetup, AuthResponse } from '../types/auth'
import { generateAccountNumber } from '../utils/helpers'
import { createAuthenticator } from '../services/totp'
import { loginAlertsService, DeviceInfo } from '../services/login-alerts.service'
// import { createAdminClient } from '@/lib/supabase/admin'

export class AuthService {
  private supabase = supabase;

  /**
   * Sign up a new user
   */
  async signUp(data: SignupData): Promise<AuthResponse> {
    try {
      // Create user in Supabase Auth - profile will be auto-created by trigger
      const { data: authData, error: signUpError } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone,
            tier: 1,
          },
        },
      })

      if (signUpError) throw signUpError

      if (authData.user) {
        // The trigger will automatically create profile and account
        // Just wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create welcome notification
        await this.createWelcomeNotification(authData.user.id)

        return {
          success: true,
          data: {
            user: authData.user as any,
            session: authData.session as any,
          },
        }
      }

      return { success: false, error: 'Failed to create account' }
    } catch (error: any) {
      console.error('Signup error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials, request?: Request): Promise<AuthResponse> {
    try {
      // First, check if user exists and is not locked
      const { data: userData } = await this.supabase
        .from('profiles')
        .select('account_locked, account_locked_until, failed_login_attempts, id')
        .eq('email', credentials.email)
        .single()

      if (userData) {
        // Check if account is locked
        if (userData.account_locked) {
          const lockedUntil = new Date(userData.account_locked_until)
          if (lockedUntil > new Date()) {
            return {
              success: false,
              error: `Account locked. Try again after ${lockedUntil.toLocaleTimeString()}`,
            }
          } else {
            // Unlock account if lock period has passed
            await this.supabase
              .from('profiles')
              .update({ account_locked: false, failed_login_attempts: 0 })
              .eq('email', credentials.email)
          }
        }
      }

      // Attempt login
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        // Increment failed login attempts
        if (userData) {
          const newAttempts = (userData.failed_login_attempts || 0) + 1
          const updates: any = { failed_login_attempts: newAttempts }
          
          // Lock account after 5 failed attempts
          if (newAttempts >= 5) {
            updates.account_locked = true
            updates.account_locked_until = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          }
          
          await this.supabase.from('profiles').update(updates).eq('email', credentials.email)
        }
        
        return { success: false, error: error.message }
      }

      // Reset failed login attempts on successful login
      await this.supabase
        .from('profiles')
        .update({ 
          failed_login_attempts: 0,
          last_login_at: new Date().toISOString(),
          last_login_ip: await this.getClientIP(),
        })
        .eq('id', data.user.id)

      // Check if 2FA is enabled
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', data.user.id)
        .single()

      if (profile?.two_factor_enabled && !credentials.twoFactorCode) {
        return {
          success: true,
          requiresTwoFactor: true,
          data: {
            user: data.user as any,
            session: data.session as any,
          },
        }
      }

      // If 2FA code provided, verify it
      if (profile?.two_factor_enabled && credentials.twoFactorCode) {
        const isValid = await this.verifyTwoFactorCode(data.user.id, credentials.twoFactorCode)
        if (!isValid) {
          return { success: false, error: 'Invalid 2FA code' }
        }
      }

      // Handle login alerts for new devices
      if (request) {
        await this.handleLoginAlerts(data.user.id, request)
      }

      // Log successful login to audit
      await this.logAudit(data.user.id, 'login', 'user', data.user.id, null, {
        ip: await this.getClientIP(),
      })

      return {
        success: true,
        data: {
          user: data.user as any,
          session: data.session as any,
        },
      }
    } catch (error: any) {
      console.error('Login error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Handle login alerts for new device detection
   */
  private async handleLoginAlerts(userId: string, request: Request): Promise<void> {
    try {
      // Get device information from request
      const userAgent = request.headers.get('user-agent') || 'unknown'
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
      
      // Parse user agent
      const parsedDevice = loginAlertsService.parseUserAgent(userAgent)
      
      // Get location from IP (simplified for now)
      const location = await this.getLocationFromIP(ipAddress as string)
      
      // Create device info
      const deviceInfo: DeviceInfo = {
        userAgent,
        ipAddress: ipAddress as string,
        deviceType: parsedDevice.deviceType || 'unknown',
        browser: parsedDevice.browser,
        os: parsedDevice.os,
        location,
      }
      
      // Generate device fingerprint
      const fingerprint = loginAlertsService.generateDeviceFingerprint(deviceInfo)
      
      // Check if device is known
      const isKnown = await loginAlertsService.isKnownDevice(userId, fingerprint)
      
      if (!isKnown) {
        // Register new device
        await loginAlertsService.registerDevice(userId, fingerprint, deviceInfo)
        
        // Send new device alert
        await loginAlertsService.sendLoginAlert(userId, deviceInfo, 'new_device')
      } else {
        // Update last seen
        await loginAlertsService.updateDeviceLastSeen(userId, fingerprint)
      }
    } catch (error) {
      console.error('Error handling login alerts:', error)
      // Don't block login if alerts fail
    }
  }

  /**
   * Get location from IP address
   */
  private async getLocationFromIP(ip: string): Promise<string> {
    try {
      // In production, use a proper IP geolocation service
      // For now, return a placeholder
      return 'Location unknown'
    } catch (error) {
      return 'Location unknown'
    }
  }

  /**
   * Setup 2FA for user
   */
  async setupTwoFactor(userId: string): Promise<TwoFactorSetup | null> {
    try {
      const authenticator = createAuthenticator()
      const secret = authenticator.generateSecret()
      const qrCode = await authenticator.generateQRCode(secret, 'BonaPay')
      const recoveryCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      )

      // Store secret temporarily (will be verified before enabling)
      await this.supabase
        .from('profiles')
        .update({ 
          two_factor_secret: secret,
        })
        .eq('id', userId)

      return {
        secret,
        qrCode,
        recoveryCodes,
      }
    } catch (error) {
      console.error('2FA setup error:', error)
      return null
    }
  }

  /**
   * Enable 2FA for user after verification
   */
  async enableTwoFactor(userId: string, code: string): Promise<AuthResponse> {
    try {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('two_factor_secret')
        .eq('id', userId)
        .single()

      if (!profile?.two_factor_secret) {
        return { success: false, error: '2FA not set up' }
      }

      const authenticator = createAuthenticator()
      const isValid = authenticator.verify(profile.two_factor_secret, code)

      if (!isValid) {
        return { success: false, error: 'Invalid verification code' }
      }

      // Enable 2FA
      await this.supabase
        .from('profiles')
        .update({ 
          two_factor_enabled: true,
        })
        .eq('id', userId)

      await this.logAudit(userId, 'enable_2fa', 'user', userId)

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Verify 2FA code
   */
  async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
    try {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('two_factor_secret')
        .eq('id', userId)
        .single()

      if (!profile?.two_factor_secret) {
        return false
      }

      const authenticator = createAuthenticator()
      return authenticator.verify(profile.two_factor_secret, code)
    } catch (error) {
      console.error('2FA verification error:', error)
      return false
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await this.supabase.auth.signOut()
  }

  /**
   * Get current session
   */
  async getSession() {
    const { data: { session } } = await this.supabase.auth.getSession()
    return session
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser()
    return user
  }

  /**
   * Create welcome notification for new user
   */
  private async createWelcomeNotification(userId: string) {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Welcome to BonaPay! 🎉',
        message: 'Thank you for joining us. Start your financial journey today.',
        type: 'system',
        metadata: { action: 'onboarding' },
      })
  }

  /**
   * Log audit trail
   */
  private async logAudit(
    userId: string, 
    action: string, 
    entityType: string, 
    entityId: string,
    oldData?: any,
    newData?: any
  ) {
    await this.supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_data: oldData,
        new_data: newData,
        ip_address: await this.getClientIP(),
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
      })
  }

  /**
   * Get client IP (simplified for demo)
   */
  private async getClientIP(): Promise<string> {
    // In production, you'd get this from the request headers
    return '127.0.0.1'
  }
}

export const authService = new AuthService()