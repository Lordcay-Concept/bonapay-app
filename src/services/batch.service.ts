import { supabase } from './supabase'
import { generateTransactionReference } from '../utils/helpers'

export interface BatchRecipient {
  account_number: string
  bank_code: string
  account_name?: string
  amount: number
  note?: string
}

export interface BatchTransfer {
  id: string
  user_id: string
  reference: string
  total_amount: number
  recipient_count: number
  successful_count: number
  failed_count: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  recipients: BatchRecipient[]
  created_at: string
  completed_at?: string
}

export class BatchTransferService {
  private supabase = supabase;

  /**
   * Create a batch transfer
   */
  async createBatchTransfer(
    userId: string,
    recipients: BatchRecipient[]
  ): Promise<{ success: boolean; data?: BatchTransfer; error?: string }> {
    try {
      // Validate total amount
      const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0)

      // Check user balance
      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (accountError || !account) {
        return { success: false, error: 'Account not found' }
      }

      if (account.balance < totalAmount) {
        return { success: false, error: 'Insufficient funds' }
      }

      const reference = generateTransactionReference()

      // Create batch record
      const { data: batch, error: batchError } = await this.supabase
        .from('batch_transfers')
        .insert({
          user_id: userId,
          reference,
          total_amount: totalAmount,
          recipient_count: recipients.length,
          successful_count: 0,
          failed_count: 0,
          status: 'pending',
          recipients,
        })
        .select()
        .single()

      if (batchError) throw batchError

      // Process in background (for demo, we'll process immediately)
      this.processBatchTransfer(batch.id, userId, recipients)

      return { success: true, data: batch }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Process batch transfer
   */
  private async processBatchTransfer(
    batchId: string,
    userId: string,
    recipients: BatchRecipient[]
  ): Promise<void> {
    
    let successful = 0
    let failed = 0

    for (const recipient of recipients) {
      try {
        // Verify recipient account
        const { data: verified } = await supabase
          .from('beneficiaries')
          .select('account_name')
          .eq('account_number', recipient.account_number)
          .single()

        // Deduct from user's account
        const { data: account } = await supabase
          .from('accounts')
          .select('balance')
          .eq('user_id', userId)
          .single()

        if (account && account.balance >= recipient.amount) {
          const newBalance = account.balance - recipient.amount
          await supabase
            .from('accounts')
            .update({ balance: newBalance })
            .eq('user_id', userId)

          // Create transaction record
          await supabase
            .from('transactions')
            .insert({
              user_id: userId,
              type: 'debit',
              category: 'batch_transfer',
              amount: recipient.amount,
              description: `Batch Transfer: ${recipient.note || 'Bulk Payment'}`,
              reference: generateTransactionReference(),
              recipient_account: recipient.account_number,
              recipient_name: verified?.account_name || 'Recipient',
              status: 'completed',
            })

          successful++
        } else {
          failed++
        }
      } catch (error) {
        failed++
      }
    }

    // Update batch status
    await supabase
      .from('batch_transfers')
      .update({
        successful_count: successful,
        failed_count: failed,
        status: successful === recipients.length ? 'completed' : failed === recipients.length ? 'failed' : 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', batchId)

    // Create notification
    await this.createBatchNotification(userId, successful, failed, recipients.length)
  }

  /**
   * Get user's batch transfers
   */
  async getUserBatchTransfers(userId: string): Promise<BatchTransfer[]> {
    const { data, error } = await this.supabase
      .from('batch_transfers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  private async createBatchNotification(userId: string, successful: number, failed: number, total: number) {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Batch Transfer Completed',
        message: `${successful} of ${total} transfers completed successfully. ${failed} failed.`,
        type: 'transaction',
      })
  }
}

export const batchTransferService = new BatchTransferService()