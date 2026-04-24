import { supabase } from './supabase';
import { generateTransactionReference } from '../utils/helpers';

export interface TransferData {
  recipientAccount: string;
  amount: number;
  description?: string;
  pin: string;
}

export interface Account {
  id: string;
  user_id: string;
  account_number: string;
  balance: number;
}

// Nigerian names for demo mode
const NIGERIAN_NAMES = [
  'CHUKWUEMEKA OKAFOR', 'IFEANYI EZE', 'OLUWASEUN ADEBAYO', 'FUNMILAYO AKINDELE',
  'ABDULLAHI BELLO', 'CHIOMA NWOSU', 'EMMANUEL OBI', 'GRACE OKONKWO',
  'MICHAEL OLAYINKA', 'PRECIOUS ADELEKE', 'SAMUEL CHIDIEBERE', 'VICTORIA ONAH',
  'GIFT OKOROCHA', 'OLAMIDE OLAWALE', 'FAITH ADEBISI', 'KUNLE ADEBAYO',
  'BUKOLA OYEDEJI', 'SEGUN ADEWALE', 'NGOZI OKAFOR', 'AMARA UKWU',
  'CHINEDU OGU', 'ESTHER AKPAN', 'IBRAHIM SULAIMAN', 'JENNIFER OKOLO'
];

export class TransferService {
  async getUserBalance(userId: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching balance:', error);
      return null;
    }
    return data;
  }

  async verifyAccount(accountNumber: string): Promise<{ 
    success: boolean; 
    accountName?: string; 
    bankName?: string; 
    error?: string;
  }> {
    try {
      if (/^\d{10}$/.test(accountNumber)) {
        const randomIndex = Math.floor(Math.random() * NIGERIAN_NAMES.length);
        const randomName = NIGERIAN_NAMES[randomIndex];
        
        return {
          success: true,
          accountName: randomName,
          bankName: 'BonaPay',
        };
      }
      
      return {
        success: false,
        error: 'Invalid account number. Must be 10 digits.',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Unable to verify account. Please try again.',
      };
    }
  }

  async sendMoney(userId: string, transferData: TransferData): Promise<{
    success: boolean;
    reference?: string;
    error?: string;
  }> {
    try {
      const { data: senderAccount, error: senderError } = await supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (senderError || !senderAccount) {
        return { success: false, error: 'Account not found' };
      }

      if (senderAccount.balance < transferData.amount) {
        return { success: false, error: 'Insufficient funds' };
      }

      const newBalance = senderAccount.balance - transferData.amount;
      const reference = generateTransactionReference();

      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (updateError) {
        return { success: false, error: 'Failed to update balance' };
      }

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'debit',
          amount: transferData.amount,
          description: transferData.description || 'Money Transfer',
          reference: reference,
          recipient_account: transferData.recipientAccount,
          recipient_name: transferData.recipientAccount,
          status: 'completed',
        });

      if (transactionError) {
        await supabase
          .from('accounts')
          .update({ balance: senderAccount.balance })
          .eq('user_id', userId);
        
        return { success: false, error: 'Failed to create transaction record' };
      }

      return { success: true, reference };
    } catch (error: any) {
      return { success: false, error: error.message || 'Transfer failed' };
    }
  }

  async addBeneficiary(userId: string, accountNumber: string, accountName: string, bankName: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase
        .from('beneficiaries')
        .insert({
          user_id: userId,
          account_number: accountNumber,
          account_name: accountName,
          bank_name: bankName,
          is_favorite: false,
        });

      if (error) {
        return { success: false, error: 'Failed to add beneficiary' };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getRecentTransactions(userId: string, limit: number = 10): Promise<any[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  }
}

export const transferService = new TransferService();