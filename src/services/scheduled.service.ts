import { supabase } from './supabase'
import { generateTransactionReference } from '../utils/helpers'

export interface ScheduledTransfer {
  id: string
  user_id: string
  recipient_account: string
  recipient_name: string
  recipient_bank: string
  amount: number
  description: string
  frequency: 'one-time' | 'daily' | 'weekly' | 'monthly'
  next_execution: string
  last_execution?: string
  end_date?: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  created_at: string
}

export class ScheduledService {
  private supabase = supabase;

  /**
   * Create a scheduled transfer
   */
  async createScheduledTransfer(
    userId: string,
    data: Omit<ScheduledTransfer, 'id' | 'user_id' | 'created_at' | 'status'>
  ): Promise<{ success: boolean; data?: ScheduledTransfer; error?: string }> {
    try {
      const { data: transfer, error } = await this.supabase
        .from('scheduled_transfers')
        .insert({
          user_id: userId,
          ...data,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      await this.createScheduledNotification(userId, transfer, 'created')

      return { success: true, data: transfer }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user's scheduled transfers
   */
  async getUserScheduledTransfers(userId: string): Promise<ScheduledTransfer[]> {
    const { data, error } = await this.supabase
      .from('scheduled_transfers')
      .select('*')
      .eq('user_id', userId)
      .order('next_execution', { ascending: true })

    if (error) return []
    return data || []
  }

  /**
   * Update scheduled transfer status
   */
  async updateTransferStatus(
    transferId: string,
    userId: string,
    status: 'active' | 'paused' | 'cancelled'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('scheduled_transfers')
        .update({ status })
        .eq('id', transferId)
        .eq('user_id', userId)

      if (error) throw error

      const { data: transfer } = await this.supabase
        .from('scheduled_transfers')
        .select('*')
        .eq('id', transferId)
        .single()

      if (transfer) {
        await this.createScheduledNotification(userId, transfer, status)
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Process due scheduled transfers (called by cron job)
   */
  async processDueTransfers(): Promise<void> {
    const now = new Date().toISOString()

    const { data: transfers, error } = await this.supabase
      .from('scheduled_transfers')
      .select('*')
      .eq('status', 'active')
      .lte('next_execution', now)

    if (error || !transfers) return

    for (const transfer of transfers) {
      await this.executeTransfer(transfer)
    }
  }

  /**
   * Execute a single scheduled transfer
   */
  private async executeTransfer(transfer: ScheduledTransfer): Promise<void> {

    try {
      // Get user's account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', transfer.user_id)
        .single()

      if (accountError || !account) {
        await this.failTransfer(transfer, 'Account not found')
        return
      }

      if (account.balance < transfer.amount) {
        await this.failTransfer(transfer, 'Insufficient funds')
        return
      }

      // Process transfer
      const newBalance = account.balance - transfer.amount
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', transfer.user_id)

      if (updateError) {
        await this.failTransfer(transfer, 'Transfer failed')
        return
      }

      // Create transaction record
      const reference = generateTransactionReference()
      await supabase
        .from('transactions')
        .insert({
          user_id: transfer.user_id,
          type: 'debit',
          category: 'scheduled_transfer',
          amount: transfer.amount,
          description: `Scheduled Transfer: ${transfer.description}`,
          reference,
          recipient_name: transfer.recipient_name,
          recipient_account: transfer.recipient_account,
          recipient_bank: transfer.recipient_bank,
          status: 'completed',
        })

      // Update next execution date
      const nextExecution = this.calculateNextExecution(transfer)
      const updates: any = {
        last_execution: new Date().toISOString(),
        next_execution: nextExecution,
      }

      if (transfer.frequency === 'one-time' || (transfer.end_date && new Date(nextExecution) > new Date(transfer.end_date))) {
        updates.status = 'completed'
      }

      await supabase
        .from('scheduled_transfers')
        .update(updates)
        .eq('id', transfer.id)

      await this.createTransferNotification(transfer.user_id, transfer, 'executed')
    } catch (error) {
      await this.failTransfer(transfer, 'Unexpected error')
    }
  }

  /**
   * Calculate next execution date based on frequency
   */
  private calculateNextExecution(transfer: ScheduledTransfer): string {
    const next = new Date(transfer.next_execution)
    
    switch (transfer.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1)
        break
      case 'weekly':
        next.setDate(next.getDate() + 7)
        break
      case 'monthly':
        next.setMonth(next.getMonth() + 1)
        break
      default:
        return transfer.next_execution
    }
    
    return next.toISOString()
  }

  /**
   * Mark transfer as failed
   */
  private async failTransfer(transfer: ScheduledTransfer, reason: string): Promise<void> {
    
    await supabase
      .from('scheduled_transfers')
      .update({ status: 'paused' })
      .eq('id', transfer.id)

    await this.createTransferNotification(transfer.user_id, transfer, 'failed', reason)
  }

  /**
   * Create scheduled transfer notification
   */
  private async createScheduledNotification(
    userId: string,
    transfer: ScheduledTransfer,
    action: string
  ): Promise<void> {
    const messages = {
      created: `Scheduled transfer of ${transfer.amount} to ${transfer.recipient_name} has been created.`,
      active: `Scheduled transfer to ${transfer.recipient_name} has been activated.`,
      paused: `Scheduled transfer to ${transfer.recipient_name} has been paused.`,
      cancelled: `Scheduled transfer to ${transfer.recipient_name} has been cancelled.`,
    }

    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: `Scheduled Transfer ${action}`,
        message: messages[action as keyof typeof messages] || `Scheduled transfer ${action}`,
        type: 'transaction',
      })
  }

  /**
   * Create transfer execution notification
   */
  private async createTransferNotification(
    userId: string,
    transfer: ScheduledTransfer,
    status: 'executed' | 'failed',
    reason?: string
  ): Promise<void> {
    const message = status === 'executed'
      ? `Scheduled transfer of ₦${transfer.amount.toLocaleString()} to ${transfer.recipient_name} was executed successfully.`
      : `Scheduled transfer to ${transfer.recipient_name} failed. Reason: ${reason}`

    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: status === 'executed' ? 'Scheduled Transfer Executed' : 'Scheduled Transfer Failed',
        message,
        type: 'transaction',
      })
  }
}

export const scheduledService = new ScheduledService()