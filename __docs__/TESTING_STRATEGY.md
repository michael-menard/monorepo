# Testing Strategy Guide

This guide outlines the comprehensive testing strategy for the LEGO MOC Instructions monorepo, covering unit tests, integration tests, end-to-end tests, and testing best practices.

## Testing Philosophy

### Testing Pyramid
```
                    ┌─────────────────┐
                    │   E2E Tests     │
                    │   (Playwright)  │
                    │      ~6 tests   │
                    └─────────────────┘
                           │
                    ┌─────────────────┐
                    │ Integration     │
                    │ Tests (Vitest)  │
                    │   ~20 tests     │
                    └─────────────────┘
                           │
                    ┌─────────────────┐
                    │   Unit Tests    │
                    │   (Vitest)      │
                    │   ~70 tests     │
                    └─────────────────┘
```

### Testing Principles
- **Test-Driven Development (TDD)**: Write tests before implementation when possible
- **Comprehensive Coverage**: Aim for 80%+ coverage on critical modules
- **Fast Feedback**: Unit tests should run quickly for immediate feedback
- **Reliable Tests**: Tests should be deterministic and not flaky
- **Maintainable Tests**: Tests should be easy to understand and modify

## Testing Technology Stack

### Primary Testing Tools
- **Vitest**: Fast unit and integration testing with TypeScript support
- **React Testing Library**: Component testing with user-centric approach
- **Playwright**: End-to-end testing with multiple browser support
- **MSW (Mock Service Worker)**: API mocking for isolated testing

### Supporting Tools
- **Jest DOM**: Custom DOM element matchers for React Testing Library
- **User Event**: Realistic user interaction simulation
- **Testing Library Jest DOM**: Additional matchers for DOM testing
- **jsdom**: DOM environment for Node.js testing

## Test Types and Organization

### 1. Unit Tests (70+ tests)
**Purpose**: Test individual functions, components, and utilities in isolation

**Location**: `__tests__` directories next to the code they test
```
packages/
├── auth/src/
│   ├── components/LoginForm/
│   │   ├── index.tsx
│   │   └── __tests__/
│   │       └── LoginForm.test.tsx
│   └── utils/
│       ├── token.ts
│       └── __tests__/
│           └── token.test.ts
├── ui/src/
│   ├── button.tsx
│   └── __tests__/
│       └── components.test.tsx
└── features/
    └── FileUpload/
        ├── index.tsx
        └── __tests__/
            └── FileUpload.test.tsx
```

**Example Unit Test**:
```tsx
// packages/auth/src/components/LoginForm/__tests__/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LoginForm } from '../index';

describe('LoginForm', () => {
  it('should render login form with email and password fields', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });
});
```

### 2. Integration Tests (20+ tests)
**Purpose**: Test interactions between modules and API integrations

**Location**: `__tests__` directories in service and API layers
```
apps/
├── web/lego-moc-instructions-app/src/
│   ├── services/
│   │   ├── authApi.ts
│   │   └── __tests__/
│   │       └── authApi.test.ts
│   └── store/
│       ├── store.ts
│       └── __tests__/
│           └── store.test.ts
```

**Example Integration Test**:
```tsx
// apps/web/lego-moc-instructions-app/src/services/__tests__/authApi.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useLoginMutation } from '@repo/auth';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Auth API Integration', () => {
  it('should handle successful login', async () => {
    server.use(
      http.post('*/auth/login', () => {
        return HttpResponse.json({
          success: true,
          data: { user: { id: '1', email: 'test@example.com' } }
        });
      })
    );

    const { result } = renderHook(() => useLoginMutation());
    const [login] = result.current;

    await waitFor(async () => {
      const response = await login({ email: 'test@example.com', password: 'password' });
      expect(response.data.success).toBe(true);
    });
  });
});
```

### 3. End-to-End Tests (6+ tests)
**Purpose**: Test complete user workflows through the entire application stack

**Location**: Centralized in the dedicated e2e app
```
apps/e2e/tests/
├── auth/
│   ├── complete-auth-flow.spec.ts
│   ├── simple-auth-test.spec.ts
│   ├── password-reset-flow.spec.ts
│   ├── email-verification-flow.spec.ts
│   └── session-management.spec.ts
├── navigation/
├── pages/
└── profile/
```

**Example E2E Test**:
```tsx
// apps/e2e/tests/auth/complete-auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should complete full login flow', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle login errors gracefully', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.text-red-600')).toContainText('Invalid credentials');
  });
});
```

## Test Configuration

### Vitest Configuration
```typescript
// apps/web/lego-moc-instructions-app/vitest.config.ts
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@repo/auth': resolve(__dirname, '../../../packages/auth/src'),
      '@repo/ui': resolve(__dirname, '../../../packages/ui/src'),
    },
  },
});
```

### Playwright Configuration
```typescript
// apps/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

## Mocking Strategy

### API Mocking with MSW
```typescript
// apps/web/lego-moc-instructions-app/src/test/mocks/handlers.ts
import { HttpResponse, http } from 'msw';

export const handlers = [
  http.post('*/auth/login', async ({ request }) => {
    const body = await request.json();
    
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        success: true,
        data: { user: { id: '1', email: 'test@example.com' } }
      });
    }
    
    return HttpResponse.json({
      success: false,
      message: 'Invalid credentials'
    }, { status: 401 });
  }),

  http.post('*/auth/verify-email', async ({ request }) => {
    const body = await request.json();
    
    if (body.code === '123456') {
      return HttpResponse.json({
        success: true,
        message: 'Email verified successfully'
      });
    }
    
    return HttpResponse.json({
      success: false,
      message: 'Invalid or expired verification code'
    }, { status: 400 });
  }),
];
```

### Test Setup
```typescript
// apps/web/lego-moc-instructions-app/src/test/setup.ts
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Running Tests

### Available Test Commands
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run only unit tests
pnpm test:unit

# Run only integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run specific E2E test categories
pnpm test:e2e:auth
pnpm test:e2e:login
pnpm test:e2e:signup

# Run E2E tests in headed mode (with browser visible)
pnpm test:e2e:headed

# Run E2E tests with debugging
pnpm test:e2e:debug

# Run E2E tests with UI mode
pnpm test:e2e:ui
```

### Package-Specific Testing
```bash
# Test specific packages
pnpm --filter @repo/auth test
pnpm --filter @repo/ui test
pnpm --filter @repo/lego-moc-instructions-app test

# Test with specific configuration
pnpm --filter @repo/lego-moc-instructions-app test:e2e
```

## Test Categories by Package

### Auth Package (`packages/auth/`)
- **Unit Tests**: 15+ component tests (LoginForm, SignupForm, etc.)
- **Utility Tests**: Token validation, form validation
- **Integration Tests**: Auth API integration, Redux store tests

### UI Package (`packages/ui/`)
- **Component Tests**: 10+ UI component tests
- **Accessibility Tests**: ARIA compliance, keyboard navigation
- **Visual Tests**: Component rendering and styling

### Features Packages (`packages/features/`)
- **FileUpload**: File upload functionality tests
- **Gallery**: Image gallery component tests
- **Profile**: User profile management tests
- **Wishlist**: Wishlist functionality tests

### Main Application (`apps/web/lego-moc-instructions-app/`)
- **Unit Tests**: 20+ component and utility tests
- **Integration Tests**: API integration, state management
- **E2E Tests**: 6+ complete user workflow tests

## Testing Best Practices

### Component Testing
```tsx
// ✅ Good: Test user interactions
test('should handle form submission', async () => {
  render(<LoginForm />);
  
  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  
  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });
});

// ❌ Bad: Test implementation details
test('should call onSubmit when button is clicked', () => {
  const mockSubmit = vi.fn();
  render(<LoginForm onSubmit={mockSubmit} />);
  
  fireEvent.click(screen.getByRole('button'));
  expect(mockSubmit).toHaveBeenCalled();
});
```

### API Testing
```tsx
// ✅ Good: Test API responses and error handling
test('should handle API errors gracefully', async () => {
  server.use(
    http.post('*/auth/login', () => {
      return HttpResponse.json({
        success: false,
        message: 'Invalid credentials'
      }, { status: 401 });
    })
  );

  render(<LoginForm />);
  
  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  
  await waitFor(() => {
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

### E2E Testing
```tsx
// ✅ Good: Test complete user workflows
test('should complete full authentication flow', async ({ page }) => {
  // Navigate to signup
  await page.goto('/auth/signup');
  
  // Fill out signup form
  await page.fill('[name="name"]', 'Test User');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Verify email verification flow
  await expect(page).toHaveURL('/auth/verify-email');
  await page.fill('[name="code"]', '123456');
  await page.click('button[type="submit"]');
  
  // Verify successful login
  await expect(page).toHaveURL('/');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});
```

## Test Coverage

### Coverage Goals
- **Critical Modules**: 90%+ coverage (auth, core components)
- **Business Logic**: 80%+ coverage (API services, utilities)
- **UI Components**: 70%+ coverage (presentational components)
- **Overall Project**: 75%+ coverage

### Coverage Reporting
```bash
# Generate coverage report
pnpm test:coverage

# View coverage in browser
pnpm test:coverage:html
```

## Continuous Integration

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test:integration
      - run: pnpm test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "pnpm lint && pnpm test:unit",
      "pre-push": "pnpm test:all"
    }
  }
}
```

## Troubleshooting

### Common Test Issues
1. **Flaky Tests**: Use `waitFor` instead of `setTimeout`
2. **Mock Issues**: Ensure MSW handlers are properly configured
3. **Environment Issues**: Check jsdom setup for DOM testing
4. **Async Issues**: Use proper async/await patterns

### Debugging Tests
```bash
# Run tests with verbose output
pnpm test --verbose

# Run specific test file
pnpm test LoginForm.test.tsx

# Run tests with debugging
pnpm test --inspect-brk

# Run E2E tests with browser visible
pnpm test:e2e:headed
```

### Performance Optimization
- **Parallel Execution**: Use `--maxWorkers` for faster test execution
- **Test Isolation**: Ensure tests don't depend on each other
- **Mocking**: Mock heavy operations and external dependencies
- **Selective Testing**: Use test patterns to run specific test suites

## Future Enhancements

### Planned Improvements
1. **Visual Regression Testing**: Add visual testing with Chromatic
2. **Performance Testing**: Add performance benchmarks
3. **Accessibility Testing**: Enhanced a11y testing with axe-core
4. **Contract Testing**: API contract testing with Pact
5. **Load Testing**: Performance testing with k6

### Testing Tools Evaluation
- **Storybook**: Component development and testing
- **Cypress**: Alternative E2E testing framework
- **Jest**: Alternative unit testing framework
- **Testing Library**: Enhanced testing utilities 