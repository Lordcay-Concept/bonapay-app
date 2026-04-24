import { supabase } from './supabase'
import { generateTransactionReference } from '../utils/helpers'

export interface BillCategory {
  id: string
  name: string
  code: string
  icon: string
}

export interface ElectricityProvider {
  id: string
  name: string
  code: string
  region: string
}

export interface Network {
  id: string
  name: string
  code: string
  prefix_patterns: string[]
  logo_url?: string
}

export interface DataBundle {
  id: string
  network_code: string
  name: string
  size_mb: number
  price: number
  validity_days: number
}

export interface CableProvider {
  id: string
  name: string
  code: string
  logo_url?: string
}

export interface CablePackage {
  id: string
  provider_code: string
  name: string
  price: number
  channels?: number
  description?: string
}

export interface BettingPlatform {
  id: string
  name: string
  code: string
  min_deposit: number
  logo_url?: string
}

export interface ElectricityBill {
  meterNumber: string
  meterType: 'prepaid' | 'postpaid'
  amount: number
  provider: string
}

export interface AirtimeBill {
  phoneNumber: string
  amount: number
  network: string
}

export interface DataBill {
  phoneNumber: string
  dataPlan: string
  amount: number
  network: string
}

export interface CableTVBill {
  smartCardNumber: string
  package: string
  amount: number
  provider: string
}

export interface BettingBill {
  platformCode: string
  phoneNumber: string
  amount: number
}

export interface AccountVerification {
  accountNumber: string
  bankCode?: string
}

export class BillService {
  private supabase = supabase;

  // ============================================
  // BILL CATEGORIES
  // ============================================
  async getBillCategories(): Promise<BillCategory[]> {
    const { data, error } = await this.supabase
      .from('bill_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Get categories error:', error)
      return []
    }
    return data || []
  }

  // ============================================
  // ELECTRICITY SERVICES
  // ============================================
  async getElectricityProviders(): Promise<ElectricityProvider[]> {
    const { data, error } = await this.supabase
      .from('electricity_providers')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) return []
    return data || []
  }

  async payElectricity(userId: string, bill: ElectricityBill): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (accountError || !account) {
        return { success: false, error: 'Account not found' }
      }

      if (account.balance < bill.amount) {
        return { success: false, error: 'Insufficient funds' }
      }

      const reference = generateTransactionReference()
      const newBalance = account.balance - bill.amount

      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', userId)

      if (updateError) throw updateError

      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'debit',
          category: 'bill_payment',
          amount: bill.amount,
          description: `Electricity Bill Payment - ${bill.provider}`,
          reference: reference,
          metadata: {
            bill_type: 'electricity',
            meter_number: bill.meterNumber,
            meter_type: bill.meterType,
            provider: bill.provider,
          },
          status: 'completed',
        })

      await this.supabase
        .from('bill_payments')
        .insert({
          user_id: userId,
          biller_name: `${bill.provider} Electricity`,
          biller_code: 'elec',
          customer_id: bill.meterNumber,
          customer_name: 'Customer',
          amount: bill.amount,
          reference: reference,
          status: 'completed',
          metadata: { meter_type: bill.meterType },
        })

      await this.createBillNotification(userId, 'Electricity', bill.amount, reference)

      return { success: true, reference }
    } catch (error: any) {
      console.error('Electricity payment error:', error)
      return { success: false, error: error.message }
    }
  }

  async verifyElectricityMeter(meterNumber: string, provider: string): Promise<{ success: boolean; customerName?: string; error?: string }> {
    // Mock verification with realistic Nigerian names
    const mockNames = [
      'Chief Adebayo Ogunlesi',
      'Mrs. Funke Adeleke',
      'Dr. Michael Okonkwo',
      'Alhaji Musa Bello',
      'Barr. Emeka Nwosu',
      'Princess Tolu Adeyemi',
      'Engr. Femi Akinwande',
      'Mrs. Grace Uche',
      'Mr. Peter Obi',
      'Chief Mrs. Ngozi Okonjo',
    ]
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)]
    
    return {
      success: true,
      customerName: randomName,
    }
  }

  // ============================================
  // AIRTIME SERVICES
  // ============================================
  async getNetworks(): Promise<Network[]> {
    const { data, error } = await this.supabase
      .from('networks')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) return []
    return data || []
  }

  async detectNetwork(phoneNumber: string): Promise<Network | null> {
    const networks = await this.getNetworks()
    const prefix = phoneNumber.slice(0, 4)
    
    const detected = networks.find(network => 
      network.prefix_patterns?.some(pattern => prefix === pattern)
    )
    
    return detected || null
  }

  async buyAirtime(userId: string, bill: AirtimeBill): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (accountError || !account) {
        return { success: false, error: 'Account not found' }
      }

      if (account.balance < bill.amount) {
        return { success: false, error: 'Insufficient funds' }
      }

      const reference = generateTransactionReference()
      const newBalance = account.balance - bill.amount

      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', userId)

      if (updateError) throw updateError

      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'debit',
          category: 'airtime',
          amount: bill.amount,
          description: `Airtime Purchase - ${bill.network.toUpperCase()}`,
          reference: reference,
          metadata: {
            phone_number: bill.phoneNumber,
            network: bill.network,
          },
          status: 'completed',
        })

      await this.supabase
        .from('bill_payments')
        .insert({
          user_id: userId,
          biller_name: `${bill.network.toUpperCase()} Airtime`,
          biller_code: 'airtime',
          customer_id: bill.phoneNumber,
          customer_name: 'Customer',
          amount: bill.amount,
          reference: reference,
          status: 'completed',
        })

      await this.createBillNotification(userId, 'Airtime', bill.amount, reference)

      return { success: true, reference }
    } catch (error: any) {
      console.error('Airtime purchase error:', error)
      return { success: false, error: error.message }
    }
  }

  // ============================================
  // DATA BUNDLE SERVICES
  // ============================================
  async getDataBundles(networkCode: string): Promise<DataBundle[]> {
    const { data, error } = await this.supabase
      .from('data_bundles')
      .select('*')
      .eq('network_code', networkCode)
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) return []
    return data || []
  }

  async buyData(userId: string, bill: DataBill): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (accountError || !account) {
        return { success: false, error: 'Account not found' }
      }

      if (account.balance < bill.amount) {
        return { success: false, error: 'Insufficient funds' }
      }

      const reference = generateTransactionReference()
      const newBalance = account.balance - bill.amount

      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', userId)

      if (updateError) throw updateError

      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'debit',
          category: 'data',
          amount: bill.amount,
          description: `Data Purchase - ${bill.dataPlan}`,
          reference: reference,
          metadata: {
            phone_number: bill.phoneNumber,
            network: bill.network,
            data_plan: bill.dataPlan,
          },
          status: 'completed',
        })

      await this.supabase
        .from('bill_payments')
        .insert({
          user_id: userId,
          biller_name: `${bill.network.toUpperCase()} Data`,
          biller_code: 'data',
          customer_id: bill.phoneNumber,
          customer_name: 'Customer',
          amount: bill.amount,
          reference: reference,
          status: 'completed',
        })

      await this.createBillNotification(userId, 'Data', bill.amount, reference)

      return { success: true, reference }
    } catch (error: any) {
      console.error('Data purchase error:', error)
      return { success: false, error: error.message }
    }
  }

  // ============================================
  // CABLE TV SERVICES
  // ============================================
  async getCableProviders(): Promise<CableProvider[]> {
    const { data, error } = await this.supabase
      .from('cable_providers')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) return []
    return data || []
  }

  async getCablePackages(providerCode: string): Promise<CablePackage[]> {
    const { data, error } = await this.supabase
      .from('cable_packages')
      .select('*')
      .eq('provider_code', providerCode)
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) return []
    return data || []
  }

  async payCableTV(userId: string, bill: CableTVBill): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (accountError || !account) {
        return { success: false, error: 'Account not found' }
      }

      if (account.balance < bill.amount) {
        return { success: false, error: 'Insufficient funds' }
      }

      const reference = generateTransactionReference()
      const newBalance = account.balance - bill.amount

      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', userId)

      if (updateError) throw updateError

      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'debit',
          category: 'cable_tv',
          amount: bill.amount,
          description: `Cable TV Subscription - ${bill.provider.toUpperCase()}`,
          reference: reference,
          metadata: {
            smart_card_number: bill.smartCardNumber,
            package: bill.package,
            provider: bill.provider,
          },
          status: 'completed',
        })

      await this.supabase
        .from('bill_payments')
        .insert({
          user_id: userId,
          biller_name: `${bill.provider.toUpperCase()} Cable TV`,
          biller_code: 'cable',
          customer_id: bill.smartCardNumber,
          customer_name: 'Customer',
          amount: bill.amount,
          reference: reference,
          status: 'completed',
        })

      await this.createBillNotification(userId, 'Cable TV', bill.amount, reference)

      return { success: true, reference }
    } catch (error: any) {
      console.error('Cable TV payment error:', error)
      return { success: false, error: error.message }
    }
  }

  async verifySmartCard(smartCardNumber: string, provider: string): Promise<{ success: boolean; customerName?: string; error?: string }> {
    const mockNames = [
      'Mr. Olumide Adebayo',
      'Mrs. Ifeoma Eze',
      'Dr. Hassan Bello',
      'Chief Ejiro Omatseye',
      'Miss Aisha Mohammed',
      'Prof. Chidi Odinkalu',
      'Mrs. Ronke Kosoko',
      'Mr. Tunde Kelani',
      'Barr. Funmilayo Ransome-Kuti',
      'Alhaji Shehu Shagari',
    ]
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)]
    
    return {
      success: true,
      customerName: randomName,
    }
  }

  // ============================================
  // BETTING SERVICES
  // ============================================
  async getBettingPlatforms(): Promise<BettingPlatform[]> {
    const { data, error } = await this.supabase
      .from('betting_platforms')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) return []
    return data || []
  }

  async fundBettingAccount(
  userId: string,
  bill: BettingBill
): Promise<{ success: boolean; reference?: string; error?: string }> {
  try {
    const { data: platform, error: platformError } = await this.supabase
      .from('betting_platforms')
      .select('name')
      .eq('code', bill.platformCode)
      .single()

    if (platformError || !platform) {
      return { success: false, error: 'Betting platform not found' }
    }

      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (accountError || !account) {
        return { success: false, error: 'Account not found' }
      }

      if (account.balance < bill.amount) {
        return { success: false, error: 'Insufficient funds' }
      }

      const reference = generateTransactionReference()
      const newBalance = account.balance - bill.amount

      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', userId)

      if (updateError) throw updateError

      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'debit',
          category: 'betting',
          amount: bill.amount,
          description: `Betting Deposit: ${platform.name}`,
          reference,
          metadata: {
            platform: platform.name,
            phone_number: bill.phoneNumber,
          },
          status: 'completed',
        })

      await this.createBettingNotification(userId, platform.name, bill.amount)

      return { success: true, reference }
    } catch (error: any) {
      console.error('Betting deposit error:', error)
      return { success: false, error: error.message }
    }
  }

  private async createBettingNotification(userId: string, platform: string, amount: number) {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Betting Deposit Successful',
        message: `Your deposit of ₦${amount.toLocaleString()} to ${platform} was successful.`,
        type: 'transaction',
      })
  }

  // ============================================
  // ACCOUNT VERIFICATION SERVICE (For Transfers)
  // ============================================
  async verifyAccountNumber(
    accountNumber: string,
    bankCode?: string
  ): Promise<{ success: boolean; accountName?: string; bankName?: string; error?: string }> {
    // Mock verification with realistic Nigerian bank account names
    // In production, this would call NIBSS API or your BaaS provider
    
    await new Promise(resolve => setTimeout(resolve, 800)) // Simulate network delay
    
    const mockBankNames: Record<string, string> = {
      '001': 'GTBank',
      '002': 'Zenith Bank',
      '003': 'Access Bank',
      '004': 'First Bank',
      '005': 'UBA',
      '006': 'FCMB',
      '007': 'Stanbic IBTC',
      '008': 'Union Bank',
      '009': 'Polaris Bank',
      '010': 'Wema Bank',
      '011': 'Keystone Bank',
      '012': 'Unity Bank',
      '013': 'Fidelity Bank',
      '014': 'Heritage Bank',
      '015': 'Jaiz Bank',
    }
    
    const mockAccountNames = [
      'OLUWASEUN ADEBAYO JOHNSON',
      'IFEANYI EMMANUEL OKONKWO',
      'FUNMILAYO OLUWASEUN ADELEKE',
      'MUSA BELLO ADAMU',
      'CHIOMA GRACE NWOSU',
      'EMMANUEL OLAKUNLE ADEYEMI',
      'ABDULLAHI IBRAHIM SANI',
      'PRECIOUS CHINEDU OBI',
      'OLAMIDE TEMITOPE AKINDELE',
      'FAITH NWANYINMA OGBONNAYA',
      'MICHAEL CHUKWUEBUKA OKAFOR',
      'JENNIFER UCHECHUKWU EZE',
      'VICTOR OLUWASEUN AYOOLA',
      'GRACE ADEBUKOLA OGUNLESI',
      'SAMUEL CHIDIEBERE NWANKWO',
      'ESTHER OLABISI ADELEKE',
      'DANIEL OLUWATOSIN ADEWALE',
      'MARY OLUWAKEMI AFOLABI',
      'JOSEPH CHIBUIKE UGWU',
      'RACHEL OMOBONIKE EKPO',
    ]
    
    const randomName = mockAccountNames[Math.floor(Math.random() * mockAccountNames.length)]
    const bankName = bankCode ? mockBankNames[bankCode] || 'GTBank' : 'GTBank'
    
    // Validate account number length (Nigerian accounts are 10 digits)
    if (!/^\d{10}$/.test(accountNumber)) {
      return { 
        success: false, 
        error: 'Invalid account number. Must be 10 digits.' 
      }
    }
    
    // Mock: Some account numbers "fail" verification to simulate real scenarios
    const failingAccounts = ['0000000000', '1111111111', '9999999999']
    if (failingAccounts.includes(accountNumber)) {
      return { 
        success: false, 
        error: 'Account number not found. Please check and try again.' 
      }
    }
    
    return {
      success: true,
      accountName: randomName,
      bankName,
    }
  }

  // ============================================
  // NOTIFICATION HELPER
  // ============================================
  private async createBillNotification(userId: string, billType: string, amount: number, reference: string) {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: `${billType} Payment Successful`,
        message: `Your ${billType} payment of ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)} was successful. Reference: ${reference}`,
        type: 'transaction',
        metadata: { bill_type: billType, amount, reference },
      })
  }
}

export const billService = new BillService()