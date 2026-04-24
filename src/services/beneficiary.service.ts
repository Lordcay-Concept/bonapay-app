import { supabase } from './supabase'
export interface Beneficiary {
  id: string
  user_id: string
  account_number: string
  bank_name: string
  bank_code: string
  account_name: string
  nickname: string
  is_favorite: boolean
  transaction_count: number
  last_transferred_at: string | null
  created_at: string
}

export class BeneficiaryService {
  private supabase = supabase;

  /**
   * Add a new beneficiary
   */
  async addBeneficiary(
    userId: string,
    data: Omit<Beneficiary, 'id' | 'user_id' | 'transaction_count' | 'last_transferred_at' | 'created_at'>
  ): Promise<{ success: boolean; data?: Beneficiary; error?: string }> {
    try {
      // Check if beneficiary already exists
      const { data: existing } = await this.supabase
        .from('beneficiaries')
        .select('id')
        .eq('user_id', userId)
        .eq('account_number', data.account_number)
        .single()

      if (existing) {
        return { success: false, error: 'Beneficiary already exists' }
      }

      const { data: beneficiary, error } = await this.supabase
        .from('beneficiaries')
        .insert({
          user_id: userId,
          ...data,
          transaction_count: 0,
        })
        .select()
        .single()

      if (error) throw error

      return { success: true, data: beneficiary }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all beneficiaries for a user
   */
  async getBeneficiaries(userId: string): Promise<Beneficiary[]> {
    const { data, error } = await this.supabase
      .from('beneficiaries')
      .select('*')
      .eq('user_id', userId)
      .order('is_favorite', { ascending: false })
      .order('transaction_count', { ascending: false })

    if (error) return []
    return data || []
  }

  /**
   * Update beneficiary
   */
  async updateBeneficiary(
    beneficiaryId: string,
    userId: string,
    updates: Partial<Beneficiary>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('beneficiaries')
        .update(updates)
        .eq('id', beneficiaryId)
        .eq('user_id', userId)

      if (error) throw error
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete beneficiary
   */
  async deleteBeneficiary(
    beneficiaryId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('beneficiaries')
        .delete()
        .eq('id', beneficiaryId)
        .eq('user_id', userId)

      if (error) throw error
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Increment transaction count for beneficiary
   */
  async incrementTransactionCount(beneficiaryId: string): Promise<void> {
    await this.supabase.rpc('increment_beneficiary_count', {
      beneficiary_id: beneficiaryId,
    })
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(
    beneficiaryId: string,
    userId: string
  ): Promise<{ success: boolean; isFavorite?: boolean; error?: string }> {
    try {
      const { data: beneficiary } = await this.supabase
        .from('beneficiaries')
        .select('is_favorite')
        .eq('id', beneficiaryId)
        .eq('user_id', userId)
        .single()

      if (!beneficiary) {
        return { success: false, error: 'Beneficiary not found' }
      }

      const newStatus = !beneficiary.is_favorite
      const { error } = await this.supabase
        .from('beneficiaries')
        .update({ is_favorite: newStatus })
        .eq('id', beneficiaryId)
        .eq('user_id', userId)

      if (error) throw error
      return { success: true, isFavorite: newStatus }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Verify account number
   */
  async verifyAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<{ success: boolean; accountName?: string; error?: string }> {
    // Mock verification - in production, integrate with NIBSS or bank API
    // For demo, generate a mock account name
    const mockNames = [
      'John Doe', 'Jane Smith', 'Michael Johnson', 'Sarah Williams',
      'David Brown', 'Emily Davis', 'James Wilson', 'Patricia Taylor'
    ]
    const mockName = mockNames[Math.floor(Math.random() * mockNames.length)]
    
    return {
      success: true,
      accountName: mockName,
    }
  }
}

export const beneficiaryService = new BeneficiaryService()