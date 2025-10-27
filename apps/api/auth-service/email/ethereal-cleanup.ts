/**
 * Ethereal Email Cleanup Helper
 *
 * Since Ethereal Email doesn't provide an API for automated cleanup,
 * this script provides instructions and helper functions for manual cleanup.
 */

interface EmailInfo {
  messageId: string
  previewUrl: string
  recipient: string
  subject: string
  date: string
}

export class EtherealCleanupHelper {
  private emails: EmailInfo[] = []

  /**
   * Track an email that was sent
   */
  trackEmail(info: EmailInfo): void {
    this.emails.push(info)
    console.log(`📧 Email tracked: ${info.subject} to ${info.recipient}`)
  }

  /**
   * Get all tracked emails
   */
  getTrackedEmails(): EmailInfo[] {
    return this.emails
  }

  /**
   * Print cleanup instructions
   */
  printCleanupInstructions(): void {
    console.log('\n🧹 Ethereal Email Cleanup Instructions\n')
    console.log('='.repeat(50))

    console.log('\n📧 Manual Cleanup (Recommended):')
    console.log('1. Go to https://ethereal.email')
    console.log('2. Login with your credentials:')
    console.log('   Username: winfield.smith3@ethereal.email')
    console.log('   Password: 4vPRUNzAk8gZbcDQtG')
    console.log('3. Select emails you want to delete')
    console.log('4. Click "Delete" or "Trash" button')
    console.log('5. Confirm deletion')

    console.log('\n🔄 Automatic Cleanup:')
    console.log('• Ethereal Email automatically cleans up old emails')
    console.log('• Emails are typically kept for 24-48 hours')
    console.log('• No action needed for automatic cleanup')

    console.log('\n📋 Tracked Emails:')
    if (this.emails.length === 0) {
      console.log('   No emails tracked yet')
    } else {
      this.emails.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email.subject} (${email.recipient})`)
        console.log(`      Preview: ${email.previewUrl}`)
      })
    }

    console.log('\n💡 Tips:')
    console.log('• Keep important test emails for verification')
    console.log('• Delete old test emails to keep inbox clean')
    console.log('• Use different email addresses for different test scenarios')
    console.log('• Check emails immediately after sending for best results')

    console.log('\n' + '='.repeat(50))
  }

  /**
   * Print current email statistics
   */
  printEmailStats(): void {
    console.log('\n📊 Email Statistics\n')
    console.log('='.repeat(30))
    console.log(`Total Tracked Emails: ${this.emails.length}`)

    if (this.emails.length > 0) {
      const recipients = new Set(this.emails.map(e => e.recipient))
      const subjects = new Set(this.emails.map(e => e.subject))

      console.log(`Unique Recipients: ${recipients.size}`)
      console.log(`Unique Subjects: ${subjects.size}`)
      console.log(`Latest Email: ${this.emails[this.emails.length - 1]?.date || 'N/A'}`)
    }

    console.log('\n📧 Recent Emails:')
    this.emails.slice(-5).forEach((email, index) => {
      console.log(`   ${this.emails.length - 4 + index}. ${email.subject}`)
      console.log(`      To: ${email.recipient} | Date: ${email.date}`)
    })

    console.log('='.repeat(30))
  }

  /**
   * Clear tracked emails (local only)
   */
  clearTrackedEmails(): void {
    const count = this.emails.length
    this.emails = []
    console.log(`🧹 Cleared ${count} tracked emails from local memory`)
    console.log('Note: This only clears local tracking, not actual emails in Ethereal')
  }
}

// Global instance
export const etherealCleanup = new EtherealCleanupHelper()

// Utility functions
export function trackEmail(info: EmailInfo): void {
  etherealCleanup.trackEmail(info)
}

export function getCleanupInstructions(): void {
  etherealCleanup.printCleanupInstructions()
}

export function getEmailStats(): void {
  etherealCleanup.printEmailStats()
}

export function clearLocalTracking(): void {
  etherealCleanup.clearTrackedEmails()
}
