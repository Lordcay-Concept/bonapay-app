/**
 * User profile type
 */
export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string
  avatar_url?: string
  bvn?: string
  nin?: string
  kyc_status: 'pending' | 'verified' | 'rejected'
  created_at: string
}

/**
 * Account type
 */
export interface Account {
  id: string
  user_id: string
  account_number: string
  balance: number
  currency: string
  created_at: string
}

/**
 * Transaction type
 */
export interface Transaction {
  id: string
  user_id: string
  type: 'debit' | 'credit'
  amount: number
  description: string
  reference: string
  recipient_name?: string
  recipient_account?: string
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

/**
 * Beneficiary type
 */
export interface Beneficiary {
  id: string
  user_id: string
  account_number: string
  bank_name: string
  account_name: string
  nickname?: string
  created_at: string
}