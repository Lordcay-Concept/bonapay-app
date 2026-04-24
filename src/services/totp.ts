import * as OTPAuth from 'otpauth'

interface TOTPConfig {
  issuer: string
  label: string
  algorithm?: string
  digits?: number
  period?: number
}

export function createAuthenticator(config?: Partial<TOTPConfig>) {
  const defaultConfig = {
    issuer: 'BonaPay',
    label: 'BonaPay',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  }

  const mergedConfig = { ...defaultConfig, ...config }

  return {
    /**
     * Generate a new TOTP secret
     */
    generateSecret(): string {
      return new OTPAuth.Secret().base32
    },

    /**
     * Generate QR code URL for 2FA setup
     */
    async generateQRCode(secret: string, accountName: string): Promise<string> {
      const totp = new OTPAuth.TOTP({
        issuer: mergedConfig.issuer,
        label: accountName,
        algorithm: mergedConfig.algorithm as any,
        digits: mergedConfig.digits,
        period: mergedConfig.period,
        secret: secret,
      })

      return totp.toString()
    },

    /**
     * Verify TOTP code
     */
    verify(secret: string, token: string): boolean {
      const totp = new OTPAuth.TOTP({
        issuer: mergedConfig.issuer,
        algorithm: mergedConfig.algorithm as any,
        digits: mergedConfig.digits,
        period: mergedConfig.period,
        secret: secret,
      })

      // Allow 1 digit of drift (30 seconds)
      const delta = totp.validate({ token, window: 1 })
      return delta !== null
    },

    /**
     * Generate recovery codes
     */
    generateRecoveryCodes(count: number = 10): string[] {
      return Array.from({ length: count }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      )
    },
  }
}