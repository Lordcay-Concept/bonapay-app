import { supabase } from './supabase'
export interface SpendingInsight {
  id: string
  user_id: string
  type: 'trend' | 'anomaly' | 'saving_opportunity' | 'spending_pattern'
  title: string
  description: string
  impact: 'positive' | 'negative' | 'neutral'
  amount?: number
  percentage?: number
  category?: string
  created_at: string
  is_read: boolean
}

export interface SpendingSummary {
  total_spent: number
  total_received: number
  net_flow: number
  top_categories: Array<{ category: string; amount: number; percentage: number }>
  daily_average: number
  weekly_average: number
  monthly_average: number
  biggest_spending_day: { day: string; amount: number }
  compared_to_last_month: number
}

export class InsightsService {
  private supabase = supabase;

  /**
   * Generate spending insights for user
   */
  async generateInsights(userId: string): Promise<void> {
    const insights: SpendingInsight[] = []
    const now = new Date()
    const lastMonth = new Date(now)
    lastMonth.setMonth(now.getMonth() - 1)
    const lastWeek = new Date(now)
    lastWeek.setDate(now.getDate() - 7)

    // Get current month spending
    const { data: currentMonthTx } = await this.supabase
      .from('transactions')
      .select('amount, category, created_at')
      .eq('user_id', userId)
      .eq('type', 'debit')
      .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())

    // Get last month spending
    const { data: lastMonthTx } = await this.supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'debit')
      .gte('created_at', new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString())
      .lte('created_at', new Date(now.getFullYear(), now.getMonth(), 0).toISOString())

    const currentSpending = currentMonthTx?.reduce((sum, tx) => sum + tx.amount, 0) || 0
    const lastSpending = lastMonthTx?.reduce((sum, tx) => sum + tx.amount, 0) || 0

    // Compare with last month
    if (lastSpending > 0) {
      const change = ((currentSpending - lastSpending) / lastSpending) * 100
      if (Math.abs(change) > 10) {
        insights.push({
          id: crypto.randomUUID(),
          user_id: userId,
          type: change > 0 ? 'trend' : 'saving_opportunity',
          title: change > 0 ? 'Spending Increased' : 'Spending Decreased',
          description: change > 0
            ? `Your spending increased by ${Math.abs(change).toFixed(0)}% compared to last month.`
            : `Great job! Your spending decreased by ${Math.abs(change).toFixed(0)}% compared to last month.`,
          impact: change > 0 ? 'negative' : 'positive',
          amount: Math.abs(currentSpending - lastSpending),
          percentage: Math.abs(change),
          created_at: new Date().toISOString(),
          is_read: false,
        })
      }
    }

    // Find top spending categories
    const categorySpending = new Map<string, number>()
    currentMonthTx?.forEach(tx => {
      const cat = tx.category || 'Other'
      categorySpending.set(cat, (categorySpending.get(cat) || 0) + tx.amount)
    })

    const topCategory = Array.from(categorySpending.entries())
      .sort((a, b) => b[1] - a[1])[0]

    if (topCategory && currentSpending > 0) {
      const percentage = (topCategory[1] / currentSpending) * 100
      if (percentage > 40) {
        insights.push({
          id: crypto.randomUUID(),
          user_id: userId,
          type: 'spending_pattern',
          title: 'High Concentration',
          description: `${percentage.toFixed(0)}% of your spending is on ${topCategory[0]}. Consider diversifying your expenses.`,
          impact: 'neutral',
          category: topCategory[0],
          percentage,
          created_at: new Date().toISOString(),
          is_read: false,
        })
      }
    }

    // Detect anomalies (spikes)
    const dailySpending = new Map<string, number>()
    currentMonthTx?.forEach(tx => {
      const date = new Date(tx.created_at).toDateString()
      dailySpending.set(date, (dailySpending.get(date) || 0) + tx.amount)
    })

    const averageDaily = currentSpending / dailySpending.size
    for (const [date, amount] of dailySpending) {
      if (amount > averageDaily * 2) {
        insights.push({
          id: crypto.randomUUID(),
          user_id: userId,
          type: 'anomaly',
          title: 'Unusual Spending Detected',
          description: `You spent ${formatCurrency(amount)} on ${date}, which is double your daily average.`,
          impact: 'negative',
          amount,
          created_at: new Date().toISOString(),
          is_read: false,
        })
        break // Only one anomaly per generation
      }
    }

    // Save insights
    for (const insight of insights) {
      await this.supabase
        .from('spending_insights')
        .insert(insight)
    }
  }

  /**
   * Get user's spending insights
   */
  async getUserInsights(userId: string): Promise<SpendingInsight[]> {
    const { data, error } = await this.supabase
      .from('spending_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) return []
    return data || []
  }

  /**
   * Get spending summary
   */
  async getSpendingSummary(userId: string): Promise<SpendingSummary> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get current month transactions
    const { data: currentTx } = await this.supabase
      .from('transactions')
      .select('amount, category, created_at, type')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString())

    // Get last month transactions
    const { data: lastMonthTx } = await this.supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'debit')
      .gte('created_at', lastMonthStart.toISOString())
      .lte('created_at', lastMonthEnd.toISOString())

    const totalSpent = currentTx?.filter(tx => tx.type === 'debit').reduce((sum, tx) => sum + tx.amount, 0) || 0
    const totalReceived = currentTx?.filter(tx => tx.type === 'credit').reduce((sum, tx) => sum + tx.amount, 0) || 0
    const lastMonthSpent = lastMonthTx?.reduce((sum, tx) => sum + tx.amount, 0) || 0

    // Calculate category breakdown
    const categoryMap = new Map<string, number>()
    currentTx?.filter(tx => tx.type === 'debit').forEach(tx => {
      const cat = tx.category || 'Other'
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + tx.amount)
    })

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Find biggest spending day
    const dailyMap = new Map<string, number>()
    currentTx?.filter(tx => tx.type === 'debit').forEach(tx => {
      const day = new Date(tx.created_at).toLocaleDateString('en-US', { weekday: 'long' })
      dailyMap.set(day, (dailyMap.get(day) || 0) + tx.amount)
    })

    const biggestSpendingDay = Array.from(dailyMap.entries())
      .sort((a, b) => b[1] - a[1])[0] || { day: 'N/A', amount: 0 }

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysPassed = now.getDate()

    return {
      total_spent: totalSpent,
      total_received: totalReceived,
      net_flow: totalReceived - totalSpent,
      top_categories: topCategories,
      daily_average: totalSpent / daysPassed,
      weekly_average: totalSpent / (daysPassed / 7),
      monthly_average: totalSpent,
      biggest_spending_day: { day: biggestSpendingDay[0], amount: biggestSpendingDay[1] || 0 },
      compared_to_last_month: lastMonthSpent > 0 ? ((totalSpent - lastMonthSpent) / lastMonthSpent) * 100 : 0,
    }
  }

  /**
   * Mark insight as read
   */
  async markInsightRead(insightId: string): Promise<void> {
    await this.supabase
      .from('spending_insights')
      .update({ is_read: true })
      .eq('id', insightId)
  }
}

export const insightsService = new InsightsService()

// Helper function (import from utils or define here)
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)
}