# Testing Guide

This document provides comprehensive guidance for testing the Lego MOC Instructions application, including E2E tests, unit tests, and email testing procedures.

## Table of Contents

- [Overview](#overview)
- [E2E Testing](#e2e-testing)
- [Unit Testing](#unit-testing)
- [Email Testing](#email-testing)
- [Test Configuration](#test-configuration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The application uses a comprehensive testing strategy with multiple layers:

- **E2E Tests**: Playwright for end-to-end user workflows
- **Unit Tests**: Vitest for component and utility testing
- **Integration Tests**: API endpoint testing
- **Email Tests**: Ethereal Email for email functionality testing

## E2E Testing

### Setup

E2E tests use Playwright and are configured to run headless on Chrome by default.

#### Prerequisites

1. **Install Dependencies**:
   ```bash
   cd apps/web/lego-moc-instructions-app
   pnpm install
   ```

2. **Install Playwright Browsers**:
   ```bash
   npx playwright install chromium
   ```

3. **Configure Environment**:
   ```bash
   cp env.ethereal.template .env
   # Update .env with your Ethereal Email credentials
   ```

### Running E2E Tests

#### Run All Tests
```bash
cd apps/web/lego-moc-instructions-app
pnpm test:e2e
```

#### Run Specific Test Suite
```bash
# Run only email verification tests
pnpm test:e2e --grep "Email Verification Page"

# Run only authentication tests
pnpm test:e2e --grep "Auth Flow"

# Run only responsive design tests
pnpm test:e2e --grep "Responsive Design"
```

#### Run Individual Tests
```bash
# Run specific test
pnpm test:e2e --grep "should display email verification form"

# Run with specific timeout
pnpm test:e2e --grep "should handle successful email verification" --timeout=10000
```

#### Debug Mode
```bash
# Run in headed mode for debugging
npx playwright test --headed

# Run with debug logs
DEBUG=pw:api npx playwright test

# Open Playwright Inspector
npx playwright test --debug
```

### Test Structure

#### Auth Flow Tests
Located in `tests/auth/auth-flow.spec.ts`:

- **Signup Flow**: User registration and email verification
- **Login Flow**: User authentication
- **Email Verification**: Email verification process
- **Password Reset**: Password reset functionality
- **Responsive Design**: Mobile and tablet layouts
- **Accessibility**: Keyboard navigation and ARIA attributes

#### Test Examples

```typescript
test('should display email verification form', async ({ page }) => {
  await page.goto('/auth/verify-email');
  
  // Check for the AppCard title
  await expect(page.locator('[data-testid="app-card-title"]'))
    .toContainText('Verify Your Email');
  
  // Check for input field
  await expect(page.locator('input[id="code"]')).toBeVisible();
  
  // Check for submit button
  await expect(page.locator('button[type="submit"]'))
    .toContainText('Verify Email');
});
```

### Test Configuration

#### Playwright Config
Located in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

## Unit Testing

### Setup

Unit tests use Vitest and are configured for React components and utilities.

#### Prerequisites

1. **Install Dependencies**:
   ```bash
   cd apps/web/lego-moc-instructions-app
   pnpm install
   ```

2. **Configure Test Environment**:
   ```bash
   # Test setup is in src/test/setup.ts
   # Mock handlers are in src/test/mocks/handlers.ts
   ```

### Running Unit Tests

#### Run All Tests
```bash
cd apps/web/lego-moc-instructions-app
pnpm test
```

#### Run Tests in Watch Mode
```bash
pnpm test:watch
```

#### Run Tests with Coverage
```bash
pnpm test:coverage
```

#### Run Specific Test Files
```bash
# Run specific test file
pnpm test src/components/EmailVerificationPage/__tests__/EmailVerificationPage.test.tsx

# Run tests matching pattern
pnpm test --run EmailVerification
```

### Test Structure

#### Component Tests
Located in `src/**/__tests__/` directories:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EmailVerificationPage from '../index';

describe('EmailVerificationPage', () => {
  it('should render verification form', () => {
    render(<EmailVerificationPage />);
    
    expect(screen.getByText('Verify Your Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify Email' })).toBeInTheDocument();
  });
});
```

#### API Tests
Located in `src/test/` directory:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { authApi } from '../services/authApi';

describe('Auth API', () => {
  it('should verify email successfully', async () => {
    const result = await authApi.verifyEmail({ code: '123456' });
    
    expect(result.success).toBe(true);
    expect(result.data.user.isVerified).toBe(true);
  });
});
```

### Test Configuration

#### Vitest Config
Located in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@repo/auth': path.resolve(__dirname, '../../packages/auth/src'),
    },
  },
});
```

## Email Testing

### Ethereal Email Setup

See [EMAIL_TESTING.md](./EMAIL_TESTING.md) for detailed setup instructions.

### Running Email Tests

#### Test Email Configuration
```bash
cd apps/api/auth-service
pnpm test:ethereal-setup
```

#### Test Email Verification Flow
```bash
# Start auth service
cd apps/api/auth-service
pnpm dev

# Start web application
cd apps/web/lego-moc-instructions-app
pnpm dev

# Run E2E tests
pnpm test:e2e --grep "email verification"
```

#### Manual Email Testing

1. **Setup Ethereal Email**:
   - Visit https://ethereal.email/create
   - Copy credentials to `.env` file

2. **Test Signup Flow**:
   - Navigate to signup page
   - Create account with test email
   - Check Ethereal Email web interface
   - Use verification code

3. **Test Password Reset**:
   - Navigate to forgot password page
   - Enter email address
   - Check Ethereal Email for reset link
   - Use reset link to change password

### Email Test Examples

#### E2E Email Test
```typescript
test('should handle successful email verification', async ({ page }) => {
  await page.fill('input[id="code"]', '123456');
  
  // Mock the email verification API call
  await page.route('**/api/auth/verify-email', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Email verified successfully' }),
    });
  });
  
  await page.click('button[type="submit"]');
  
  // Wait for success message
  await expect(page.locator('text=Email Verified')).toBeVisible();
});
```

#### Unit Email Test
```typescript
it('should handle AuthApiError specifically', async () => {
  server.use(
    http.post('*/auth/verify-email', () => {
      return HttpResponse.json({
        success: false,
        message: 'Custom auth error message'
      }, { status: 401 })
    })
  );

  const user = userEvent.setup();
  render(<EmailVerificationPage />);

  const codeInput = screen.getByPlaceholderText('Enter 6-digit code');
  await user.type(codeInput, '123456');
  
  const submitButton = screen.getByRole('button', { name: 'Verify Email' });
  await user.click(submitButton);

  await waitFor(() => {
    expect(screen.getByText('Custom auth error message')).toBeInTheDocument();
  });
});
```

## Test Configuration

### Environment Variables

#### Required for Testing
```env
# Auth Service
VITE_AUTH_SERVICE_BASE_URL=http://localhost:5000/api/auth

# Ethereal Email
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_username
ETHEREAL_PASS=your_ethereal_password
ETHEREAL_SECURE=false
EMAIL_TESTING_SERVICE=ethereal

# Test Configuration
NODE_ENV=test
VITEST_MODE=true
```

### Test Scripts

#### Package.json Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

## Best Practices

### E2E Testing

1. **Use Descriptive Test Names**:
   ```typescript
   test('should display email verification form when user navigates to verify-email page', async ({ page }) => {
   ```

2. **Use Data Attributes for Selectors**:
   ```typescript
   await expect(page.locator('[data-testid="app-card-title"]')).toBeVisible();
   ```

3. **Mock External Dependencies**:
   ```typescript
   await page.route('**/api/auth/verify-email', async route => {
     await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
   });
   ```

4. **Handle Async Operations**:
   ```typescript
   await expect(page.locator('text=Email Verified')).toBeVisible({ timeout: 10000 });
   ```

### Unit Testing

1. **Test Component Behavior**:
   ```typescript
   it('should show error message when verification fails', async () => {
     // Test the component's error handling behavior
   });
   ```

2. **Mock API Calls**:
   ```typescript
   vi.mock('../services/authApi', () => ({
     authApi: {
       verifyEmail: vi.fn().mockResolvedValue({ success: true })
     }
   }));
   ```

3. **Test User Interactions**:
   ```typescript
   const user = userEvent.setup();
   await user.type(codeInput, '123456');
   await user.click(submitButton);
   ```

### Email Testing

1. **Use Real Email Service**:
   - Ethereal Email for development
   - Real SMTP for production testing

2. **Test Complete Flows**:
   - Signup → Email verification → Login
   - Forgot password → Reset email → Password change

3. **Verify Email Content**:
   - Check email subject and body
   - Verify links and codes work correctly

## Troubleshooting

### Common E2E Test Issues

#### Tests Hanging
**Problem**: Tests don't complete and hang indefinitely

**Solutions**:
- Check if development server is running
- Verify Playwright configuration
- Use shorter timeouts for debugging
- Check for infinite loops in components

#### Element Not Found
**Problem**: `Element not found` errors

**Solutions**:
- Use more specific selectors
- Add wait conditions for dynamic content
- Check if element is in viewport
- Verify element exists in DOM

#### API Mocking Issues
**Problem**: API mocks not working

**Solutions**:
- Verify route pattern matches
- Check response format
- Ensure mock is set before navigation
- Use `page.waitForResponse()` for debugging

### Common Unit Test Issues

#### Import Errors
**Problem**: Module import failures

**Solutions**:
- Check path aliases in vitest.config.ts
- Verify package exports
- Check TypeScript configuration
- Ensure dependencies are installed

#### Mock Issues
**Problem**: Mocks not working as expected

**Solutions**:
- Clear mocks between tests
- Use `vi.clearAllMocks()`
- Check mock implementation
- Verify mock is called correctly

### Common Email Test Issues

#### Email Not Received
**Problem**: Emails not appearing in Ethereal

**Solutions**:
- Verify Ethereal credentials
- Check email service is running
- Verify email address format
- Check application logs

#### Test Failures
**Problem**: Email tests failing

**Solutions**:
- Ensure auth service is running
- Check environment variables
- Verify email templates
- Test email configuration

### Debug Commands

#### E2E Debugging
```bash
# Run with debug logs
DEBUG=pw:api npx playwright test

# Run in headed mode
npx playwright test --headed

# Open Playwright Inspector
npx playwright test --debug

# Show test report
npx playwright show-report
```

#### Unit Test Debugging
```bash
# Run with verbose output
pnpm test --reporter=verbose

# Run specific test with debug
pnpm test --run "test name" --reporter=verbose

# Run with coverage
pnpm test:coverage
```

#### Email Debugging
```bash
# Test email configuration
cd apps/api/auth-service
pnpm test:ethereal-setup

# Check environment variables
node -e "console.log(process.env.ETHEREAL_USER)"

# Verify transporter
node -e "const { verifyTransporter } = require('./dist/email/ethereal.config.js'); verifyTransporter();"
```

## Support

For testing-related issues:

1. Check this documentation
2. Review error messages and logs
3. Verify configuration files
4. Test with minimal examples
5. Check GitHub Issues
6. Contact the development team

## References

- [EMAIL_TESTING.md](./EMAIL_TESTING.md) - Email testing setup
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API testing procedures
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/) 