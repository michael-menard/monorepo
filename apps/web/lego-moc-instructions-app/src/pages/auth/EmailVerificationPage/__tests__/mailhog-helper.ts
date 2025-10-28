/**
 * MailHog Helper for E2E Testing
 *
 * MailHog is a local email testing tool that runs on your machine.
 * It captures emails sent by your application and provides a web interface.
 */

interface MailHogEmail {
  ID: string
  From: {
    Mailbox: string
    Domain: string
    Params: string
  }
  To: Array<{
    Mailbox: string
    Domain: string
    Params: string
  }>
  Content: {
    Headers: {
      'Content-Type': Array<string>
      Subject: Array<string>
      'Message-ID': Array<string>
      Date: Array<string>
    }
    Body: string
    Size: number
  }
  Created: string
  MIME: {
    Parts: Array<{
      Headers: {
        'Content-Type': Array<string>
      }
      Body: string
    }>
  }
}

interface MailHogConfig {
  host: string
  port: number
  apiPort: number
  webPort: number
}

export class MailHogHelper {
  private config: MailHogConfig
  private baseUrl: string
  private apiUrl: string

  constructor(
    config: MailHogConfig = { host: 'localhost', port: 1025, apiPort: 8025, webPort: 8025 },
  ) {
    this.config = config
    this.baseUrl = `http://${config.host}:${config.webPort}`
    this.apiUrl = `http://${config.host}:${config.apiPort}`
  }

  /**
   * Check if MailHog is running
   */
  async isRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v2/messages`)
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Get all emails from MailHog
   */
  async fetchEmails(limit: number = 50): Promise<Array<MailHogEmail>> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v2/messages?limit=${limit}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.statusText}`)
      }

      const data = await response.json()
      return data.items || []
    } catch (error) {
      return []
    }
  }

  /**
   * Find emails for a specific recipient
   */
  async findEmailsForRecipient(to: string): Promise<Array<MailHogEmail>> {
    const emails = await this.fetchEmails()
    return emails.filter(email =>
      email.To.some(
        recipient => `${recipient.Mailbox}@${recipient.Domain}`.toLowerCase() === to.toLowerCase(),
      ),
    )
  }

  /**
   * Find verification email
   */
  async findVerificationEmail(to: string): Promise<MailHogEmail | null> {
    const emails = await this.findEmailsForRecipient(to)
    return (
      emails.find(email => {
        const subject = email.Content.Headers.Subject[0] || ''
        return (
          subject.toLowerCase().includes('verification') || subject.toLowerCase().includes('verify')
        )
      }) || null
    )
  }

  /**
   * Extract verification code from email content
   */
  extractVerificationCode(email: MailHogEmail): string | null {
    const body = email.Content.Body || ''

    // Try to extract from HTML body first
    const htmlMatch = body.match(/(?:verification|code|otp)[\s\S]*?(\d{6})/i)
    if (htmlMatch) {
      return htmlMatch[1]
    }

    // Try to extract from MIME parts
    for (const part of email.MIME.Parts) {
      const partBody = part.Body || ''
      const match = partBody.match(/(?:verification|code|otp)[\s\S]*?(\d{6})/i)
      if (match) {
        return match[1]
      }
    }

    // Fallback: look for any 6-digit number
    const fallbackMatch = body.match(/\b(\d{6})\b/)
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
      return null
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

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return null
  }

  /**
   * Delete all emails
   */
  async deleteAllEmails(): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/api/v1/messages`, { method: 'DELETE' })
    } catch (error) {
    }
  }

  /**
   * Delete emails for a specific recipient
   */
  async deleteEmailsForRecipient(to: string): Promise<void> {
    const emails = await this.findEmailsForRecipient(to)
    for (const email of emails) {
      try {
        await fetch(`${this.apiUrl}/api/v1/messages/${email.ID}`, { method: 'DELETE' })
      } catch (error) {
      }
    }
  }

  /**
   * Get email statistics
   */
  async getStats(): Promise<{ totalEmails: number; recipients: Set<string> }> {
    const emails = await this.fetchEmails()
    const recipients = new Set<string>()

    emails.forEach(email => {
      email.To.forEach(recipient => {
        recipients.add(`${recipient.Mailbox}@${recipient.Domain}`)
      })
    })

    return { totalEmails: emails.length, recipients }
  }

  /**
   * Print email statistics
   */
  async printStats(): Promise<void> {
    const stats = await this.getStats()
  }

  /**
   * Print setup instructions
   */
  printSetupInstructions(): void {
  }
}

// Default configuration
export const defaultMailHogConfig: MailHogConfig = {
  host: 'localhost',
  port: 1025,
  apiPort: 8025,
  webPort: 8025,
}

// Default helper instance
export const mailHogHelper = new MailHogHelper(defaultMailHogConfig)

// Utility functions
export async function getVerificationCodeFromMailHog(email: string): Promise<string | null> {
  return mailHogHelper.getVerificationCode(email)
}

export async function waitForVerificationEmail(
  email: string,
  timeoutMs: number = 30000,
): Promise<string | null> {
  return mailHogHelper.waitForVerificationEmail(email, timeoutMs)
}

export async function clearMailHogEmails(): Promise<void> {
  return mailHogHelper.deleteAllEmails()
}

export async function getMailHogStats(): Promise<{ totalEmails: number; recipients: Set<string> }> {
  return mailHogHelper.getStats()
}
