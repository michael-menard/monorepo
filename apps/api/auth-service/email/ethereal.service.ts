import nodemailer from 'nodemailer'
import { transporter, sender } from './ethereal.config'
import { trackEmail } from './ethereal-cleanup'
import {
  VERIFICATION_EMAIL_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
} from './emailTemplates'

export const sendVerificationEmail = async (email: string, verificationToken: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      to: email,
      subject: 'Verify your email',
      html: VERIFICATION_EMAIL_TEMPLATE.replace('{verificationCode}', verificationToken),
    })

    console.log('✅ Verification email sent successfully')
    console.log('📧 Message ID:', info.messageId)
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info))

    // Track email for cleanup
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      trackEmail({
        messageId: info.messageId,
        previewUrl,
        recipient: email,
        subject: 'Verify your email',
        date: new Date().toISOString(),
      })
    }

    return info
  } catch (error) {
    console.error('❌ Error sending verification email:', error)
    throw new Error(`Error sending verification email: ${error}`)
  }
}

export const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      to: email,
      subject: 'Welcome to Your App!',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Thank you for joining our platform. We're excited to have you on board!</p>
        <p>Best regards,<br>The Team</p>
      `,
    })

    console.log('✅ Welcome email sent successfully')
    console.log('📧 Message ID:', info.messageId)
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info))

    return info
  } catch (error) {
    console.error('❌ Error sending welcome email:', error)
    throw new Error(`Error sending welcome email: ${error}`)
  }
}

export const sendPasswordResetEmail = async (email: string, resetURL: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      to: email,
      subject: 'Reset your password',
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace('{resetURL}', resetURL),
    })

    console.log('✅ Password reset email sent successfully')
    console.log('📧 Message ID:', info.messageId)
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info))

    return info
  } catch (error) {
    console.error('❌ Error sending password reset email:', error)
    throw new Error(`Error sending password reset email: ${error}`)
  }
}

export const sendResetSuccessEmail = async (email: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      to: email,
      subject: 'Password Reset Successful',
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
    })

    console.log('✅ Password reset success email sent successfully')
    console.log('📧 Message ID:', info.messageId)
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info))

    return info
  } catch (error) {
    console.error('❌ Error sending password reset success email:', error)
    throw new Error(`Error sending password reset success email: ${error}`)
  }
}

// Test function to verify email configuration
export const testEmailConfiguration = async () => {
  try {
    console.log('🧪 Testing Ethereal Email configuration...')

    // Verify transporter
    await transporter.verify()
    console.log('✅ Transporter verified successfully')

    // Send test email
    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      to: 'test@example.com',
      subject: 'Test Email from Ethereal',
      text: 'This is a test email from Ethereal Email',
      html: '<p>This is a test email from <b>Ethereal Email</b></p>',
    })

    console.log('✅ Test email sent successfully')
    console.log('📧 Message ID:', info.messageId)
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info))

    return info
  } catch (error) {
    console.error('❌ Email configuration test failed:', error)
    throw error
  }
}
