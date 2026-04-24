import { supabase } from './supabase'
import { generateTransactionReference } from '../utils/helpers'

export interface SavingsProduct {
  id: string
  name: string
  description: string
  interest_rate: number
  minimum_balance: number
  duration_days: number | null
  is_active: boolean
}

export interface UserSavings {
  id: string
  product_id: string
  product_name: string
  balance: number
  interest_accrued: number
  start_date: string
  maturity_date: string | null
  status: 'active' | 'matured' | 'withdrawn' | 'cancelled'
  interest_rate: number
}

export interface CreateSavingsParams {
  product_id: string
  amount: number
}

export class SavingsService {
  private supabase = supabase;

  /**
   * Get all available savings products
   */
  async getSavingsProducts(): Promise<SavingsProduct[]> {
    const { data, error } = await this.supabase
      .from('savings_products')
      .select('*')
      .eq('is_active', true)
      .order('minimum_balance')

    if (error) {
      console.error('Get savings products error:', error)
      return []
    }

    return data || []
  }

  /**
   * Get user's savings
   */
  async getUserSavings(userId: string): Promise<UserSavings[]> {
    const { data, error } = await this.supabase
      .from('user_savings')
      .select(`
        *,
        savings_products (
          name,
          interest_rate,
          duration_days
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get user savings error:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.savings_products.name,
      balance: item.balance,
      interest_accrued: item.interest_accrued,
      start_date: item.start_date,
      maturity_date: item.maturity_date,
      status: item.status,
      interest_rate: item.savings_products.interest_rate,
    }))
  }

  /**
   * Create a new savings plan
   */
  async createSavings(userId: string, params: CreateSavingsParams): Promise<{ success: boolean; data?: UserSavings; error?: string }> {
    try {
      // Get product details
      const { data: product, error: productError } = await this.supabase
        .from('savings_products')
        .select('*')
        .eq('id', params.product_id)
        .single()

      if (productError || !product) {
        return { success: false, error: 'Savings product not found' }
      }

      // Check minimum balance
      if (params.amount < product.minimum_balance) {
        return { success: false, error: `Minimum balance is ${product.minimum_balance}` }
      }

      // Get user's account
      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select('id, balance')
        .eq('user_id', userId)
        .single()

      if (accountError || !account) {
        return { success: false, error: 'Account not found' }
      }

      // Check sufficient balance
      if (account.balance < params.amount) {
        return { success: false, error: 'Insufficient funds' }
      }

      const reference = generateTransactionReference()
      const newBalance = account.balance - params.amount

      // Calculate maturity date if applicable
      let maturityDate = null
      if (product.duration_days) {
        const date = new Date()
        date.setDate(date.getDate() + product.duration_days)
        maturityDate = date.toISOString()
      }

      // Start transaction (deduct from main account)
      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', userId)

      if (updateError) throw updateError

      // Create savings record
      const { data: savings, error: savingsError } = await this.supabase
        .from('user_savings')
        .insert({
          user_id: userId,
          product_id: params.product_id,
          account_id: account.id,
          balance: params.amount,
          start_date: new Date().toISOString(),
          maturity_date: maturityDate,
          status: 'active',
        })
        .select()
        .single()

      if (savingsError) throw savingsError

      // Create transaction record
      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'debit',
          category: 'savings',
          amount: params.amount,
          description: `Savings: ${product.name}`,
          reference: reference,
          metadata: {
            savings_id: savings.id,
            product_name: product.name,
          },
          status: 'completed',
        })

      // Create notification
      await this.createSavingsNotification(userId, product.name, params.amount, 'created')

      // Calculate interest daily (will be handled by a cron job in production)
      await this.calculateInterest(userId, savings.id)

      return { success: true, data: savings }
    } catch (error: any) {
      console.error('Create savings error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Calculate interest for a savings account
   */
  async calculateInterest(userId: string, savingsId: string): Promise<void> {
    try {
      const { data: savings, error: savingsError } = await this.supabase
        .from('user_savings')
        .select(`
          *,
          savings_products (
            interest_rate
          )
        `)
        .eq('id', savingsId)
        .single()

      if (savingsError || !savings) return

      const lastCalculation = new Date(savings.last_interest_calculation)
      const now = new Date()
      const daysSinceLastCalculation = Math.floor((now.getTime() - lastCalculation.getTime()) / (1000 * 60 * 60 * 24))

      if (daysSinceLastCalculation < 1) return

      // Calculate daily interest
      const dailyRate = savings.savings_products.interest_rate / 100 / 365
      const interest = savings.balance * dailyRate * daysSinceLastCalculation

      if (interest > 0) {
        const newInterestAccrued = (savings.interest_accrued || 0) + interest

        await this.supabase
          .from('user_savings')
          .update({
            interest_accrued: newInterestAccrued,
            last_interest_calculation: now.toISOString(),
          })
          .eq('id', savingsId)
      }
    } catch (error) {
      console.error('Calculate interest error:', error)
    }
  }

  /**
   * Withdraw savings (with interest)
   */
  async withdrawSavings(userId: string, savingsId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get savings details
      const { data: savings, error: savingsError } = await this.supabase
        .from('user_savings')
        .select(`
          *,
          savings_products (
            name,
            interest_rate,
            duration_days
          )
        `)
        .eq('id', savingsId)
        .eq('user_id', userId)
        .single()

      if (savingsError || !savings) {
        return { success: false, error: 'Savings not found' }
      }

      if (savings.status !== 'active') {
        return { success: false, error: 'Savings already withdrawn or matured' }
      }

      // Calculate final interest
      await this.calculateInterest(userId, savingsId)

      // Get updated savings with interest
      const { data: updatedSavings } = await this.supabase
        .from('user_savings')
        .select('*')
        .eq('id', savingsId)
        .single()

      const totalAmount = (updatedSavings?.balance || 0) + (updatedSavings?.interest_accrued || 0)

      // Get user's account
      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select('id, balance')
        .eq('user_id', userId)
        .single()

      if (accountError || !account) {
        return { success: false, error: 'Account not found' }
      }

      const reference = generateTransactionReference()
      const newBalance = account.balance + totalAmount

      // Add funds back to main account
      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', userId)

      if (updateError) throw updateError

      // Update savings status
      await this.supabase
        .from('user_savings')
        .update({ status: 'withdrawn' })
        .eq('id', savingsId)

      // Create transaction record
      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'credit',
          category: 'savings_withdrawal',
          amount: totalAmount,
          description: `Savings Withdrawal: ${savings.savings_products.name}`,
          reference: reference,
          metadata: {
            savings_id: savingsId,
            principal: savings.balance,
            interest: updatedSavings?.interest_accrued || 0,
          },
          status: 'completed',
        })

      // Create notification
      await this.createSavingsNotification(userId, savings.savings_products.name, totalAmount, 'withdrawn')

      return { success: true }
    } catch (error: any) {
      console.error('Withdraw savings error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Check for matured savings and auto-notify
   */
  async checkMaturedSavings(): Promise<void> {
    try {
      const { data: maturedSavings } = await this.supabase
        .from('user_savings')
        .select('*, users!inner(email)')
        .eq('status', 'active')
        .lt('maturity_date', new Date().toISOString())

      for (const savings of maturedSavings || []) {
        // Create notification for each matured savings
        await this.supabase
          .from('notifications')
          .insert({
            user_id: savings.user_id,
            title: 'Savings Matured! 🎉',
            message: `Your ${savings.savings_products.name} has matured. You can now withdraw your savings with interest.`,
            type: 'transaction',
            metadata: { savings_id: savings.id },
          })
      }
    } catch (error) {
      console.error('Check matured savings error:', error)
    }
  }

  /**
   * Create notification for savings actions
   */
  private async createSavingsNotification(userId: string, productName: string, amount: number, action: string) {
    const messages = {
      created: `You've successfully started a ${productName} savings plan with ₦${amount.toLocaleString()}.`,
      withdrawn: `You've withdrawn ₦${amount.toLocaleString()} from your ${productName} savings.`,
      interest: `Interest has been added to your ${productName} savings.`,
    }

    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: action === 'created' ? 'Savings Started' : action === 'withdrawn' ? 'Savings Withdrawn' : 'Interest Added',
        message: messages[action as keyof typeof messages],
        type: 'transaction',
        metadata: { product_name: productName, amount, action },
      })
  }
}

export const savingsService = new SavingsService()