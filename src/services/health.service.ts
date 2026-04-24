import { supabase } from './supabase'
export interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'down'
  response_time: number
  last_checked: string
  message?: string
}

export interface SystemMetrics {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  active_users: number
  requests_per_minute: number
  error_rate: number
  uptime: number
}

export class HealthService {
  private supabase = supabase;

  /**
   * Check database health
   */
  async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now()
    try {
      const { error } = await this.supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true })

      const responseTime = Date.now() - start

      if (error) {
        return {
          service: 'Database',
          status: 'down',
          response_time: responseTime,
          last_checked: new Date().toISOString(),
          message: error.message,
        }
      }

      return {
        service: 'Database',
        status: 'healthy',
        response_time: responseTime,
        last_checked: new Date().toISOString(),
      }
    } catch (error: any) {
      return {
        service: 'Database',
        status: 'down',
        response_time: Date.now() - start,
        last_checked: new Date().toISOString(),
        message: error.message,
      }
    }
  }

  /**
   * Check Supabase Auth health
   */
  async checkAuth(): Promise<HealthCheck> {
    const start = Date.now()
    try {
      const { error } = await this.supabase.auth.getSession()

      const responseTime = Date.now() - start

      if (error) {
        return {
          service: 'Authentication',
          status: 'degraded',
          response_time: responseTime,
          last_checked: new Date().toISOString(),
          message: error.message,
        }
      }

      return {
        service: 'Authentication',
        status: 'healthy',
        response_time: responseTime,
        last_checked: new Date().toISOString(),
      }
    } catch (error: any) {
      return {
        service: 'Authentication',
        status: 'down',
        response_time: Date.now() - start,
        last_checked: new Date().toISOString(),
        message: error.message,
      }
    }
  }

  /**
   * Check API health
   */
  async checkAPI(): Promise<HealthCheck> {
    const start = Date.now()
    try {
      const response = await fetch('/api/health')
      const responseTime = Date.now() - start

      if (!response.ok) {
        return {
          service: 'API',
          status: 'degraded',
          response_time: responseTime,
          last_checked: new Date().toISOString(),
          message: `HTTP ${response.status}`,
        }
      }

      return {
        service: 'API',
        status: 'healthy',
        response_time: responseTime,
        last_checked: new Date().toISOString(),
      }
    } catch (error: any) {
      return {
        service: 'API',
        status: 'down',
        response_time: Date.now() - start,
        last_checked: new Date().toISOString(),
        message: error.message,
      }
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    // Get active users (logged in within last 5 minutes)
    const { count: activeUsers } = await this.supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())

    // Get error rate from transactions
    const { data: failedTransactions } = await this.supabase
      .from('transactions')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const totalTx = failedTransactions?.length || 0
    const failedTx = failedTransactions?.filter(t => t.status === 'failed').length || 0
    const errorRate = totalTx > 0 ? (failedTx / totalTx) * 100 : 0

    return {
      cpu_usage: 35, // Mock data - would get from actual server metrics
      memory_usage: 42,
      disk_usage: 28,
      active_users: activeUsers || 0,
      requests_per_minute: 156,
      error_rate: errorRate,
      uptime: 99.98,
    }
  }

  /**
   * Run full health check
   */
  async runHealthCheck(): Promise<HealthCheck[]> {
    const [db, auth, api] = await Promise.all([
      this.checkDatabase(),
      this.checkAuth(),
      this.checkAPI(),
    ])

    return [db, auth, api]
  }

  /**
   * Log health event
   */
  async logHealthEvent(status: string, details: any): Promise<void> {
    await this.supabase
      .from('health_logs')
      .insert({
        status,
        details,
        created_at: new Date().toISOString(),
      })
  }
}

export const healthService = new HealthService()