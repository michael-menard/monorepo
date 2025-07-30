# Playwright Test Suite

This directory contains end-to-end tests for the LEGO MOC Instructions App using Playwright.

## Test Structure

```
tests/
├── auth/
│   ├── auth-flow.spec.ts          # Comprehensive auth flow tests
│   ├── auth-flow-simple.spec.ts   # Simplified auth flow tests using utilities
│   └── utils.ts                   # Test utilities and helpers
└── README.md                      # This file
```

## Test Categories

### Auth Flow Tests (`auth-flow.spec.ts`)
Comprehensive tests covering all authentication scenarios:

- **Navigation Tests**: Verify navigation between auth pages
- **Login Tests**: Form validation, successful login, error handling
- **Signup Tests**: Form validation, account creation, error handling
- **Password Reset Tests**: Forgot password and reset password flows
- **Email Verification Tests**: Email verification flow
- **Responsive Design Tests**: Mobile and tablet viewport testing
- **Accessibility Tests**: Keyboard navigation and ARIA attributes

### Simplified Auth Tests (`auth-flow-simple.spec.ts`)
Streamlined tests using the `AuthTestUtils` helper class for cleaner, more maintainable tests.

## Test Utilities (`utils.ts`)

The `AuthTestUtils` class provides helper methods for common auth testing tasks:

- **Form Interactions**: `login()`, `signup()`, `requestPasswordReset()`, etc.
- **API Mocking**: `mockAuthAPI()` for simulating backend responses
- **Validation**: `expectValidationErrors()`, `expectFormFields()`
- **Navigation**: `navigateToAuthPage()` with automatic verification
- **Responsive Testing**: `testResponsiveDesign()` for different viewport sizes
- **Accessibility**: `testKeyboardNavigation()` for keyboard accessibility

## Running Tests

### Prerequisites
1. Install Playwright: `pnpm add -D @playwright/test`
2. Install browsers: `npx playwright install`

### Test Commands

```bash
# Run all Playwright tests
pnpm test:e2e

# Run tests with UI mode (interactive)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Run tests in debug mode
pnpm test:e2e:debug

# Run specific test file
pnpm test:e2e tests/auth/auth-flow.spec.ts

# Run tests in specific browser
pnpm test:e2e --project=chromium
```

### Test Configuration

The Playwright configuration is in `playwright.config.ts` and includes:

- **Multiple Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Web Server**: Automatically starts the dev server before tests
- **Screenshots**: Captured on test failures
- **Videos**: Recorded for failed tests
- **Traces**: Generated for debugging failed tests

## Test Data

### Test Users
```typescript
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  confirmPassword: 'TestPassword123!',
};
```

### Validation Messages
Common validation error messages are defined as constants for consistent testing.

## API Mocking

Tests use Playwright's route interception to mock API responses:

```typescript
// Mock successful login
await authUtils.mockAuthAPI('login', { success: true, user: TEST_USER });

// Mock failed login
await authUtils.mockAuthAPI('login', { error: 'Invalid credentials' }, 401);
```

## Best Practices

1. **Use Test Utilities**: Leverage `AuthTestUtils` for common operations
2. **Mock APIs**: Always mock API calls to ensure consistent test behavior
3. **Test Responsive Design**: Include mobile and tablet viewport tests
4. **Accessibility Testing**: Verify keyboard navigation and ARIA attributes
5. **Error Scenarios**: Test both success and failure cases
6. **Clean Setup**: Use `beforeEach` for consistent test state

## Debugging Tests

### View Test Results
```bash
# Open HTML report
npx playwright show-report
```

### Debug Mode
```bash
# Run in debug mode with step-by-step execution
pnpm test:e2e:debug
```

### Trace Viewer
```bash
# Open trace for failed test
npx playwright show-trace trace.zip
```

## Continuous Integration

The Playwright configuration is optimized for CI environments:

- **Retries**: 2 retries on CI for flaky tests
- **Workers**: Single worker on CI for stability
- **Forbid Only**: Prevents `test.only()` in CI builds
- **Timeout**: 120-second timeout for web server startup

## Adding New Tests

1. Create test file in appropriate directory
2. Import test utilities: `import { createAuthTestUtils } from './utils'`
3. Use `AuthTestUtils` for common operations
4. Mock API responses for consistent behavior
5. Include responsive and accessibility tests
6. Add to appropriate test suite

## Example Test Structure

```typescript
import { expect, test } from '@playwright/test';
import { createAuthTestUtils, TEST_USER } from './utils';

test.describe('Feature Name', () => {
  let authUtils: ReturnType<typeof createAuthTestUtils>;

  test.beforeEach(async ({ page }) => {
    authUtils = createAuthTestUtils(page);
    await page.goto('/');
  });

  test('should perform expected behavior', async ({ page }) => {
    // Test implementation using authUtils
    await authUtils.navigateToAuthPage('login', 'Welcome back');
    await authUtils.mockAuthAPI('login', { success: true });
    await authUtils.login(TEST_USER.email, TEST_USER.password);
    
    // Assertions
    await expect(page).toHaveURL('/');
  });
});
``` 