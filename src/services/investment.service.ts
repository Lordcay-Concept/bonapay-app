import { supabase } from './supabase'
import { generateTransactionReference } from '../utils/helpers'

export interface InvestmentProduct {
  id: string
  name: string
  description: string
  expected_return: number
  min_investment: number
  max_investment: number
  duration_days: number
  risk_level: 'low' | 'medium' | 'high'
  is_active: boolean
  created_at: string
}

export interface UserInvestment {
  id: string
  user_id: string
  product_id: string
  product_name: string
  amount: number
  expected_return_amount: number
  start_date: string
  maturity_date: string
  status: 'active' | 'matured' | 'withdrawn'
  returns_paid: boolean
  created_at: string
}

export class InvestmentService {
  private supabase = supabase;

  /**
   * Get all available investment products
   */
  async getInvestmentProducts(): Promise<InvestmentProduct[]> {
    const { data, error } = await this.supabase
      .from('investment_products')
      .select('*')
      .eq('is_active', true)
      .order('risk_level')

    if (error) return []
    return data || []
  }

  /**
   * Get user's investments
   */
  async getUserInvestments(userId: string): Promise<UserInvestment[]> {
    const { data, error } = await this.supabase
      .from('user_investments')
      .select(`
        *,
        product:investment_products(name, expected_return)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return []
    
    return (data || []).map(item => ({
      ...item,
      product_name: item.product?.name,
      expected_return_amount: item.amount * (item.product?.expected_return / 100),
    }))
  }

  /**
   * Create new investment
   */
  async createInvestment(
    userId: string,
    productId: string,
    amount: number
  ): Promise<{ success: boolean; data?: UserInvestment; error?: string }> {
    try {
      // Get product details
      const { data: product, error: productError } = await this.supabase
        .from('investment_products')
        .select('*')
        .eq('id', productId)
        .single()

      if (productError || !product) {
        return { success: false, error: 'Investment product not found' }
      }

      // Validate amount
      if (amount < product.min_investment) {
        return { success: false, error: `Minimum investment is ₦${product.min_investment.toLocaleString()}` }
      }
      if (amount > product.max_investment) {
        return { success: false, error: `Maximum investment is ₦${product.max_investment.toLocaleString()}` }
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
      if (account.balance < amount) {
        return { success: false, error: 'Insufficient funds' }
      }

      const reference = generateTransactionReference()
      const maturityDate = new Date()
      maturityDate.setDate(maturityDate.getDate() + product.duration_days)

      // Deduct from balance
      const newBalance = account.balance - amount
      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', account.id)

      if (updateError) throw updateError

      // Create investment record
      const { data: investment, error: investmentError } = await this.supabase
        .from('user_investments')
        .insert({
          user_id: userId,
          product_id: productId,
          amount,
          start_date: new Date().toISOString(),
          maturity_date: maturityDate.toISOString(),
          status: 'active',
        })
        .select()
        .single()

      if (investmentError) throw investmentError

      // Create transaction record
      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'debit',
          category: 'investment',
          amount,
          description: `Investment: ${product.name}`,
          reference,
          status: 'completed',
        })

      // Create notification
      await this.createInvestmentNotification(userId, product.name, amount, 'created')

      return { success: true, data: investment }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Withdraw matured investment
   */
  async withdrawInvestment(
    userId: string,
    investmentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: investment, error: investError } = await this.supabase
        .from('user_investments')
        .select(`
          *,
          product:investment_products(name, expected_return)
        `)
        .eq('id', investmentId)
        .eq('user_id', userId)
        .single()

      if (investError || !investment) {
        return { success: false, error: 'Investment not found' }
      }

      // Check if matured
      if (new Date(investment.maturity_date) > new Date()) {
        return { success: false, error: 'Investment not yet matured' }
      }

      if (investment.status !== 'active') {
        return { success: false, error: 'Investment already withdrawn' }
      }

      const expectedReturn = investment.amount * (investment.product.expected_return / 100)
      const totalAmount = investment.amount + expectedReturn

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

      // Add funds back
      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', account.id)

      if (updateError) throw updateError

      // Update investment status
      await this.supabase
        .from('user_investments')
        .update({ 
          status: 'withdrawn',
          returns_paid: true 
        })
        .eq('id', investmentId)

      // Create transaction record
      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'credit',
          category: 'investment_return',
          amount: totalAmount,
          description: `Investment Return: ${investment.product.name}`,
          reference,
          status: 'completed',
        })

      await this.createInvestmentNotification(userId, investment.product.name, totalAmount, 'withdrawn')

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private async createInvestmentNotification(
    userId: string,
    productName: string,
    amount: number,
    action: string
  ) {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: action === 'created' ? 'Investment Created' : 'Investment Withdrawn',
        message: action === 'created'
          ? `You've invested ₦${amount.toLocaleString()} in ${productName}`
          : `You've received ₦${amount.toLocaleString()} from your ${productName} investment`,
        type: 'transaction',
      })
  }
}

export const investmentService = new InvestmentService()