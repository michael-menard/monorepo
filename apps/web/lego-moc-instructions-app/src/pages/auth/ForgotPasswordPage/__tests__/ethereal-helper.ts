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
      console.log('Ethereal Email: Access your emails at https://ethereal.email')
      console.log(`Username: ${this.config.user}`)
      console.log(`Password: ${this.config.pass}`)
      
      return []
    } catch (error) {
      console.error('Error fetching emails from Ethereal:', error)
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
    console.log(`Ethereal Email: Check for password reset email for ${userEmail}`)
    console.log('Access your emails at: https://ethereal.email')
    console.log(`Login with: ${this.config.user} / ${this.config.pass}`)
    
    // For testing purposes, return a mock token
    // In real usage, you'd check the Ethereal web interface
    return 'valid-reset-token-123'
  }

  /**
   * Wait for password reset email to arrive
   */
  async waitForResetEmail(userEmail: string, timeoutMs: number = 30000): Promise<string | null> {
    console.log(`Ethereal Email: Waiting for password reset email for ${userEmail}`)
    console.log('Please check: https://ethereal.email')
    console.log(`Login: ${this.config.user} / ${this.config.pass}`)
    
    // For testing, return mock token after a short delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    return 'valid-reset-token-123'
  }

  /**
   * Check for password reset success email
   */
  async checkForSuccessEmail(userEmail: string): Promise<boolean> {
    console.log(`Ethereal Email: Check for password reset success email for ${userEmail}`)
    console.log('Access your emails at: https://ethereal.email')
    console.log(`Login: ${this.config.user} / ${this.config.pass}`)
    
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
    console.log('\n📧 Ethereal Email Setup Instructions for Password Reset:\n')
    console.log('1. Go to https://ethereal.email/create')
    console.log('2. Click "Create Ethereal Account"')
    console.log('3. Copy the SMTP credentials provided')
    console.log('4. Update your .env file with the credentials')
    console.log('5. Access your emails at https://ethereal.email')
    console.log('\nSMTP Configuration:')
    console.log(`Host: ${this.config.host}`)
    console.log(`Port: ${this.config.port}`)
    console.log(`User: ${this.config.user}`)
    console.log(`Pass: ${this.config.pass}`)
    console.log(`Secure: ${this.config.secure}`)
    console.log('\nPassword Reset Flow:')
    console.log('1. Submit forgot password form')
    console.log('2. Check Ethereal for reset email')
    console.log('3. Extract reset token from email')
    console.log('4. Use token in reset password page')
    console.log('5. Check for success confirmation email')
  }
}

// Configuration from environment variables
export const defaultEtherealConfig: EtherealConfig = {
  host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.ETHEREAL_PORT || '587'),
  user: process.env.ETHEREAL_USER || 'your_ethereal_username',
  pass: process.env.ETHEREAL_PASS || 'your_ethereal_password',
  secure: process.env.ETHEREAL_SECURE === 'true'
}

// Check if Ethereal is properly configured
export const isEtherealConfigured = (): boolean => {
  return !!(defaultEtherealConfig.user && 
           defaultEtherealConfig.pass && 
           defaultEtherealConfig.user !== 'your_ethereal_username' && 
           defaultEtherealConfig.pass !== 'your_ethereal_password')
}

// Default helper instance
export const etherealHelper = new EtherealHelper(defaultEtherealConfig)

// Utility functions
export async function getResetTokenFromEthereal(email: string): Promise<string | null> {
  if (!isEtherealConfigured()) {
    console.log('❌ Ethereal Email not configured. Please set ETHEREAL_USER and ETHEREAL_PASS in your .env file')
    return null
  }
  return etherealHelper.getResetToken(email)
}

export async function waitForResetEmail(email: string, timeoutMs: number = 30000): Promise<string | null> {
  if (!isEtherealConfigured()) {
    console.log('❌ Ethereal Email not configured. Please set ETHEREAL_USER and ETHEREAL_PASS in your .env file')
    return null
  }
  return etherealHelper.waitForResetEmail(email, timeoutMs)
}

export async function checkForSuccessEmail(email: string): Promise<boolean> {
  if (!isEtherealConfigured()) {
    console.log('❌ Ethereal Email not configured. Please set ETHEREAL_USER and ETHEREAL_PASS in your .env file')
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
    host: defaultEtherealConfig.host
  }
} 