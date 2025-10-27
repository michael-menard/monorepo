# 🚀 Quick Setup Guide for ForgotPasswordPage E2E Testing

## 📧 Ethereal Email Setup

### Step 1: Create Ethereal Account

1. Visit [https://ethereal.email/create](https://ethereal.email/create)
2. Click "Create Ethereal Account"
3. Copy the SMTP credentials provided

### Step 2: Configure Environment

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

### Step 3: Verify Auth Service Configuration

Ensure your auth service is configured to use Ethereal SMTP. The auth service should already be set up based on the existing EmailVerificationPage configuration.

## 🧪 Running Tests

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

## 📧 Email Flow Testing

### Complete Password Reset Flow

1. **Submit Forgot Password Form**
   - Navigate to `/auth/forgot-password`
   - Enter valid email address
   - Click "Send Reset Link"

2. **Check Ethereal Email**
   - Go to [https://ethereal.email](https://ethereal.email)
   - Login with your Ethereal credentials
   - Look for password reset email

3. **Extract Reset Token**
   - Open the password reset email
   - Copy the reset token from the link
   - Token format: 40-character hex string

4. **Complete Password Reset**
   - Navigate to `/auth/reset-password/{token}`
   - Enter new password
   - Submit form

5. **Verify Success Email**
   - Check Ethereal for success confirmation email

## 🔧 Test Files Created

- `ethereal-helper.ts` - Helper functions for Ethereal email integration
- `ForgotPasswordPage.e2e.test.ts` - Comprehensive E2E test suite
- `README.md` - Detailed documentation
- `SETUP_GUIDE.md` - This quick setup guide

## 🎯 Benefits

- ✅ **Free email testing** - No cost, no registration required
- ✅ **Complete flow testing** - Test from forgot password to success
- ✅ **Real email validation** - Verify email content and formatting
- ✅ **Token extraction** - Automatically extract reset tokens
- ✅ **Success verification** - Confirm success emails are sent

## 🚨 Troubleshooting

### Common Issues

1. **"Ethereal not configured"**
   - Set `ETHEREAL_USER` and `ETHEREAL_PASS` in your `.env` file
   - Restart your development server

2. **"No emails received"**
   - Check [https://ethereal.email](https://ethereal.email)
   - Verify SMTP credentials are correct
   - Check auth service logs

3. **"Token extraction fails"**
   - Manually check email content in Ethereal
   - Verify email template format
   - Use manual token extraction if needed

### Debug Mode

```bash
# Set environment variables
export ETHEREAL_USER=your_username
export ETHEREAL_PASS=your_password

# Run with debug output
npx playwright test --grep "Email Integration E2E" --reporter=list
```

## 📚 Next Steps

1. Set up Ethereal Email credentials
2. Run the E2E tests
3. Verify email flow works correctly
4. Use the extracted tokens in ResetPasswordPage tests

The setup is now complete! You can test the full password reset flow with real email integration using Ethereal Email.
