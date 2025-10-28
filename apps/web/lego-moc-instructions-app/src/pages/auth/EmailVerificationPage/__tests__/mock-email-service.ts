/**
 * Mock Email Service for E2E Testing
 *
 * This is a simple in-memory email service for testing.
 * Perfect for personal projects where you don't need real email delivery.
 */

interface MockEmail {
  id: string
  from: string
  to: string
  subject: string
  html: string
  text: string
  date: string
}

interface MockEmailConfig {
  defaultVerificationCode: string
  emailDelay: number
}

export class MockEmailService {
  private emails: Map<string, Array<MockEmail>> = new Map()
  private config: MockEmailConfig

  constructor(config: MockEmailConfig = { defaultVerificationCode: '123456', emailDelay: 1000 }) {
    this.config = config
  }

  /**
   * Send a mock email
   */
  async sendEmail(to: string, subject: string, html: string, text: string): Promise<string> {
    const email: MockEmail = {
      id: Math.random().toString(36).substring(2, 15),
      from: 'noreply@your-app.com',
      to,
      subject,
      html,
      text,
      date: new Date().toISOString(),
    }

    // Store email by recipient
    if (!this.emails.has(to)) {
      this.emails.set(to, [])
    }
    this.emails.get(to)!.push(email)


    // Simulate email delivery delay
    await new Promise(resolve => setTimeout(resolve, this.config.emailDelay))

    return email.id
  }

  /**
   * Get emails for a recipient
   */
  async getEmails(to: string): Promise<Array<MockEmail>> {
    return this.emails.get(to) || []
  }

  /**
   * Find verification email
   */
  async findVerificationEmail(to: string): Promise<MockEmail | null> {
    const emails = await this.getEmails(to)
    return (
      emails.find(
        email =>
          email.subject.toLowerCase().includes('verification') ||
          email.subject.toLowerCase().includes('verify'),
      ) || null
    )
  }

  /**
   * Extract verification code from email
   */
  extractVerificationCode(email: MockEmail): string | null {
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
  async getVerificationCode(to: string): Promise<string | null> {
    const email = await this.findVerificationEmail(to)
    if (!email) {
      return null
    }

    const code = this.extractVerificationCode(email)
    if (!code) {
      return this.config.defaultVerificationCode
    }

    return code
  }

  /**
   * Wait for verification email to arrive
   */
  async waitForVerificationEmail(to: string, timeoutMs: number = 30000): Promise<string | null> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const code = await this.getVerificationCode(to)
      if (code) {
        return code
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return this.config.defaultVerificationCode
  }

  /**
   * Clear all emails
   */
  clearEmails(): void {
    this.emails.clear()
  }

  /**
   * Clear emails for a specific recipient
   */
  clearEmailsForRecipient(to: string): void {
    this.emails.delete(to)
  }

  /**
   * Get email statistics
   */
  getStats(): { totalEmails: number; recipients: number } {
    const totalEmails = Array.from(this.emails.values()).reduce(
      (sum, emails) => sum + emails.length,
      0,
    )
    const recipients = this.emails.size

    return { totalEmails, recipients }
  }

  /**
   * Print email statistics
   */
  printStats(): void {
    const stats = this.getStats()
  }
}

// Global mock email service instance
export const mockEmailService = new MockEmailService()

// Utility functions
export async function sendMockEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<string> {
  return mockEmailService.sendEmail(to, subject, html, text)
}

export async function getVerificationCodeFromMock(email: string): Promise<string | null> {
  return mockEmailService.getVerificationCode(email)
}

export async function waitForVerificationEmail(
  email: string,
  timeoutMs: number = 30000,
): Promise<string | null> {
  return mockEmailService.waitForVerificationEmail(email, timeoutMs)
}

export function clearMockEmails(): void {
  mockEmailService.clearEmails()
}

export function getMockEmailStats(): { totalEmails: number; recipients: number } {
  return mockEmailService.getStats()
}
