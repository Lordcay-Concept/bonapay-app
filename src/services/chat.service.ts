import { supabase } from './supabase'
export interface ChatMessage {
  id: string
  conversation_id: string  // Add this field
  user_id: string
  admin_id?: string
  message: string
  is_admin: boolean
  is_read: boolean
  created_at: string
}

export interface ChatConversation {
  id: string
  user_id: string
  user_name: string
  user_email: string
  status: 'open' | 'closed' | 'pending'
  last_message: string
  last_message_at: string
  unread_count: number
  created_at: string
}

export class ChatService {
  private supabase = supabase;

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    userId: string,
    message: string,
    isAdmin: boolean = false,
    conversationId?: string
  ): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    try {
      let convId = conversationId

      if (!convId) {
        // Create new conversation
        const { data: conv, error: convError } = await this.supabase
          .from('chat_conversations')
          .insert({
            user_id: userId,
            status: 'open',
            last_message: message,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (convError) throw convError
        convId = conv.id
      }

      // Send message
      const { error: msgError } = await this.supabase
        .from('chat_messages')
        .insert({
          conversation_id: convId,
          user_id: userId,
          message,
          is_admin: isAdmin,
          is_read: false,
        })

      if (msgError) throw msgError

      // Update conversation last message
      await this.supabase
        .from('chat_conversations')
        .update({
          last_message: message,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', convId)

      return { success: true, conversationId: convId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user's conversations (for admin)
   */
  async getAllConversations(): Promise<ChatConversation[]> {
    const { data, error } = await this.supabase
      .from('chat_conversations')
      .select(`
        *,
        user:profiles(full_name, email)
      `)
      .order('last_message_at', { ascending: false })

    if (error) return []

    return (data || []).map(conv => ({
      id: conv.id,
      user_id: conv.user_id,
      user_name: conv.user?.full_name || 'Unknown',
      user_email: conv.user?.email || 'Unknown',
      status: conv.status,
      last_message: conv.last_message || '',
      last_message_at: conv.last_message_at,
      unread_count: 0,
      created_at: conv.created_at,
    }))
  }

  /**
   * Get user's own conversations
   */
  async getUserConversations(userId: string): Promise<ChatConversation[]> {
    const { data, error } = await this.supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })

    if (error) return []
    
    return (data || []).map(conv => ({
      id: conv.id,
      user_id: conv.user_id,
      user_name: '',
      user_email: '',
      status: conv.status,
      last_message: conv.last_message || '',
      last_message_at: conv.last_message_at,
      unread_count: 0,
      created_at: conv.created_at,
    }))
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) return []
    return data || []
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string, isAdmin: boolean): Promise<void> {
    const query = isAdmin
      ? { is_admin: false, is_read: false }
      : { is_admin: true, is_read: false }

    await this.supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('is_admin', query.is_admin)
      .eq('is_read', false)
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string): Promise<void> {
    await this.supabase
      .from('chat_conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId)
  }

  /**
   * Reopen conversation
   */
  async reopenConversation(conversationId: string): Promise<void> {
    await this.supabase
      .from('chat_conversations')
      .update({ status: 'open' })
      .eq('id', conversationId)
  }
}

export const chatService = new ChatService()