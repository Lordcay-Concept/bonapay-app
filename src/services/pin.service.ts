import { supabase } from './supabase'
import { createHash } from 'crypto'

export class PinService {
  private supabase = supabase;

  /**
   * Hash PIN for storage
   */
  private hashPin(pin: string): string {
    return createHash('sha256').update(pin).digest('hex')
  }

  /**
   * Set transaction PIN for user
   */
  async setTransactionPin(
    userId: string,
    pin: string,
    confirmPin: string
  ): Promise<{ success: boolean; error?: string }> {
    if (pin !== confirmPin) {
      return { success: false, error: 'PINs do not match' }
    }

    if (!/^\d{4}$/.test(pin)) {
      return { success: false, error: 'PIN must be 4 digits' }
    }

    try {
      const hashedPin = this.hashPin(pin)
      const { error } = await this.supabase
        .from('profiles')
        .update({
          transaction_pin: hashedPin,
          transaction_pin_enabled: true,
          transaction_pin_attempts: 0,
        })
        .eq('id', userId)

      if (error) throw error

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Verify transaction PIN
   */
  async verifyPin(userId: string, pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('transaction_pin, transaction_pin_enabled, transaction_pin_attempts, transaction_pin_locked_until')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (!profile?.transaction_pin_enabled) {
        return { success: true } // PIN not required
      }

      // Check if locked
      if (profile.transaction_pin_locked_until) {
        const lockedUntil = new Date(profile.transaction_pin_locked_until)
        if (lockedUntil > new Date()) {
          return {
            success: false,
            error: `PIN locked. Try again after ${lockedUntil.toLocaleTimeString()}`,
          }
        }
      }

      const hashedPin = this.hashPin(pin)
      const isValid = profile.transaction_pin === hashedPin

      if (!isValid) {
        const newAttempts = (profile.transaction_pin_attempts || 0) + 1
        const updates: any = { transaction_pin_attempts: newAttempts }

        // Lock after 5 failed attempts
        if (newAttempts >= 5) {
          const lockUntil = new Date()
          lockUntil.setMinutes(lockUntil.getMinutes() + 30)
          updates.transaction_pin_locked_until = lockUntil.toISOString()
        }

        await this.supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)

        return { success: false, error: 'Invalid PIN' }
      }

      // Reset attempts on success
      await this.supabase
        .from('profiles')
        .update({ transaction_pin_attempts: 0 })
        .eq('id', userId)

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Change transaction PIN
   */
  async changePin(
    userId: string,
    oldPin: string,
    newPin: string,
    confirmNewPin: string
  ): Promise<{ success: boolean; error?: string }> {
    const verifyResult = await this.verifyPin(userId, oldPin)
    if (!verifyResult.success) {
      return verifyResult
    }

    if (newPin !== confirmNewPin) {
      return { success: false, error: 'New PINs do not match' }
    }

    if (!/^\d{4}$/.test(newPin)) {
      return { success: false, error: 'PIN must be 4 digits' }
    }

    const hashedPin = this.hashPin(newPin)
    const { error } = await this.supabase
      .from('profiles')
      .update({ transaction_pin: hashedPin })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Disable transaction PIN
   */
  async disablePin(userId: string, pin: string): Promise<{ success: boolean; error?: string }> {
    const verifyResult = await this.verifyPin(userId, pin)
    if (!verifyResult.success) {
      return verifyResult
    }

    const { error } = await this.supabase
      .from('profiles')
      .update({
        transaction_pin: null,
        transaction_pin_enabled: false,
      })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }
}

export const pinService = new PinService()