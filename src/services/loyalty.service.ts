import { supabase } from './supabase'
import { generateTransactionReference } from '../utils/helpers'

export interface LoyaltyPoints {
  user_id: string
  points: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  total_points_earned: number
  total_points_redeemed: number
  created_at: string
  updated_at: string
}

export interface LoyaltyTransaction {
  id: string
  user_id: string
  points: number
  type: 'earned' | 'redeemed'
  source: string
  description: string
  reference: string
  created_at: string
}

export interface Reward {
  id: string
  name: string
  description: string
  points_required: number
  type: 'cashback' | 'voucher' | 'gift_card' | 'fee_waiver'
  value: number
  is_active: boolean
  expires_at: string | null
  created_at: string
}

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 5000,
  gold: 20000,
  platinum: 50000,
}

const TIER_MULTIPLIERS = {
  bronze: 1,
  silver: 1.5,
  gold: 2,
  platinum: 3,
}

export class LoyaltyService {
  private supabase = supabase;

  /**
   * Get user's loyalty points
   */
  async getUserPoints(userId: string): Promise<LoyaltyPoints | null> {
    const { data, error } = await this.supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') return null
    return data
  }

  /**
   * Initialize loyalty points for new user
   */
  async initializePoints(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('loyalty_points')
      .insert({
        user_id: userId,
        points: 0,
        tier: 'bronze',
        total_points_earned: 0,
        total_points_redeemed: 0,
      })

    if (error) console.error('Failed to initialize loyalty points:', error)
  }

  /**
   * Add points to user (when they perform transactions)
   */
  async addPoints(
    userId: string,
    points: number,
    source: string,
    description: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current points
      const { data: current, error: getError } = await this.supabase
        .from('loyalty_points')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (getError && getError.code === 'PGRST116') {
        await this.initializePoints(userId)
      }

      const newPoints = (current?.points || 0) + points
      const newTotalEarned = (current?.total_points_earned || 0) + points
      const newTier = this.calculateTier(newTotalEarned)

      // Update points
      const { error: updateError } = await this.supabase
        .from('loyalty_points')
        .update({
          points: newPoints,
          tier: newTier,
          total_points_earned: newTotalEarned,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (updateError) throw updateError

      // Record transaction
      await this.supabase
        .from('loyalty_transactions')
        .insert({
          user_id: userId,
          points,
          type: 'earned',
          source,
          description,
          reference: generateTransactionReference(),
        })

      // Send notification
      await this.createLoyaltyNotification(userId, points, 'earned')

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Redeem points for rewards
   */
  async redeemPoints(
    userId: string,
    rewardId: string,
    pointsToRedeem: number
  ): Promise<{ success: boolean; reward?: Reward; error?: string }> {
    try {
      // Get reward details
      const { data: reward, error: rewardError } = await this.supabase
        .from('rewards')
        .select('*')
        .eq('id', rewardId)
        .eq('is_active', true)
        .single()

      if (rewardError || !reward) {
        return { success: false, error: 'Reward not found' }
      }

      // Check if user has enough points
      const { data: points, error: pointsError } = await this.supabase
        .from('loyalty_points')
        .select('points')
        .eq('user_id', userId)
        .single()

      if (pointsError || !points) {
        return { success: false, error: 'User points not found' }
      }

      if (points.points < reward.points_required) {
        return { success: false, error: 'Insufficient points' }
      }

      const newPoints = points.points - reward.points_required
      const newTotalRedeemed = (points.total_points_redeemed || 0) + reward.points_required

      // Deduct points
      const { error: updateError } = await this.supabase
        .from('loyalty_points')
        .update({
          points: newPoints,
          total_points_redeemed: newTotalRedeemed,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (updateError) throw updateError

      // Record redemption transaction
      await this.supabase
        .from('loyalty_transactions')
        .insert({
          user_id: userId,
          points: reward.points_required,
          type: 'redeemed',
          source: 'reward',
          description: `Redeemed: ${reward.name}`,
          reference: generateTransactionReference(),
          metadata: { reward_id: rewardId },
        })

      // Process reward payout
      await this.processRewardPayout(userId, reward)

      // Send notification
      await this.createLoyaltyNotification(userId, reward.points_required, 'redeemed', reward.name)

      return { success: true, reward }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Process reward payout (cashback, etc.)
   */
  private async processRewardPayout(userId: string, reward: Reward): Promise<void> {
    if (reward.type === 'cashback') {
      // Add cashback to user's account
      const { data: account } = await this.supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (account) {
        const newBalance = account.balance + reward.value
        await this.supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('user_id', userId)

        // Create transaction record
        await this.supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'credit',
            category: 'reward',
            amount: reward.value,
            description: `Reward: ${reward.name}`,
            reference: generateTransactionReference(),
            status: 'completed',
          })
      }
    }
  }

  /**
   * Get all available rewards
   */
  async getRewards(): Promise<Reward[]> {
    const { data, error } = await this.supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_required', { ascending: true })

    if (error) return []
    return data || []
  }

  /**
   * Get user's loyalty transactions
   */
  async getLoyaltyTransactions(userId: string): Promise<LoyaltyTransaction[]> {
    const { data, error } = await this.supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return []
    return data || []
  }

  /**
   * Calculate user tier based on total points earned
   */
  private calculateTier(totalPoints: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (totalPoints >= TIER_THRESHOLDS.platinum) return 'platinum'
    if (totalPoints >= TIER_THRESHOLDS.gold) return 'gold'
    if (totalPoints >= TIER_THRESHOLDS.silver) return 'silver'
    return 'bronze'
  }

  /**
   * Get points multiplier based on tier
   */
  getPointsMultiplier(tier: string): number {
    return TIER_MULTIPLIERS[tier as keyof typeof TIER_MULTIPLIERS] || 1
  }

  /**
   * Calculate points for a transaction amount
   */
  calculatePoints(amount: number, tier: string): number {
    const multiplier = this.getPointsMultiplier(tier)
    // 1 point per ₦100 spent
    return Math.floor(amount / 100) * multiplier
  }

  private async createLoyaltyNotification(
    userId: string,
    points: number,
    type: 'earned' | 'redeemed',
    rewardName?: string
  ) {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: type === 'earned' ? 'Loyalty Points Earned! 🎉' : 'Reward Redeemed!',
        message: type === 'earned'
          ? `You earned ${points} loyalty points! Keep transacting to earn more.`
          : `You redeemed ${points} points for ${rewardName}. Thank you for being a loyal customer!`,
        type: 'promotion',
      })
  }
}

export const loyaltyService = new LoyaltyService()