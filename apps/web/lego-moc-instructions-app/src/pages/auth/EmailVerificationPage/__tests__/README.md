# EmailVerificationPage E2E Testing Guide

This directory contains comprehensive E2E tests for the EmailVerificationPage component, including integration with multiple email testing services for real email verification testing.

## 📁 Test Files

- **`EmailVerificationPage.e2e.test.ts`** - Complete E2E tests with Ethereal Email integration
- **`ethereal-helper.ts`** - Utility for interacting with Ethereal Email
- **`mailhog-helper.ts`** - Utility for interacting with MailHog (local email testing)
- **`mock-email-service.ts`** - In-memory email service for unit testing
- **`setup-ethereal.ts`** - Setup script for Ethereal Email
- **`setup-mailhog.ts`** - Setup script for MailHog

## 🚀 Quick Start

### Prerequisites

1. **Install Playwright** (if not already installed):
   ```bash
   pnpm add -D @playwright/test
   npx playwright install
   ```

2. **Choose an Email Testing Service**:
   - **Ethereal Email** (Recommended): Free online service
   - **MailHog**: Local email testing tool
   - **Mock Service**: In-memory testing (no setup required)

### Environment Setup

Create a `.env` file in the project root:

```env
# Ethereal Email Configuration (Recommended)
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_username
ETHEREAL_PASS=your_ethereal_password
ETHEREAL_SECURE=false

# Test Configuration
VITE_AUTH_SERVICE_BASE_URL=http://localhost:9000
```

### Running Tests

#### Complete E2E Tests (with Ethereal Email)
```bash
# Run all E2E tests
npx playwright test EmailVerificationPage.e2e.test.ts

# Run specific test
npx playwright test -g "should complete full email verification journey"

# Run with UI
npx playwright test --ui
```

#### Email Service Setup
```bash
# Setup Ethereal Email (Recommended)
pnpm test:ethereal-setup

# Setup MailHog (Local)
pnpm test:mailhog-setup
```

#### All Tests
```bash
# Run all tests in this directory
npx playwright test

# Run with coverage
npx playwright test --reporter=html
```

## 📧 Email Testing Options



### Option 1: Ethereal Email (Free Alternative) ⭐
**Best for**: Personal projects, free email testing

**Setup**:
```bash
# Run setup script
pnpm test:ethereal-setup

# Follow the instructions to get free SMTP credentials
# Visit: https://ethereal.email/create
```

**Benefits**:
- ✅ Completely free
- ✅ No account required
- ✅ Instant setup
- ✅ Web interface to view emails
- ✅ SMTP support for sending emails

### Option 2: MailHog (Local Email Testing) ⭐
**Best for**: Local development, no external dependencies

**Setup**:
```bash
# Run setup script
pnpm test:mailhog-setup

# Install MailHog
brew install mailhog

# Start MailHog
mailhog

# Access web interface at http://localhost:8025
```

**Benefits**:
- ✅ Completely free
- ✅ Runs locally on your machine
- ✅ No external dependencies
- ✅ Web interface to view emails
- ✅ API for automated testing
- ✅ Perfect for development and testing

### Option 3: Mock Email Service (Free)
**Best for**: Simple testing without external dependencies

**Setup**:
```typescript
import { mockEmailService, sendMockEmail } from './mock-email-service'

// Send a mock email
await sendMockEmail('test@example.com', 'Verification', '<p>Code: 123456</p>', 'Code: 123456')

// Get verification code
const code = await mockEmailService.getVerificationCode('test@example.com')
```

**Benefits**:
- ✅ No external dependencies
- ✅ Instant setup
- ✅ Full control over email content
- ✅ Perfect for unit testing

### Option 4: Gmail App Passwords (Free)
**Best for**: If you have a Gmail account

**Setup**:
1. Enable 2-factor authentication on Gmail
2. Generate an App Password
3. Use Gmail SMTP with the app password

### How Email Testing Works

1. **Email Capture**: When your auth service sends verification emails, they're captured by the email service
2. **Code Extraction**: Verification codes are automatically extracted from email content
3. **Real Verification**: Tests use actual verification codes from emails
4. **Cleanup**: Test emails are automatically cleaned up after tests

### Setup Steps (Choose Your Option)

#### For Ethereal Email (Recommended Online Option):
1. **Get SMTP Credentials**:
   ```bash
   # Visit https://ethereal.email/create
   # Click "Create Ethereal Account"
   # Copy the SMTP credentials provided
   ```

2. **Set Environment Variables**:
   ```bash
   export ETHEREAL_HOST="smtp.ethereal.email"
   export ETHEREAL_PORT="587"
   export ETHEREAL_USER="your_ethereal_username"
   export ETHEREAL_PASS="your_ethereal_password"
   export ETHEREAL_SECURE="false"
   ```

#### For MailHog (Recommended Local Option):
1. **Install and Start MailHog**:
   ```bash
   # Install MailHog
   brew install mailhog
   
   # Start MailHog
   mailhog
   ```

2. **Set Environment Variables**:
   ```bash
   export MAILHOG_HOST="localhost"
   export MAILHOG_PORT="1025"
   export MAILHOG_API_PORT="8025"
   export MAILHOG_WEB_PORT="8025"
   ```

3. **Test Email Flow**:
   ```typescript
   // Example test flow
   test('real email verification', async ({ page }) => {
     // 1. Trigger email verification
     await triggerEmailVerification('test@example.com')
     
     // 2. Wait for email in Ethereal
     const code = await waitForVerificationEmail('test@example.com')
     
     // 3. Use real code in test
     await page.fill('input[name="code"]', code)
     await page.click('button:has-text("Verify Email")')
     
     // 4. Verify success
     await expect(page.locator('h3')).toContainText('Email Verified')
   })
   ```

### Email Helper Functions

```typescript
// For Ethereal Email (Online Service)
import { etherealHelper, waitForVerificationEmail } from './ethereal-helper'

// For MailHog (Local Service)
import { mailHogHelper, waitForVerificationEmail } from './mailhog-helper'

// For Mock Email Service (In-Memory)
import { mockEmailService, sendMockEmail } from './mock-email-service'



// Wait for verification email (works with any service)
const code = await waitForVerificationEmail('user@example.com', 30000)

// Send mock email (for testing)
await sendMockEmail('test@example.com', 'Verification', '<p>Code: 123456</p>', 'Code: 123456')
```

## 🧪 Test Categories

### 1. Complete Email Verification Flow
- Full user journey from page load to successful verification
- Network error handling
- Real email integration (with Ethereal Email)

### 2. Form Validation E2E
- Empty code submission
- Code length validation
- Special character handling

### 3. Accessibility E2E
- Keyboard navigation
- ARIA labels
- Screen reader compatibility

### 4. Mobile Responsiveness E2E
- Touch interactions
- Virtual keyboard handling
- Responsive layout testing

### 5. Cross-Browser Compatibility
- Chrome, Firefox, Safari testing
- Mobile browser testing
- Consistent behavior validation

### 6. Error Recovery Scenarios
- Invalid code attempts
- Multiple resend attempts
- Network failure recovery

### 7. Performance E2E
- Page load times
- Interaction responsiveness
- Memory usage patterns

### 8. Security E2E
- XSS prevention
- HTML injection protection
- Input sanitization

## 🔧 Configuration

### Playwright Config
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './src/pages/auth/EmailVerificationPage/__tests__',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Test Configuration
```typescript
const testConfig = {
  baseUrl: 'http://localhost:5173',
  authServiceUrl: 'http://localhost:9000',
  ethereal: {
    host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.ETHEREAL_PORT || '587'),
    user: process.env.ETHEREAL_USER || 'your_ethereal_username',
    pass: process.env.ETHEREAL_PASS || 'your_ethereal_password',
    secure: process.env.ETHEREAL_SECURE === 'true'
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Tests failing with "Element not found"**:
   - Ensure the dev server is running (`pnpm dev`)
   - Check that the page loads correctly in browser
   - Verify selectors match the actual DOM

2. **Email service errors**:
   - Verify Ethereal Email credentials are correct
   - Check MailHog is running (if using local testing)
   - Ensure network connectivity

3. **Slow test execution**:
   - Increase timeouts for slow operations
   - Use `--workers=1` for debugging
   - Check for unnecessary waits

### Debug Mode

```bash
# Run tests in debug mode
npx playwright test --debug

# Run with headed browser
npx playwright test --headed

# Generate trace for failed tests
npx playwright test --trace on
```

### View Test Results

```bash
# Open HTML report
npx playwright show-report

# View traces
npx playwright show-trace trace.zip
```

## 📊 Test Reports

### HTML Report
```bash
npx playwright test --reporter=html
# Report will be available at playwright-report/index.html
```

### JUnit Report
```bash
npx playwright test --reporter=junit
# Report will be saved as test-results/results.xml
```

### Custom Reports
```bash
# Multiple reporters
npx playwright test --reporter=html,junit,line
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: pnpm playwright install
      - run: pnpm playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📈 Best Practices

1. **Test Data Management**:
   - Use unique email addresses per test
   - Clean up test data after each test
   - Avoid hardcoded test data

2. **Reliability**:
   - Use explicit waits instead of fixed delays
   - Handle flaky elements with retry logic
   - Test error scenarios thoroughly

3. **Performance**:
   - Run tests in parallel when possible
   - Minimize test setup/teardown time
   - Use efficient selectors

4. **Maintainability**:
   - Keep tests focused and atomic
   - Use descriptive test names
   - Extract common test logic into helpers

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Add appropriate error handling
3. Include both positive and negative test cases
4. Document any new configuration requirements
5. Update this README if needed

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Ethereal Email](https://ethereal.email) - Free email testing service
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [E2E Testing Patterns](https://playwright.dev/docs/test-patterns) 