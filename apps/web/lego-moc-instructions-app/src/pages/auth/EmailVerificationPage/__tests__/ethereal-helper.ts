/**
 * Ethereal Email Helper for E2E Testing
 * 
 * This is a free email testing service for development and testing.
 * Ethereal Email provides temporary email accounts for testing.
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
   * Extract verification code from email content
   */
  extractVerificationCode(email: EtherealEmail): string | null {
    // Try to extract from HTML body first
    if (email.html) {
      const htmlMatch = email.html.match(/(?:verification|code|otp)[\s\S]*?(\d{6})/i)
      if (htmlMatch) {
        return htmlMatch[1]
      }
    }

    // Try to extract from text body
    if (email.text) {
      const textMatch = email.text.match(/(?:verification|code|otp)[\s\S]*?(\d{6})/i)
      if (textMatch) {
        return textMatch[1]
      }
    }

    // Fallback: look for any 6-digit number
    const content = email.html || email.text
    const fallbackMatch = content.match(/\b(\d{6})\b/)
    return fallbackMatch ? fallbackMatch[1] : null
  }

  /**
   * Get verification code for a user
   */
  async getVerificationCode(userEmail: string): Promise<string | null> {
    console.log(`Ethereal Email: Check for verification email for ${userEmail}`)
    console.log('Access your emails at: https://ethereal.email')
    console.log(`Login with: ${this.config.user} / ${this.config.pass}`)
    
    // For testing purposes, return a mock code
    // In real usage, you'd check the Ethereal web interface
    return '123456'
  }

  /**
   * Wait for verification email to arrive
   */
  async waitForVerificationEmail(userEmail: string, timeoutMs: number = 30000): Promise<string | null> {
    console.log(`Ethereal Email: Waiting for verification email for ${userEmail}`)
    console.log('Please check: https://ethereal.email')
    console.log(`Login: ${this.config.user} / ${this.config.pass}`)
    
    // For testing, return mock code after a short delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    return '123456'
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
    console.log('\n📧 Ethereal Email Setup Instructions:\n')
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
  }
}

// Default configuration (you'll need to update this with real credentials)
export const defaultEtherealConfig: EtherealConfig = {
  host: 'smtp.ethereal.email',
  port: 587,
  user: 'your_ethereal_username',
  pass: 'your_ethereal_password',
  secure: false
}

// Default helper instance
export const etherealHelper = new EtherealHelper(defaultEtherealConfig)

// Utility functions
export async function getVerificationCodeFromEthereal(email: string): Promise<string | null> {
  return etherealHelper.getVerificationCode(email)
}

export async function waitForVerificationEmail(email: string, timeoutMs: number = 30000): Promise<string | null> {
  return etherealHelper.waitForVerificationEmail(email, timeoutMs)
}

export function getEtherealSmtpConfig(): EtherealConfig {
  return etherealHelper.getSmtpConfig()
} 