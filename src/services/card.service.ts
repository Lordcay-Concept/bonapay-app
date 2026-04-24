import { supabase } from './supabase'
import { generateTransactionReference } from '../utils/helpers'

export interface VirtualCard {
  id: string
  card_last_four: string
  card_pan: string
  card_cvv: string
  card_expiry_month: string
  card_expiry_year: string
  card_type: string
  card_limit: number
  spent_today: number
  spent_monthly: number
  is_active: boolean
  is_frozen: boolean
  created_at: string
  expires_at: string
}

export interface CreateCardParams {
  card_type: 'visa' | 'mastercard' | 'verve'
  card_limit: number
}

export class CardService {
  private supabase = supabase;

  /**
   * Generate a mock virtual card number with proper prefixes for each card type
   */
  private generateCardNumber(cardType: 'visa' | 'mastercard' | 'verve'): string {
    const prefixes = {
      visa: '4',
      mastercard: '5',
      verve: '5061', // Verve cards typically start with 5061, 5078, 5080, etc.
    }
    
    const prefix = prefixes[cardType]
    let number = prefix
    
    // Generate remaining digits to reach 16 digits
    const remainingLength = 16 - prefix.length
    for (let i = 0; i < remainingLength; i++) {
      number += Math.floor(Math.random() * 10)
    }
    
    return number
  }

  /**
   * Generate CVV (3 digits for all card types)
   */
  private generateCVV(): string {
    return Math.floor(100 + Math.random() * 900).toString()
  }

  /**
   * Generate expiry date (3 years from now)
   */
  private generateExpiryDate(): { month: string; year: string } {
    const date = new Date()
    date.setFullYear(date.getFullYear() + 3)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return { month, year }
  }

  /**
   * Get card icon based on type
   */
  getCardIcon(cardType: string): string {
    switch (cardType) {
      case 'visa':
        return '💳 Visa'
      case 'mastercard':
        return '💳 Mastercard'
      case 'verve':
        return '🟣 Verve'
      default:
        return '💳 Card'
    }
  }

  /**
   * Get card color based on type
   */
  getCardColor(cardType: string): string {
    switch (cardType) {
      case 'visa':
        return 'from-blue-600 to-blue-400'
      case 'mastercard':
        return 'from-red-600 to-orange-500'
      case 'verve':
        return 'from-purple-600 to-pink-500'
      default:
        return 'from-slate-600 to-slate-400'
    }
  }

  /**
   * Create a new virtual card for a user
   */
  async createCard(userId: string, params: CreateCardParams): Promise<{ success: boolean; data?: VirtualCard; error?: string }> {
    try {
      // Get user's account
      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (accountError || !account) {
        return { success: false, error: 'Account not found' }
      }

      const cardNumber = this.generateCardNumber(params.card_type)
      const cvv = this.generateCVV()
      const { month, year } = this.generateExpiryDate()
      const lastFour = cardNumber.slice(-4)

      // Create virtual card
      const { data: card, error: cardError } = await this.supabase
        .from('virtual_cards')
        .insert({
          user_id: userId,
          account_id: account.id,
          card_last_four: lastFour,
          card_pan: cardNumber,
          card_cvv: cvv,
          card_expiry_month: month,
          card_expiry_year: year,
          card_type: params.card_type,
          card_limit: params.card_limit,
          is_active: true,
          is_frozen: false,
          expires_at: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single()

      if (cardError) throw cardError

      // Log to audit
      await this.logAudit(userId, 'create_card', 'virtual_card', card.id)

      // Create notification
      await this.createCardNotification(userId, lastFour, params.card_type)

      return { success: true, data: card }
    } catch (error: any) {
      console.error('Create card error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all virtual cards for a user
   */
  async getUserCards(userId: string): Promise<VirtualCard[]> {
    const { data, error } = await this.supabase
      .from('virtual_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get cards error:', error)
      return []
    }

    return data || []
  }

  /**
   * Freeze or unfreeze a card
   */
  async toggleCardFreeze(cardId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current card status
      const { data: card, error: getError } = await this.supabase
        .from('virtual_cards')
        .select('is_frozen, card_last_four')
        .eq('id', cardId)
        .eq('user_id', userId)
        .single()

      if (getError || !card) {
        return { success: false, error: 'Card not found' }
      }

      const newStatus = !card.is_frozen

      const { error: updateError } = await this.supabase
        .from('virtual_cards')
        .update({ is_frozen: newStatus })
        .eq('id', cardId)
        .eq('user_id', userId)

      if (updateError) throw updateError

      // Log to audit
      await this.logAudit(userId, newStatus ? 'freeze_card' : 'unfreeze_card', 'virtual_card', cardId)

      // Create notification
      await this.createCardStatusNotification(userId, card.card_last_four || '****', newStatus)

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Update card spending limit
   */
  async updateCardLimit(cardId: string, userId: string, newLimit: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('virtual_cards')
        .update({ card_limit: newLimit })
        .eq('id', cardId)
        .eq('user_id', userId)

      if (error) throw error

      await this.logAudit(userId, 'update_card_limit', 'virtual_card', cardId, { new_limit: newLimit })

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete/Block a virtual card
   */
  async deleteCard(cardId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('virtual_cards')
        .update({ is_active: false })
        .eq('id', cardId)
        .eq('user_id', userId)

      if (error) throw error

      await this.logAudit(userId, 'delete_card', 'virtual_card', cardId)

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Create notification for card creation
   */
  private async createCardNotification(userId: string, lastFour: string, cardType: string) {
    const cardTypeName = cardType === 'verve' ? 'Verve' : cardType === 'visa' ? 'Visa' : 'Mastercard'
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'New Virtual Card Created',
        message: `Your ${cardTypeName} card ending in ${lastFour} has been created successfully.`,
        type: 'transaction',
        metadata: { card_last_four: lastFour, card_type: cardType, action: 'card_created' },
      })
  }

  /**
   * Create notification for card freeze/unfreeze
   */
  private async createCardStatusNotification(userId: string, lastFour: string, isFrozen: boolean) {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: isFrozen ? 'Card Frozen' : 'Card Unfrozen',
        message: isFrozen 
          ? `Your card ending in ${lastFour} has been frozen. You won't be able to make transactions until you unfreeze it.`
          : `Your card ending in ${lastFour} has been unfrozen and is now active.`,
        type: 'security',
        metadata: { card_last_four: lastFour, action: isFrozen ? 'card_frozen' : 'card_unfrozen' },
      })
  }

  /**
   * Log audit trail
   */
  private async logAudit(userId: string, action: string, entityType: string, entityId: string, newData?: any) {
    await this.supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        new_data: newData,
        ip_address: '127.0.0.1',
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
      })
  }
}

export const cardService = new CardService()