// src/utils/helpers.ts (without clsx)

/**
 * Format currency to Nigerian Naira
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date to readable format
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

/**
 * Format date to just date (no time)
 */
export function formatDateOnly(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
  }).format(new Date(date))
}

/**
 * Format time only
 */
export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    timeStyle: 'short',
  }).format(new Date(date))
}

/**
 * Generate a mock account number (10 digits)
 */
export function generateAccountNumber(): string {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString()
}

/**
 * Generate a unique transaction reference
 */
export function generateTransactionReference(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `TXN-${timestamp}-${random}`
}

/**
 * Generate a unique card reference
 */
export function generateCardReference(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CARD-${timestamp}-${random}`
}

/**
 * Mask a string (e.g., card number, account number)
 */
export function maskString(str: string, visibleStart: number = 4, visibleEnd: number = 4): string {
  if (!str) return ''
  if (str.length <= visibleStart + visibleEnd) return str
  const start = str.slice(0, visibleStart)
  const end = str.slice(-visibleEnd)
  const maskedLength = str.length - visibleStart - visibleEnd
  return start + '*'.repeat(maskedLength) + end
}

/**
 * Format card number with spaces every 4 digits
 */
export function formatCardNumber(cardNumber: string): string {
  if (!cardNumber) return ''
  return cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate Nigerian phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(0|234)?[7-9][0-1][0-9]{8}$/
  return phoneRegex.test(phone)
}

/**
 * Validate BVN (11 digits)
 */
export function isValidBVN(bvn: string): boolean {
  return /^\d{11}$/.test(bvn)
}

/**
 * Validate NIN (11 digits)
 */
export function isValidNIN(nin: string): boolean {
  return /^\d{11}$/.test(nin)
}

/**
 * Format phone number to international format
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    return '234' + cleaned.slice(1)
  }
  if (cleaned.startsWith('234')) {
    return cleaned
  }
  return '234' + cleaned
}

/**
 * Format phone number for display
 */
export function displayPhoneNumber(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
  }
  if (cleaned.length === 13 && cleaned.startsWith('234')) {
    return '0' + cleaned.slice(3).replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
  }
  return phone
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return (value / total) * 100
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  if (!name) return ''
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Check if object is empty
 */
export function isEmptyObject(obj: object): boolean {
  return Object.keys(obj).length === 0
}

/**
 * Generate random color
 */
export function getRandomColor(): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}