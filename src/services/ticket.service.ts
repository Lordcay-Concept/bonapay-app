import { getSupabaseClient } from '@/lib/supabase/client'
import { generateTransactionReference } from '@/lib/utils'

export interface SupportTicket {
  id: string
  user_id: string
  user_name: string
  user_email: string
  subject: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  category: string
  attachments: string[]
  created_at: string
  updated_at: string
  resolved_at?: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  user_id: string
  is_admin: boolean
  message: string
  attachments: string[]
  created_at: string
}

export class SupportTicketService {
  private supabase = getSupabaseClient()

  /**
   * Create a new support ticket
   */
  async createTicket(
    userId: string,
    data: { subject: string; message: string; priority: string; category: string }
  ): Promise<{ success: boolean; ticket?: SupportTicket; error?: string }> {
    try {
      const { data: user } = await this.supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()

      const { data: ticket, error } = await this.supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          user_name: user?.full_name || 'User',
          user_email: user?.email,
          subject: data.subject,
          message: data.message,
          priority: data.priority,
          category: data.category,
          status: 'open',
          attachments: [],
        })
        .select()
        .single()

      if (error) throw error

      // Add initial message
      await this.addMessage(ticket.id, userId, data.message, false)

      // Send notification to admins
      await this.notifyAdmins(ticket)

      return { success: true, ticket }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Add message to ticket
   */
  async addMessage(
    ticketId: string,
    userId: string,
    message: string,
    isAdmin: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          user_id: userId,
          is_admin: isAdmin,
          message,
          attachments: [],
        })

      if (error) throw error

      // Update ticket updated_at
      await this.supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId)

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  /**
   * Get all tickets (admin)
   */
  async getAllTickets(): Promise<SupportTicket[]> {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  /**
   * Get ticket details with messages
   */
  async getTicketDetails(ticketId: string): Promise<{ ticket: SupportTicket; messages: TicketMessage[] } | null> {
    const { data: ticket, error: ticketError } = await this.supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (ticketError) return null

    const { data: messages, error: messagesError } = await this.supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (messagesError) return null

    return { ticket, messages: messages || [] }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    ticketId: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updates: any = { status, updated_at: new Date().toISOString() }
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId)

      if (error) throw error
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats(): Promise<{
    total: number
    open: number
    in_progress: number
    resolved: number
    closed: number
    avg_response_time: number
  }> {
    const { data } = await this.supabase
      .from('support_tickets')
      .select('status')

    const total = data?.length || 0
    const open = data?.filter(t => t.status === 'open').length || 0
    const inProgress = data?.filter(t => t.status === 'in_progress').length || 0
    const resolved = data?.filter(t => t.status === 'resolved').length || 0
    const closed = data?.filter(t => t.status === 'closed').length || 0

    return {
      total,
      open,
      in_progress: inProgress,
      resolved,
      closed,
      avg_response_time: 0, // Would calculate from actual data
    }
  }

  private async notifyAdmins(ticket: SupportTicket): Promise<void> {
    // Get admin users
    const { data: admins } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true)

    for (const admin of admins || []) {
      await this.supabase
        .from('notifications')
        .insert({
          user_id: admin.id,
          title: 'New Support Ticket',
          message: `New ticket from ${ticket.user_name}: ${ticket.subject}`,
          type: 'system',
          metadata: { ticket_id: ticket.id },
        })
    }
  }
}

export const supportTicketService = new SupportTicketService()