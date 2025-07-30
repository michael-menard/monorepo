# ForgotPasswordPage E2E Testing with Ethereal Email

This directory contains comprehensive E2E tests for the ForgotPasswordPage component, including integration with Ethereal Email for testing the password reset flow.

## 📧 Ethereal Email Integration

The tests use **Ethereal Email** - a free email testing service that provides temporary email accounts for development and testing. This allows us to test the complete password reset flow without sending real emails.

### 🎯 Benefits

- ✅ **Completely free** - No account required
- ✅ **Instant setup** - Get SMTP credentials immediately
- ✅ **Web interface** - View emails at https://ethereal.email
- ✅ **SMTP support** - Works with any email library
- ✅ **Perfect for testing** - No real emails sent
- ✅ **Automatic cleanup** - Emails are cleaned up automatically

## 🚀 Quick Setup

### 1. Create Ethereal Account

1. Visit [https://ethereal.email/create](https://ethereal.email/create)
2. Click "Create Ethereal Account"
3. Copy the SMTP credentials provided

### 2. Configure Environment

Add the following to your `.env` file:

```bash
# Ethereal Email Configuration for Password Reset Testing
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_username
ETHEREAL_PASS=your_ethereal_password
ETHEREAL_SECURE=false
CLIENT_URL=http://localhost:3001
```

### 3. Configure Auth Service

Update your auth service to use Ethereal SMTP for testing. The auth service should already be configured to use Ethereal based on the existing setup.

## 📋 Test Structure

### E2E Test Categories

1. **Complete Forgot Password Flow**
   - Full password reset journey
   - Network error handling

2. **Form Validation E2E**
   - Email format validation
   - Empty submission handling
   - Special character handling

3. **Accessibility E2E**
   - Keyboard navigation
   - ARIA labels
   - Screen reader support

4. **Mobile Responsiveness E2E**
   - Mobile viewport testing
   - Touch interactions
   - Virtual keyboard handling

5. **Cross-Browser Compatibility**
   - Browser consistency
   - Input method testing

6. **Error Recovery Scenarios**
   - Validation error recovery
   - API error recovery
   - Multiple submission handling

7. **Performance E2E**
   - Page load time
   - Interaction responsiveness
   - Slow network handling

8. **Security E2E**
   - XSS prevention
   - HTML injection handling
   - Sensitive data protection

9. **Navigation E2E**
   - Back to login navigation
   - Browser back button handling

10. **Email Integration E2E**
    - Ethereal email testing
    - Reset token extraction
    - Success email verification

## 🔧 Running Tests

### Run All ForgotPasswordPage E2E Tests

```bash
npx playwright test src/pages/auth/ForgotPasswordPage/__tests__/ForgotPasswordPage.e2e.test.ts
```

### Run Specific Test Categories

```bash
# Form validation tests
npx playwright test --grep "Form Validation E2E"

# Accessibility tests
npx playwright test --grep "Accessibility E2E"

# Email integration tests (requires Ethereal setup)
npx playwright test --grep "Email Integration E2E"
```

### Run with Ethereal Email Integration

```bash
# Set environment variables
export ETHEREAL_USER=your_ethereal_username
export ETHEREAL_PASS=your_ethereal_password

# Run email integration tests
npx playwright test --grep "Email Integration E2E"
```

## 📧 Email Flow Testing

### Password Reset Request Email

1. **Trigger**: User submits forgot password form
2. **Email Content**: Contains reset link with token
3. **Token Format**: 40-character hex string
4. **Expiration**: 1 hour
5. **Testing**: Extract token from email content

### Password Reset Success Email

1. **Trigger**: User successfully resets password
2. **Email Content**: Confirmation message
3. **Testing**: Verify email was sent

### Token Extraction

The `ethereal-helper.ts` includes functions to extract reset tokens from email content:

```typescript
// Extract reset token from email
const resetToken = await waitForResetEmail('user@example.com', 30000)

// Use token in reset password page
await page.goto(`/auth/reset-password/${resetToken}`)
```

## 🛠 Helper Functions

### EtherealHelper Class

- `getResetToken(email)`: Get reset token for user
- `waitForResetEmail(email, timeout)`: Wait for reset email
- `checkForSuccessEmail(email)`: Check for success email
- `extractResetToken(email)`: Extract token from email content

### Utility Functions

- `getResetTokenFromEthereal(email)`: Get token with error handling
- `waitForResetEmail(email, timeout)`: Wait for email with timeout
- `checkForSuccessEmail(email)`: Check for success email
- `getEtherealSmtpConfig()`: Get SMTP configuration

## 🔍 Manual Testing

### View Emails in Ethereal

1. Go to [https://ethereal.email](https://ethereal.email)
2. Login with your Ethereal credentials
3. View received emails
4. Check email content and extract tokens

### Test Complete Flow

1. Submit forgot password form
2. Check Ethereal for reset email
3. Extract reset token from email
4. Navigate to reset password page with token
5. Complete password reset
6. Check for success confirmation email

## 🚨 Troubleshooting

### Common Issues

1. **Ethereal not configured**
   - Set `ETHEREAL_USER` and `ETHEREAL_PASS` environment variables
   - Ensure auth service is using Ethereal SMTP

2. **Emails not received**
   - Check Ethereal web interface
   - Verify SMTP configuration
   - Check auth service logs

3. **Token extraction fails**
   - Verify email content format
   - Check token regex patterns
   - Use manual extraction if needed

4. **Tests timing out**
   - Increase timeout values
   - Check network connectivity
   - Verify auth service is running

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
export DEBUG=ethereal:*

# Run tests with debug output
npx playwright test --grep "Email Integration E2E"
```

## 📚 Related Files

- `ethereal-helper.ts` - Ethereal email helper functions
- `setup-ethereal.ts` - Setup script for Ethereal configuration
- `ForgotPasswordPage.e2e.test.ts` - Main E2E test file
- `README.md` - This documentation

## 🔗 External Resources

- [Ethereal Email](https://ethereal.email) - Free email testing service
- [Playwright Documentation](https://playwright.dev) - E2E testing framework
- [Auth Service Email Templates](../api/auth-service/email/emailTemplates.ts) - Email templates

## 📝 Notes

- Ethereal Email is free and doesn't require registration
- Emails are automatically cleaned up after some time
- The service is perfect for development and testing
- No real emails are sent during testing
- Reset tokens are 40-character hex strings generated by the auth service 