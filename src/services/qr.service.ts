import { supabase } from './supabase'
import { generateTransactionReference } from '../utils/helpers'

export interface QRPayment {
  id: string
  user_id: string
  amount: number
  description: string
  qr_code: string
  status: 'pending' | 'completed' | 'expired' | 'cancelled'
  expires_at: string
  created_at: string
  completed_at?: string
}

export class QRService {
  private supabase = supabase;

  /**
   * Generate QR code for payment
   */
  async generateQRCode(
    userId: string,
    amount: number,
    description: string,
    expiresInMinutes: number = 15
  ): Promise<{ success: boolean; data?: QRPayment; error?: string }> {
    try {
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes)

      // Create QR payment record
      const { data, error } = await this.supabase
        .from('qr_payments')
        .insert({
          user_id: userId,
          amount,
          description,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          qr_code: await this.generateQRCodeData(userId, amount, description),
        })
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Generate QR code data string
   */
  private async generateQRCodeData(userId: string, amount: number, description: string): Promise<string> {
    // Create a unique payment identifier
    const paymentId = generateTransactionReference()
    const data = {
      type: 'payment',
      id: paymentId,
      user_id: userId,
      amount,
      description,
      timestamp: Date.now(),
    }
    return JSON.stringify(data)
  }

  /**
   * Process QR payment
   */
  async processQRPayment(
    qrData: string,
    payerId: string
  ): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      // Parse QR data
      const paymentData = JSON.parse(qrData)
      
      if (paymentData.type !== 'payment') {
        return { success: false, error: 'Invalid QR code' }
      }

      // Find QR payment record
      const { data: qrPayment, error: qrError } = await this.supabase
        .from('qr_payments')
        .select('*')
        .eq('qr_code', qrData)
        .eq('status', 'pending')
        .single()

      if (qrError || !qrPayment) {
        return { success: false, error: 'QR code not found or expired' }
      }

      // Check if expired
      if (new Date(qrPayment.expires_at) < new Date()) {
        await this.supabase
          .from('qr_payments')
          .update({ status: 'expired' })
          .eq('id', qrPayment.id)

        return { success: false, error: 'QR code has expired' }
      }

      // Get payer's account
      const { data: payerAccount, error: payerError } = await this.supabase
        .from('accounts')
        .select('id, balance')
        .eq('user_id', payerId)
        .single()

      if (payerError || !payerAccount) {
        return { success: false, error: 'Payer account not found' }
      }

      // Check sufficient balance
      if (payerAccount.balance < qrPayment.amount) {
        return { success: false, error: 'Insufficient funds' }
      }

      // Get receiver's account
      const { data: receiverAccount, error: receiverError } = await this.supabase
        .from('accounts')
        .select('id, balance')
        .eq('user_id', qrPayment.user_id)
        .single()

      if (receiverError || !receiverAccount) {
        return { success: false, error: 'Receiver account not found' }
      }

      const reference = generateTransactionReference()

      // Process transaction - deduct from payer
      const newPayerBalance = payerAccount.balance - qrPayment.amount
      const { error: updatePayerError } = await this.supabase
        .from('accounts')
        .update({ balance: newPayerBalance })
        .eq('id', payerAccount.id)

      if (updatePayerError) throw updatePayerError

      // Add to receiver
      const newReceiverBalance = receiverAccount.balance + qrPayment.amount
      const { error: updateReceiverError } = await this.supabase
        .from('accounts')
        .update({ balance: newReceiverBalance })
        .eq('id', receiverAccount.id)

      if (updateReceiverError) throw updateReceiverError

      // Create payer transaction
      await this.supabase
        .from('transactions')
        .insert({
          user_id: payerId,
          type: 'debit',
          category: 'qr_payment',
          amount: qrPayment.amount,
          description: `QR Payment: ${qrPayment.description}`,
          reference: `${reference}-PAYER`,
          recipient_name: 'QR Payment',
          status: 'completed',
        })

      // Create receiver transaction
      await this.supabase
        .from('transactions')
        .insert({
          user_id: qrPayment.user_id,
          type: 'credit',
          category: 'qr_payment',
          amount: qrPayment.amount,
          description: `QR Payment Received: ${qrPayment.description}`,
          reference: `${reference}-RECEIVER`,
          recipient_name: 'QR Payment',
          status: 'completed',
        })

      // Update QR payment status
      await this.supabase
        .from('qr_payments')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', qrPayment.id)

      // Create notifications
      await this.createPaymentNotification(qrPayment.user_id, payerId, qrPayment.amount, 'received')
      await this.createPaymentNotification(payerId, qrPayment.user_id, qrPayment.amount, 'sent')

      return { success: true, reference }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user's QR payments
   */
  async getUserQRPayments(userId: string): Promise<QRPayment[]> {
    const { data, error } = await this.supabase
      .from('qr_payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  /**
   * Create payment notification
   */
  private async createPaymentNotification(userId: string, counterpartyId: string, amount: number, type: 'sent' | 'received') {
    const { data: counterparty } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', counterpartyId)
      .single()

    const name = counterparty?.full_name || 'Someone'
    
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: type === 'received' ? 'QR Payment Received' : 'QR Payment Sent',
        message: type === 'received'
          ? `You received ₦${amount.toLocaleString()} via QR code from ${name}`
          : `You sent ₦${amount.toLocaleString()} via QR code to ${name}`,
        type: 'transaction',
      })
  }
}

export const qrService = new QRService()