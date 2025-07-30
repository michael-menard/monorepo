# Email Testing with Ethereal Email

This document provides comprehensive guidance for setting up and using Ethereal Email for testing email functionality in the project.

## Table of Contents

- [Overview](#overview)
- [Setup Instructions](#setup-instructions)
- [Configuration](#configuration)
- [Testing Procedures](#testing-procedures)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

Ethereal Email is a free email testing service that captures emails sent during development and testing. It provides a web interface to view emails without actually sending them to real recipients.

### Why Ethereal Email?

- **Free**: No cost for testing
- **Real SMTP**: Uses actual SMTP protocol
- **Web Interface**: View emails in browser
- **No Spam**: Emails never reach real inboxes
- **Reliable**: Stable service for development

## Setup Instructions

### 1. Get Ethereal Email Credentials

1. Visit [https://ethereal.email/create](https://ethereal.email/create)
2. Click "Create Ethereal Account"
3. Copy the generated credentials:
   - **Host**: `smtp.ethereal.email`
   - **Port**: `587`
   - **Username**: Generated username
   - **Password**: Generated password

### 2. Configure Environment Variables

1. Copy the template file:
   ```bash
   cp env.ethereal.template .env
   ```

2. Update the `.env` file with your Ethereal credentials:
   ```env
   ETHEREAL_HOST=smtp.ethereal.email
   ETHEREAL_PORT=587
   ETHEREAL_USER=your_ethereal_username
   ETHEREAL_PASS=your_ethereal_password
   ETHEREAL_SECURE=false
   EMAIL_TESTING_SERVICE=ethereal
   ```

### 3. Verify Configuration

Run the verification script:
```bash
cd apps/api/auth-service
pnpm test:ethereal-setup
```

You should see:
```
✅ Ethereal Email transporter verified successfully
✅ Test email sent successfully
📧 Message ID: <message-id>
📧 Preview URL: https://ethereal.email/message/<message-id>
```

## Configuration

### Auth Service Configuration

The email configuration is located in `apps/api/auth-service/email/ethereal.config.ts`:

```typescript
const etherealConfig = {
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: process.env.ETHEREAL_USER,
    pass: process.env.ETHEREAL_PASS,
  },
};
```

### Email Templates

Email templates are defined in `apps/api/auth-service/email/emailTemplates.ts`:

- **Welcome Email**: Sent after successful email verification
- **Verification Email**: Sent during signup process
- **Password Reset**: Sent when requesting password reset

## Testing Procedures

### 1. Manual Testing

#### Test Email Verification Flow

1. Start the auth service:
   ```bash
   cd apps/api/auth-service
   pnpm dev
   ```

2. Start the web application:
   ```bash
   cd apps/web/lego-moc-instructions-app
   pnpm dev
   ```

3. Navigate to signup page and create an account
4. Check Ethereal Email web interface for verification email
5. Click the verification link or use the code

#### Test Password Reset Flow

1. Navigate to forgot password page
2. Enter email address
3. Check Ethereal Email for reset email
4. Use the reset link to change password

### 2. Automated Testing

#### Run E2E Tests

```bash
cd apps/web/lego-moc-instructions-app
pnpm test:e2e --grep "email verification"
```

#### Run Unit Tests

```bash
cd apps/api/auth-service
pnpm test
```

### 3. Email Cleanup

To clean up old emails from Ethereal:

```bash
cd apps/api/auth-service
pnpm email:cleanup
```

## Troubleshooting

### Common Issues

#### 1. Connection Failed

**Error**: `ECONNREFUSED` or `ETIMEDOUT`

**Solution**:
- Verify internet connection
- Check if Ethereal Email service is accessible
- Verify credentials are correct

#### 2. Authentication Failed

**Error**: `535 Authentication failed`

**Solution**:
- Regenerate Ethereal credentials
- Ensure credentials are copied correctly
- Check for extra spaces in environment variables

#### 3. Email Not Received

**Error**: Email not appearing in Ethereal interface

**Solution**:
- Check application logs for errors
- Verify email service is running
- Ensure correct email address is being used

#### 4. Test Failures

**Error**: E2E tests failing

**Solution**:
- Ensure auth service is running
- Check environment variables are loaded
- Verify email templates are correct

### Debug Commands

#### Test Email Configuration

```bash
cd apps/api/auth-service
pnpm test:ethereal-setup
```

#### Check Environment Variables

```bash
cd apps/api/auth-service
node -e "console.log(process.env.ETHEREAL_USER)"
```

#### Verify Transporter

```bash
cd apps/api/auth-service
node -e "const { verifyTransporter } = require('./dist/email/ethereal.config.js'); verifyTransporter();"
```

## Best Practices

### 1. Environment Management

- Never commit real email credentials to version control
- Use `.env` files for local development
- Use environment variables in production

### 2. Testing Strategy

- Test all email flows during development
- Include email testing in CI/CD pipeline
- Use different Ethereal accounts for different environments

### 3. Email Templates

- Keep templates simple and readable
- Include clear call-to-action buttons
- Test templates across different email clients

### 4. Error Handling

- Implement proper error handling for email failures
- Log email sending attempts
- Provide user feedback for email-related actions

### 5. Security

- Validate email addresses before sending
- Implement rate limiting for email sending
- Use secure SMTP connections in production

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Email Testing
on: [push, pull_request]

jobs:
  test-emails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:email
        env:
          ETHEREAL_USER: ${{ secrets.ETHEREAL_USER }}
          ETHEREAL_PASS: ${{ secrets.ETHEREAL_PASS }}
```

## Alternative Email Testing Services

If Ethereal Email is not suitable, consider these alternatives:

- **MailHog**: Self-hosted email testing
- **Mailtrap**: Professional email testing service
- **SendGrid Test Mode**: For SendGrid users
- **AWS SES Sandbox**: For AWS users

## Support

For issues related to email testing:

1. Check this documentation
2. Review the troubleshooting section
3. Check application logs
4. Verify Ethereal Email service status
5. Contact the development team

## References

- [Ethereal Email Documentation](https://ethereal.email/)
- [Nodemailer Documentation](https://nodemailer.com/)
- [Email Testing Best Practices](https://www.emailjs.com/docs/rest-api/send/) 