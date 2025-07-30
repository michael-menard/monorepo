# 🧹 Ethereal Email Cleanup Guide

## 📧 How to Clean Up Old Emails

### **Manual Cleanup (Recommended)**

1. **Access Ethereal Email**:
   - Go to: https://ethereal.email
   - Login with your credentials:
     - Username: `winfield.smith3@ethereal.email`
     - Password: `4vPRUNzAk8gZbcDQtG`

2. **Delete Emails**:
   - Select emails you want to delete
   - Click "Delete" or "Trash" button
   - Confirm deletion

### **Automatic Cleanup**

- ✅ **Ethereal Email automatically cleans up old emails**
- ✅ **Emails are typically kept for 24-48 hours**
- ✅ **No action needed for automatic cleanup**

## 🔧 Available Tools

### **Cleanup Script**
```bash
# Run cleanup instructions
node email-cleanup.js
```

### **Email Tracking**
The auth service now tracks sent emails for better management:
- Email tracking is built into the email service
- Tracks message ID, recipient, subject, and preview URL
- Helps with debugging and verification

## 📋 Email Management Tips

### **Keep Important Emails**
- ✅ Verification emails for testing
- ✅ Password reset emails for debugging
- ✅ Welcome emails for user flow testing

### **Delete Old Emails**
- 🗑️ Old test emails
- 🗑️ Duplicate verification emails
- 🗑️ Failed email attempts

### **Best Practices**
- Use different email addresses for different test scenarios
- Check emails immediately after sending for best results
- Keep inbox clean for easier testing
- Document important verification codes

## 📊 Recent Test Email

**From the latest test:**
- **Recipient**: `newuser123@example.com`
- **Subject**: `Verify your email`
- **Verification Code**: `318772`
- **Preview URL**: https://ethereal.email/message/aIl63afe0eT1BMRraIl9CiBpZpMT9m2NAAAAAk.5Py5iTzrV2GdSJwnlmzM

## 🎯 Testing Workflow

1. **Send Test Email**:
   ```bash
   curl -X POST http://localhost:9000/api/auth/sign-up \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'
   ```

2. **Check Ethereal Email**:
   - Go to https://ethereal.email
   - Login with credentials
   - Find the verification email

3. **Extract Verification Code**:
   - Copy the 6-digit verification code from the email

4. **Test Verification**:
   ```bash
   curl -X POST http://localhost:9000/api/auth/verify-email \
     -H "Content-Type: application/json" \
     -d '{"code":"123456"}'
   ```

5. **Clean Up**:
   - Delete old test emails
   - Keep important ones for reference

## 🔄 Migration from Mailtrap

### **What Was Removed**
- ✅ `mailtrap` package dependency
- ✅ `mailtrap/` directory and files
- ✅ Mailtrap environment variables
- ✅ Mailtrap configuration

### **What Was Added**
- ✅ `nodemailer` package for SMTP
- ✅ `email/ethereal.config.ts` for Ethereal configuration
- ✅ `email/ethereal.service.ts` for email functions
- ✅ `email/emailTemplates.ts` for HTML templates
- ✅ `email/ethereal-cleanup.ts` for cleanup tracking
- ✅ `email-cleanup.js` for cleanup instructions

## 🎉 Benefits of Ethereal Email

- ✅ **Completely free** - No cost or limitations
- ✅ **Real email delivery** - No mocking required
- ✅ **Web interface** - Easy to check emails
- ✅ **Perfect for personal projects** - No account required
- ✅ **Automatic cleanup** - Emails expire automatically
- ✅ **SMTP support** - Works with any email library

## 📚 Additional Resources

- [Ethereal Email](https://ethereal.email) - Main website
- [Nodemailer Documentation](https://nodemailer.com) - Email library docs
- [Email Templates](email/emailTemplates.ts) - HTML email templates
- [Email Service](email/ethereal.service.ts) - Email sending functions 