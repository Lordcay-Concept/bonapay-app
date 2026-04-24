import { supabase } from './supabase'
import { User } from '@supabase/supabase-js';

export interface TransactionPattern {
  userId: string;
  amount: number;
  type: string;
  timestamp: Date;
  location?: string;
  deviceFingerprint?: string;
}

export interface FraudAlert {
  id: string;
  user_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: any;
  status: 'pending' | 'reviewing' | 'resolved' | 'false_positive';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

// Define severity scores with proper typing
type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

const SEVERITY_SCORES: Record<SeverityLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// Define types for database responses
interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  created_at: string;
  metadata?: any;
}

interface UserTransactionStats {
  avg_amount: number;
  std_dev_amount: number;
  typical_locations: string[] | null;
  typical_times: number[] | null;
}

interface FraudAlertDB {
  id: string;
  user_id: string;
  alert_type: string;
  severity: SeverityLevel;
  description: string;
  metadata: any;
  status: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

export class FraudDetectionService {
  private supabase = supabase;
  
  // Configuration thresholds
  private thresholds = {
    maxSingleTransaction: 1000000, // $1,000,000
    maxDailyTotal: 5000000, // $5,000,000
    rapidTransactionCount: 5, // Number of transactions in short period
    rapidTransactionWindow: 5, // Minutes
    maxFailedAttempts: 3,
    unusualLocationScore: 0.7,
    unusualTimeScore: 0.6,
  };

  /**
   * Analyze transaction for fraud patterns
   */
  async analyzeTransaction(transaction: TransactionPattern): Promise<FraudAlert | null> {
    const alerts: FraudAlert[] = [];

    // Check various fraud patterns
    const amountAlert = await this.checkLargeAmount(transaction);
    if (amountAlert) alerts.push(amountAlert);

    const rapidTransactionAlert = await this.checkRapidTransactions(transaction.userId);
    if (rapidTransactionAlert) alerts.push(rapidTransactionAlert);

    const unusualPatternAlert = await this.checkUnusualPatterns(transaction);
    if (unusualPatternAlert) alerts.push(unusualPatternAlert);

    const velocityAlert = await this.checkVelocity(transaction.userId, transaction.amount);
    if (velocityAlert) alerts.push(velocityAlert);

    // Return the most severe alert
    if (alerts.length > 0) {
      const mostSevere = alerts.reduce((prev: FraudAlert, current: FraudAlert) => {
        const prevScore = SEVERITY_SCORES[prev.severity];
        const currentScore = SEVERITY_SCORES[current.severity];
        return prevScore > currentScore ? prev : current;
      });
      
      await this.createFraudAlert(mostSevere);
      return mostSevere;
    }

    return null;
  }

  /**
   * Check for unusually large transaction amounts
   */
  private async checkLargeAmount(transaction: TransactionPattern): Promise<FraudAlert | null> {
    if (transaction.amount > this.thresholds.maxSingleTransaction) {
      return {
        id: '',
        user_id: transaction.userId,
        alert_type: 'large_transaction',
        severity: 'high',
        description: `Unusually large transaction of ${transaction.amount} detected`,
        metadata: {
          amount: transaction.amount,
          type: transaction.type,
          timestamp: transaction.timestamp,
        },
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }
    return null;
  }

  /**
   * Check for rapid successive transactions
   */
  private async checkRapidTransactions(userId: string): Promise<FraudAlert | null> {
    const cutoffTime = new Date(Date.now() - this.thresholds.rapidTransactionWindow * 60000);
    
    const { data: recentTransactions, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', cutoffTime.toISOString())
      .order('created_at', { ascending: false }) as { data: Transaction[] | null; error: any };

    if (error) {
      console.error('Error checking rapid transactions:', error);
      return null;
    }

    if (recentTransactions && recentTransactions.length >= this.thresholds.rapidTransactionCount) {
      return {
        id: '',
        user_id: userId,
        alert_type: 'rapid_transactions',
        severity: 'medium',
        description: `${recentTransactions.length} transactions in ${this.thresholds.rapidTransactionWindow} minutes`,
        metadata: {
          transaction_count: recentTransactions.length,
          time_window: this.thresholds.rapidTransactionWindow,
          transactions: recentTransactions,
        },
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }
    return null;
  }

  /**
   * Check for unusual spending patterns
   */
  private async checkUnusualPatterns(transaction: TransactionPattern): Promise<FraudAlert | null> {
    // Get user's average transaction
    const { data: userStats, error: statsError } = await this.supabase
      .from('user_transaction_stats')
      .select('avg_amount, std_dev_amount, typical_locations, typical_times')
      .eq('user_id', transaction.userId)
      .single() as { data: UserTransactionStats | null; error: any };

    if (statsError || !userStats) return null;

    let riskScore = 0;
    const reasons: string[] = [];

    // Amount deviation check
    if (userStats.std_dev_amount > 0) {
      const deviation = (transaction.amount - userStats.avg_amount) / userStats.std_dev_amount;
      if (deviation > 2) {
        riskScore += 0.3;
        reasons.push('amount_significantly_higher_than_average');
      }
    } else if (transaction.amount > userStats.avg_amount * 2) {
      riskScore += 0.3;
      reasons.push('amount_significantly_higher_than_average');
    }

    // Location check - only if we have location data and typical locations
    if (transaction.location && userStats.typical_locations && userStats.typical_locations.length > 0) {
      const isTypicalLocation = userStats.typical_locations.some(
        (loc: string) => loc === transaction.location
      );
      if (!isTypicalLocation) {
        riskScore += this.thresholds.unusualLocationScore;
        reasons.push('unusual_location');
      }
    }

    // Time check (e.g., transactions at unusual hours)
    const hour = transaction.timestamp.getHours();
    const isTypicalHour = userStats.typical_times && userStats.typical_times.includes(hour);
    
    if (!isTypicalHour && (hour < 5 || hour > 22)) {
      riskScore += this.thresholds.unusualTimeScore;
      reasons.push('unusual_time_of_day');
    }

    if (riskScore > 0.5) {
      let severity: SeverityLevel = 'low';
      if (riskScore > 0.8) severity = 'high';
      else if (riskScore > 0.6) severity = 'medium';
      
      return {
        id: '',
        user_id: transaction.userId,
        alert_type: 'unusual_pattern',
        severity,
        description: `Unusual transaction pattern detected: ${reasons.join(', ')}`,
        metadata: {
          risk_score: riskScore,
          reasons,
          transaction: {
            amount: transaction.amount,
            type: transaction.type,
            timestamp: transaction.timestamp,
            location: transaction.location,
          },
        },
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Check transaction velocity (daily limits)
   */
  private async checkVelocity(userId: string, currentAmount: number): Promise<FraudAlert | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayTransactions, error } = await this.supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString()) as { data: { amount: number }[] | null; error: any };

    if (error) {
      console.error('Error checking velocity:', error);
      return null;
    }

    const dailyTotal = (todayTransactions || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0) + currentAmount;
    
    if (dailyTotal > this.thresholds.maxDailyTotal) {
      return {
        id: '',
        user_id: userId,
        alert_type: 'daily_limit_exceeded',
        severity: 'medium',
        description: `Daily transaction limit exceeded: ${dailyTotal} > ${this.thresholds.maxDailyTotal}`,
        metadata: {
          daily_total: dailyTotal,
          current_transaction: currentAmount,
          limit: this.thresholds.maxDailyTotal,
        },
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }
    return null;
  }

  /**
   * Create fraud alert in database
   */
  async createFraudAlert(alert: FraudAlert): Promise<void> {
    const { error } = await this.supabase
      .from('fraud_alerts')
      .insert({
        user_id: alert.user_id,
        alert_type: alert.alert_type,
        severity: alert.severity,
        description: alert.description,
        metadata: alert.metadata,
        status: alert.status,
      });

    if (error) {
      console.error('Error creating fraud alert:', error);
      throw new Error('Failed to create fraud alert');
    }

    // Create notification for user
    const { error: notifError } = await this.supabase.from('notifications').insert({
      user_id: alert.user_id,
      type: 'fraud_alert',
      title: 'Security Alert',
      message: alert.description,
      metadata: {
        alert_id: alert.id,
        severity: alert.severity,
      },
      is_read: false,
    });

    if (notifError) {
      console.error('Error creating notification:', notifError);
    }

    // If critical, also send SMS/Email immediately
    if (alert.severity === 'critical') {
      await this.sendCriticalAlert(alert);
    }
  }

  /**
   * Send critical alert via SMS/Email
   */
  private async sendCriticalAlert(alert: FraudAlert): Promise<void> {
    const { data: user, error } = await this.supabase
      .from('profiles')
      .select('email, phone')
      .eq('id', alert.user_id)
      .single();

    if (error) {
      console.error('Error fetching user for critical alert:', error);
      return;
    }

    if (user) {
      console.log(`CRITICAL ALERT for ${user.email}: ${alert.description}`);
      // Implement actual SMS/email sending here
      // await sendEmail(user.email, 'Critical Security Alert', alert.description);
      // await sendSMS(user.phone, `SECURITY: ${alert.description}`);
    }
  }

  /**
   * Get fraud alerts for admin
   */
  async getFraudAlerts(
    status?: string,
    severity?: string,
    userId?: string
  ): Promise<FraudAlertDB[]> {
    let query = this.supabase
      .from('fraud_alerts')
      .select('*, profiles(full_name, email, phone)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (severity && severity !== 'all') query = query.eq('severity', severity);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query as { data: FraudAlertDB[] | null; error: any };

    if (error) {
      console.error('Error fetching fraud alerts:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update fraud alert status
   */
  async updateAlertStatus(
    alertId: string,
    status: FraudAlert['status'],
    resolvedBy: string,
    notes?: string
  ): Promise<void> {
    const updateData: {
      status: string;
      resolved_by: string;
      resolved_at: string;
      resolution_notes?: string;
    } = {
      status,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    };
    
    if (notes) updateData.resolution_notes = notes;

    const { error } = await this.supabase
      .from('fraud_alerts')
      .update(updateData)
      .eq('id', alertId);

    if (error) {
      console.error('Error updating alert status:', error);
      throw new Error('Failed to update alert status');
    }
  }

  /**
   * Get fraud statistics for dashboard
   */
  async getFraudStats(): Promise<{
    total: number;
    by_severity: Record<SeverityLevel, number>;
    by_status: Record<string, number>;
    last_24h: number;
  }> {
    const { data: alerts, error } = await this.supabase
      .from('fraud_alerts')
      .select('severity, status, created_at') as { data: { severity: SeverityLevel; status: string; created_at: string }[] | null; error: any };

    if (error || !alerts) {
      console.error('Error fetching fraud stats:', error);
      return {
        total: 0,
        by_severity: { low: 0, medium: 0, high: 0, critical: 0 },
        by_status: { pending: 0, reviewing: 0, resolved: 0, false_positive: 0 },
        last_24h: 0,
      };
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats = {
      total: alerts.length,
      by_severity: {
        low: alerts.filter(a => a.severity === 'low').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        high: alerts.filter(a => a.severity === 'high').length,
        critical: alerts.filter(a => a.severity === 'critical').length,
      },
      by_status: {
        pending: alerts.filter(a => a.status === 'pending').length,
        reviewing: alerts.filter(a => a.status === 'reviewing').length,
        resolved: alerts.filter(a => a.status === 'resolved').length,
        false_positive: alerts.filter(a => a.status === 'false_positive').length,
      },
      last_24h: alerts.filter(a => new Date(a.created_at) > last24h).length,
    };

    return stats;
  }

  /**
   * Get user risk score
   */
  async getUserRiskScore(userId: string): Promise<number> {
    const { data: alerts, error } = await this.supabase
      .from('fraud_alerts')
      .select('severity, status')
      .eq('user_id', userId)
      .eq('status', 'pending') as { data: { severity: SeverityLevel; status: string }[] | null; error: any };

    if (error || !alerts || alerts.length === 0) return 0;

    const totalScore = alerts.reduce((sum: number, alert: { severity: SeverityLevel }) => {
      return sum + SEVERITY_SCORES[alert.severity];
    }, 0);
    
    // Normalize to 0-100
    return Math.min(100, Math.round((totalScore / (alerts.length * 4)) * 100));
  }
}

export const fraudDetectionService = new FraudDetectionService();