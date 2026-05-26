import { supabase } from './supabase';

export class PinService {
  
  private hashPin(pin: string): string {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
    }
    return String(Math.abs(hash));
  }

  async hasTransactionPin(userId: string): Promise<boolean> {
    if (!userId) return false;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('transaction_pin_enabled')
      .eq('id', userId)
      .single();
    
    if (error) return false;
    return data?.transaction_pin_enabled === true;
  }

  async setTransactionPin(
    userId: string,
    pin: string,
    confirmPin: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!userId) return { success: false, error: 'User not authenticated' };
    
    if (pin !== confirmPin) {
      return { success: false, error: 'PINs do not match' };
    }

    if (!/^\d{4}$/.test(pin)) {
      return { success: false, error: 'PIN must be 4 digits' };
    }

    try {
      const hashedPin = this.hashPin(pin);
            
      const { error } = await supabase
        .from('profiles')
        .update({
          transaction_pin: hashedPin,
          transaction_pin_enabled: true,
          transaction_pin_attempts: 0,
        })
        .eq('id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('setTransactionPin error:', error);
      return { success: false, error: error.message || 'Failed to set PIN' };
    }
  }

  async verifyPin(userId: string, enteredPin: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) return { success: false, error: 'User not authenticated' };
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('transaction_pin, transaction_pin_enabled')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('verifyPin fetch error:', error);
        return { success: false, error: 'PIN not set up' };
      }

      if (!data?.transaction_pin_enabled || !data?.transaction_pin) {
        return { success: false, error: 'No PIN set up' };
      }

      const hashedEnteredPin = this.hashPin(enteredPin);
      
      
      const isValid = hashedEnteredPin === data.transaction_pin;

      if (!isValid) {
        return { success: false, error: 'Invalid PIN' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('verifyPin error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const pinService = new PinService();