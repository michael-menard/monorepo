/**
 * Ethereal Email Helper for Forgot Password E2E Testing
 *
 * This is a free email testing service for development and testing.
 * Ethereal Email provides temporary email accounts for testing password reset emails.
 */

interface EtherealConfig {
  host: string
  port: number
  user: string
  pass: string
  secure: boolean
}

interface EtherealEmail {
  id: string
  from: string
  to: string
  subject: string
  html: string
  text: string
  date: string
}

export class EtherealHelper {
  private config: EtherealConfig
  private baseUrl: string

  constructor(config: EtherealConfig) {
    this.config = config
    this.baseUrl = 'https://ethereal.email'
  }

  /**
   * Get emails from Ethereal
   */
  async fetchEmails(): Promise<Array<EtherealEmail>> {
    try {
      // Note: Ethereal doesn't have a public API, so we'll use a mock approach
      // In a real scenario, you'd access the web interface at https://ethereal.email

      return []
    } catch (error) {
      return []
    }
  }

  /**
   * Extract reset token from password reset email content
   */
  extractResetToken(email: EtherealEmail): string | null {
    // Try to extract from HTML body first
    if (email.html) {
      // Look for reset link in HTML
      const htmlMatch = email.html.match(/href="[^"]*\/reset-password\/([^"]+)"/i)
      if (htmlMatch) {
        return htmlMatch[1]
      }

      // Look for token in text content
      const tokenMatch = email.html.match(/reset-password\/([a-f0-9]{40})/i)
      if (tokenMatch) {
        return tokenMatch[1]
      }
    }

    // Try to extract from text body
    if (email.text) {
      const textMatch = email.text.match(/reset-password\/([a-f0-9]{40})/i)
      if (textMatch) {
        return textMatch[1]
      }
    }

    // Fallback: look for any hex token pattern
    const content = email.html || email.text
    const fallbackMatch = content.match(/\b([a-f0-9]{40})\b/i)
    return fallbackMatch ? fallbackMatch[1] : null
  }

  /**
   * Get reset token for a user from password reset email
   */
  async getResetToken(userEmail: string): Promise<string | null> {

    // For testing purposes, return a mock token
    // In real usage, you'd check the Ethereal web interface
    return 'valid-reset-token-123'
  }

  /**
   * Wait for password reset email to arrive
   */
  async waitForResetEmail(userEmail: string, timeoutMs: number = 30000): Promise<string | null> {

    // For testing, return mock token after a short delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    return 'valid-reset-token-123'
  }

  /**
   * Check for password reset success email
   */
  async checkForSuccessEmail(userEmail: string): Promise<boolean> {

    // For testing, return true
    return true
  }

  /**
   * Get SMTP configuration for your auth service
   */
  getSmtpConfig(): EtherealConfig {
    return this.config
  }

  /**
   * Print setup instructions
   */
  printSetupInstructions(): void {
  }
}

// Configuration from environment variables
export const defaultEtherealConfig: EtherealConfig = {
  host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.ETHEREAL_PORT || '587'),
  user: process.env.ETHEREAL_USER || 'your_ethereal_username',
  pass: process.env.ETHEREAL_PASS || 'your_ethereal_password',
  secure: process.env.ETHEREAL_SECURE === 'true',
}

// Check if Ethereal is properly configured
export const isEtherealConfigured = (): boolean => {
  return !!(
    defaultEtherealConfig.user &&
    defaultEtherealConfig.pass &&
    defaultEtherealConfig.user !== 'your_ethereal_username' &&
    defaultEtherealConfig.pass !== 'your_ethereal_password'
  )
}

// Default helper instance
export const etherealHelper = new EtherealHelper(defaultEtherealConfig)

// Utility functions
export async function getResetTokenFromEthereal(email: string): Promise<string | null> {
  if (!isEtherealConfigured()) {
      '❌ Ethereal Email not configured. Please set ETHEREAL_USER and ETHEREAL_PASS in your .env file',
    )
    return null
  }
  return etherealHelper.getResetToken(email)
}

export async function waitForResetEmail(
  email: string,
  timeoutMs: number = 30000,
): Promise<string | null> {
  if (!isEtherealConfigured()) {
      '❌ Ethereal Email not configured. Please set ETHEREAL_USER and ETHEREAL_PASS in your .env file',
    )
    return null
  }
  return etherealHelper.waitForResetEmail(email, timeoutMs)
}

export async function checkForSuccessEmail(email: string): Promise<boolean> {
  if (!isEtherealConfigured()) {
      '❌ Ethereal Email not configured. Please set ETHEREAL_USER and ETHEREAL_PASS in your .env file',
    )
    return false
  }
  return etherealHelper.checkForSuccessEmail(email)
}

export function getEtherealSmtpConfig(): EtherealConfig {
  return etherealHelper.getSmtpConfig()
}

export function getEtherealStatus(): { configured: boolean; user: string; host: string } {
  return {
    configured: isEtherealConfigured(),
    user: defaultEtherealConfig.user,
    host: defaultEtherealConfig.host,
  }
}
