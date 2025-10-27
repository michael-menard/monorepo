import nodemailer from 'nodemailer'

// Ethereal Email configuration
const etherealConfig = {
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'winfield.smith3@ethereal.email',
    pass: '4vPRUNzAk8gZbcDQtG',
  },
}

// Create transporter
export const transporter = nodemailer.createTransport(etherealConfig)

// Verify transporter configuration
export const verifyTransporter = async () => {
  try {
    await transporter.verify()
    console.log('✅ Ethereal Email transporter verified successfully')
    return true
  } catch (error) {
    console.error('❌ Ethereal Email transporter verification failed:', error)
    return false
  }
}

// Sender configuration
export const sender = {
  email: 'winfield.smith3@ethereal.email',
  name: 'Your App Name',
}

// Test email sending
export const testEmailSending = async () => {
  try {
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
    console.error('❌ Test email sending failed:', error)
    throw error
  }
}
