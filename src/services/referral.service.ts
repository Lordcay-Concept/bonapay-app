import { supabase } from './supabase'
import { generateTransactionReference } from '../utils/helpers'

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  status: 'pending' | 'completed' | 'expired'
  reward_amount: number
  created_at: string
  completed_at?: string
}

export interface ReferralStats {
  total_referrals: number
  completed_referrals: number
  pending_referrals: number
  total_earned: number
  referral_code: string
}

export interface ReferredUser {
  id: string
  full_name: string
  email: string
  created_at: string
  status: string
  reward_amount: number
  completed_at?: string
}

export class ReferralService {
  private supabase = supabase;

  /**
   * Generate unique referral code for user
   */
  async generateReferralCode(userId: string): Promise<string> {
    // Check if user already has a referral code
    const { data: existing } = await this.supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .single()

    if (existing?.referral_code) {
      return existing.referral_code
    }

    // Generate unique code
    const code = await this.generateUniqueCode()
    
    await this.supabase
      .from('profiles')
      .update({ referral_code: code })
      .eq('id', userId)

    return code
  }

  private async generateUniqueCode(): Promise<string> {
    const prefix = 'REF'
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const code = `${prefix}${random}`
    
    // Check if code exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('referral_code', code)
      .single()
    
    if (existing) {
      return this.generateUniqueCode()
    }
    
    return code
  }

  /**
   * Process referral when new user signs up
   */
  async processReferral(referralCode: string, newUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find referrer
      const { data: referrer, error: referrerError } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode)
        .single()

      if (referrerError || !referrer) {
        return { success: false, error: 'Invalid referral code' }
      }

      if (referrer.id === newUserId) {
        return { success: false, error: 'Cannot refer yourself' }
      }

      // Check if already referred
      const { data: existing } = await this.supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', newUserId)
        .single()

      if (existing) {
        return { success: false, error: 'User already referred' }
      }

      // Create referral record
      const rewardAmount = 1000
      const { error: referralError } = await this.supabase
        .from('referrals')
        .insert({
          referrer_id: referrer.id,
          referred_id: newUserId,
          reward_amount: rewardAmount,
          status: 'pending',
        })

      if (referralError) throw referralError

      return { success: true }
    } catch (error: any) {
      console.error('Process referral error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Complete referral when referred user completes first transaction
   */
  async completeReferral(referredUserId: string): Promise<void> {
    const { data: referral, error } = await this.supabase
      .from('referrals')
      .select('*')
      .eq('referred_id', referredUserId)
      .eq('status', 'pending')
      .single()

    if (error || !referral) return

    // Update referral status
    await this.supabase
      .from('referrals')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', referral.id)

    // Add reward to referrer's account
    const { data: referrerAccount } = await this.supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', referral.referrer_id)
      .single()

    if (referrerAccount) {
      const newBalance = referrerAccount.balance + referral.reward_amount
      await this.supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', referral.referrer_id)

      // Create transaction record
      await this.supabase
        .from('transactions')
        .insert({
          user_id: referral.referrer_id,
          type: 'credit',
          category: 'referral',
          amount: referral.reward_amount,
          description: 'Referral Bonus',
          reference: generateTransactionReference(),
          status: 'completed',
        })

      // Send notification
      await this.createReferralNotification(referral.referrer_id, referral.reward_amount, 'completed')
    }
  }

  /**
   * Get user's referral stats
   */
  async getReferralStats(userId: string): Promise<ReferralStats> {
    const code = await this.generateReferralCode(userId)

    const { data: referrals, error } = await this.supabase
      .from('referrals')
      .select('status, reward_amount')
      .eq('referrer_id', userId)

    if (error) {
      console.error('Error fetching referrals:', error)
      return {
        total_referrals: 0,
        completed_referrals: 0,
        pending_referrals: 0,
        total_earned: 0,
        referral_code: code,
      }
    }

    const completed = referrals?.filter(r => r.status === 'completed') || []
    const pending = referrals?.filter(r => r.status === 'pending') || []
    const totalEarned = completed.reduce((sum, r) => sum + (r.reward_amount || 0), 0)

    return {
      total_referrals: referrals?.length || 0,
      completed_referrals: completed.length,
      pending_referrals: pending.length,
      total_earned: totalEarned,
      referral_code: code,
    }
  }

  /**
   * Get referred users - Simplified query without complex joins
   */
  async getReferredUsers(userId: string): Promise<ReferredUser[]> {
    // First get referrals
    const { data: referrals, error } = await this.supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching referrals:', error)
      return []
    }

    if (!referrals || referrals.length === 0) {
      return []
    }

    // Then get profile data for each referred user
    const referredUsers: ReferredUser[] = []
    
    for (const ref of referrals) {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('full_name, email, created_at')
        .eq('id', ref.referred_id)
        .single()

      if (profile) {
        referredUsers.push({
          id: ref.id,
          full_name: profile.full_name || 'Anonymous',
          email: profile.email,
          created_at: profile.created_at,
          status: ref.status,
          reward_amount: ref.reward_amount,
          completed_at: ref.completed_at,
        })
      }
    }

    return referredUsers
  }

  private async createReferralNotification(userId: string, amount: number, type: string) {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: type === 'completed' ? 'Referral Bonus Received!' : 'New Referral!',
        message: type === 'completed'
          ? `You earned ₦${amount.toLocaleString()} referral bonus!`
          : 'Someone signed up using your referral link!',
        type: 'promotion',
      })
  }
}

export const referralService = new ReferralService()