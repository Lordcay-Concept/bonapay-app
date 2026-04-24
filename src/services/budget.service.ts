import { supabase } from './supabase'
export interface Budget {
  id: string
  user_id: string
  category: string
  amount: number
  spent: number
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  start_date: string
  end_date: string
  notification_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BudgetAlert {
  id: string
  user_id: string
  budget_id: string
  category: string
  spent: number
  budget_amount: number
  percentage: number
  message: string
  is_read: boolean
  created_at: string
}

export class BudgetService {
  private supabase = supabase;

  /**
   * Create a new budget
   */
  async createBudget(
    userId: string,
    data: Omit<Budget, 'id' | 'user_id' | 'spent' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; data?: Budget; error?: string }> {
    try {
      const { data: budget, error } = await this.supabase
        .from('budgets')
        .insert({
          user_id: userId,
          spent: 0,
          ...data,
        })
        .select()
        .single()

      if (error) throw error

      return { success: true, data: budget }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user's budgets
   */
  async getUserBudgets(userId: string): Promise<Budget[]> {
    const { data, error } = await this.supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  /**
   * Update budget spent amount based on transactions
   */
  async updateBudgetSpent(userId: string): Promise<void> {
    const budgets = await this.getUserBudgets(userId)
    const now = new Date()

    for (const budget of budgets) {
      const startDate = new Date(budget.start_date)
      const endDate = new Date(budget.end_date)

      // Calculate spent amount for this period
      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'debit')
        .eq('category', budget.category)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      const totalSpent = transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0

      // Update budget spent
      await this.supabase
        .from('budgets')
        .update({ spent: totalSpent, updated_at: new Date().toISOString() })
        .eq('id', budget.id)

      // Check if over budget
      const percentage = (totalSpent / budget.amount) * 100
      if (percentage >= budget.notification_threshold) {
        await this.createBudgetAlert(userId, budget, totalSpent, percentage)
      }
    }
  }

  /**
   * Create budget alert
   */
  private async createBudgetAlert(
    userId: string,
    budget: Budget,
    spent: number,
    percentage: number
  ): Promise<void> {
    const { data: existing } = await this.supabase
      .from('budget_alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('budget_id', budget.id)
      .eq('is_read', false)
      .single()

    if (existing) return

    await this.supabase
      .from('budget_alerts')
      .insert({
        user_id: userId,
        budget_id: budget.id,
        category: budget.category,
        spent,
        budget_amount: budget.amount,
        percentage,
        message: `You've spent ${percentage.toFixed(0)}% of your ${budget.category} budget (₦${spent.toLocaleString()} / ₦${budget.amount.toLocaleString()})`,
      })

    // Send notification
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Budget Alert!',
        message: `You've used ${percentage.toFixed(0)}% of your ${budget.category} budget.`,
        type: 'system',
      })
  }

  /**
   * Get budget alerts
   */
  async getBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
    const { data, error } = await this.supabase
      .from('budget_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  /**
   * Mark alert as read
   */
  async markAlertRead(alertId: string): Promise<void> {
    await this.supabase
      .from('budget_alerts')
      .update({ is_read: true })
      .eq('id', alertId)
  }

  /**
   * Delete budget
   */
  async deleteBudget(budgetId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('user_id', userId)

      if (error) throw error
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const budgetService = new BudgetService()