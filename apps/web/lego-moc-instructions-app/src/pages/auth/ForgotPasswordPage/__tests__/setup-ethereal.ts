#!/usr/bin/env node

/**
 * Ethereal Email Setup Script for Forgot Password E2E Testing
 *
 * This script helps you set up Ethereal Email for testing the forgot password flow.
 * Ethereal Email provides temporary email accounts for testing password reset emails.
 */

async function main() {
  console.log('📧 Ethereal Email Setup for Forgot Password E2E Testing\n')
  console.log('='.repeat(60))

  // Check environment variables
  const etherealUser = process.env.ETHEREAL_USER
  const etherealPass = process.env.ETHEREAL_PASS

  console.log('\n📊 Current Configuration Status:')
  console.log(
    `Configured: ${etherealUser && etherealPass && etherealUser !== 'your_ethereal_username' ? '✅ Yes' : '❌ No'}`,
  )
  console.log(`User: ${etherealUser || 'Not set'}`)
  console.log(`Host: ${process.env.ETHEREAL_HOST || 'smtp.ethereal.email'}`)
  console.log('')

  if (!etherealUser || !etherealPass || etherealUser === 'your_ethereal_username') {
    console.log('⚠️  Ethereal Email is not properly configured!')
    console.log('Please set ETHEREAL_USER and ETHEREAL_PASS in your .env file\n')
  }

  // Print setup instructions
  console.log('\n📧 Ethereal Email Setup Instructions for Password Reset:\n')
  console.log('1. Go to https://ethereal.email/create')
  console.log('2. Click "Create Ethereal Account"')
  console.log('3. Copy the SMTP credentials provided')
  console.log('4. Update your .env file with the credentials')
  console.log('5. Access your emails at https://ethereal.email')

  console.log('\n' + '='.repeat(60))

  console.log('\n🎯 Forgot Password Flow Benefits:')
  console.log('✅ Test password reset email delivery')
  console.log('✅ Verify reset link generation')
  console.log('✅ Test email content and formatting')
  console.log('✅ Validate reset token expiration')
  console.log('✅ Test success confirmation emails')
  console.log('✅ No real emails sent during testing')

  console.log('\n📋 Forgot Password Flow Setup Steps:')
  console.log('1. Visit https://ethereal.email/create')
  console.log('2. Click "Create Ethereal Account"')
  console.log('3. Copy the SMTP credentials')
  console.log('4. Update your .env file:')
  console.log(`
# Ethereal Email Configuration for Password Reset Testing
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_username
ETHEREAL_PASS=your_ethereal_password
ETHEREAL_SECURE=false
CLIENT_URL=http://localhost:3001
  `)

  console.log('\n🔧 How to Use for Password Reset Testing:')
  console.log('1. Configure your auth service to use Ethereal SMTP')
  console.log('2. Submit forgot password form with test email')
  console.log('3. Check emails at https://ethereal.email')
  console.log('4. Extract reset token from email content')
  console.log('5. Use reset token in ResetPasswordPage E2E tests')

  console.log('\n📧 Email Flow to Test:')
  console.log('• Password Reset Request Email (with reset link)')
  console.log('• Password Reset Success Email (confirmation)')
  console.log('• Email content validation')
  console.log('• Reset link functionality')

  console.log('\n📚 Alternative Free Options:')
  console.log('• Gmail App Passwords (if you have Gmail)')
  console.log('• MailHog (local email testing)')
  console.log('• Simple mock email service')

  console.log('\n' + '='.repeat(60))
  console.log('🎉 Ready to set up Ethereal Email for password reset testing!')
  console.log('📚 For more information, see: README.md')
}

// Run the setup
main().catch(error => {
  console.error('Setup failed:', error)
  process.exit(1)
})

export { main as setupEthereal }
