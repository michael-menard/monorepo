#!/usr/bin/env node

/**
 * MailHog Setup Script for E2E Testing
 *
 * This script helps you set up MailHog as a local email testing tool.
 * MailHog runs on your machine and captures emails sent by your application.
 */

import { mailHogHelper } from './mailhog-helper'

async function main() {
  console.log('📧 MailHog E2E Testing Setup\n')
  console.log('='.repeat(50))

  // Print setup instructions
  mailHogHelper.printSetupInstructions()

  console.log('\n' + '='.repeat(50))

  console.log('\n🎯 Benefits of MailHog:')
  console.log('✅ Completely free')
  console.log('✅ Runs locally on your machine')
  console.log('✅ No external dependencies')
  console.log('✅ Web interface to view emails')
  console.log('✅ API for automated testing')
  console.log('✅ Perfect for development and testing')

  console.log('\n📋 Quick Setup Steps:')
  console.log('1. Install MailHog:')
  console.log('   brew install mailhog')
  console.log('')
  console.log('2. Start MailHog:')
  console.log('   mailhog')
  console.log('')
  console.log('3. Access web interface:')
  console.log('   http://localhost:8025')
  console.log('')
  console.log('4. Configure your auth service SMTP:')
  console.log('   Host: localhost')
  console.log('   Port: 1025')
  console.log('   No authentication required')
  console.log('')
  console.log('5. Update your .env file:')
  console.log(`
# MailHog Configuration (Local Email Testing)
MAILHOG_HOST=localhost
MAILHOG_PORT=1025
MAILHOG_API_PORT=8025
MAILHOG_WEB_PORT=8025
  `)

  console.log('\n🔧 How to Use:')
  console.log('1. Start MailHog: mailhog')
  console.log('2. Configure your auth service to use MailHog SMTP')
  console.log('3. Send verification emails to any address')
  console.log('4. Check emails at http://localhost:8025')
  console.log('5. Use the verification codes in your E2E tests')

  console.log('\n📚 Alternative Free Options:')
  console.log('• Ethereal Email (online service)')
  console.log('• Gmail App Passwords (if you have Gmail)')
  console.log('• Simple mock email service')

  console.log('\n' + '='.repeat(50))
  console.log('🎉 Ready to set up MailHog!')
  console.log('📚 For more information, see: README.md')
}

// Run the setup
main().catch(error => {
  console.error('Setup failed:', error)
  process.exit(1)
})

export { main as setupMailHog }
