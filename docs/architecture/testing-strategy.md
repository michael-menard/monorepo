# Testing Strategy

This document defines the testing strategy, conventions, and best practices for the LEGO MOC Instructions monorepo.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Testing Pyramid](#testing-pyramid)
- [Test Types & Definitions](#test-types--definitions)
- [Technology Stack](#technology-stack)
- [File Organization](#file-organization)
- [Naming Conventions](#naming-conventions)
- [Mocking Strategy](#mocking-strategy)
- [Test Setup & Test Fixtures](#test-setup--test-fixtures)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)
- [Package-Specific Guidelines](#package-specific-guidelines)
- [CI/CD Integration](#cicd-integration)
- [Running Tests](#running-tests)

## Testing Philosophy

Our testing approach aligns with the functional programming paradigm of the codebase:

| Principle                 | Application to Testing                     |
| ------------------------- | ------------------------------------------ |
| **Pure Functions**        | Test inputs → outputs without side effects |
| **Composition**           | Test small units, then composed behaviors  |
| **Immutability**          | Assert state changes produce new values    |
| **Explicit Dependencies** | Mock only what's injected                  |

### Core Beliefs

1. **Tests are documentation** - They describe expected behavior in executable form
2. **Fast feedback** - Unit tests should run in milliseconds
3. **Confidence over coverage** - Test critical paths thoroughly; don't chase 100%
4. **Test behavior, not implementation** - Refactoring shouldn't break tests
5. **Hermetic tests** - No shared state, no flaky network calls

## Testing Pyramid

```
                    ┌─────────┐
                    │   E2E   │  ~10% - Critical user journeys
                    │(Gherkin)│  Playwright + Cucumber
                    ├─────────┤
                    │         │
                 ┌──┴─────────┴──┐
                 │  Integration  │  ~20% - Module interactions
                 │    Tests      │  Vitest + RTL
                 ├───────────────┤
                 │               │
              ┌──┴───────────────┴──┐
              │     Unit Tests      │  ~70% - Individual functions
              │                     │  Vitest
              └─────────────────────┘
```

### Distribution Guidelines

| Test Type   | Target % | Execution Time | Scope                     |
| ----------- | -------- | -------------- | ------------------------- |
| Unit        | 70%      | < 50ms each    | Single function/component |
| Integration | 20%      | < 500ms each   | Multiple modules together |
| E2E         | 10%      | < 30s each     | Full user flows           |

## Test Types & Definitions

### Unit Tests

Tests a single module in **complete isolation**.

**Requirements:**

- **Must mock ALL imports** (API calls, database, Redux, contexts, hooks, 3rd-party deps)
- Test one behavior per test case
- No network calls, no file system access

**Example:**

```typescript
// store/slices/__tests__/authSlice.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { authSlice, setAuthenticated, selectIsAuthenticated } from '../authSlice'

describe('authSlice', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: { auth: authSlice.reducer },
    })
  })

  it('should set authenticated state with user', () => {
    const mockUser = { id: '123', email: 'test@example.com' }

    store.dispatch(setAuthenticated({ user: mockUser, tokens: null }))

    expect(selectIsAuthenticated(store.getState())).toBe(true)
  })
})
```

### Integration Tests

Tests interactions between **multiple internal modules**.

**Requirements:**

- **May mock only:** 3rd-party deps, API calls, database
- **Do NOT mock:** Internal modules under test
- Test realistic scenarios

**Example:**

```typescript
// components/Layout/__tests__/Navigation.integration.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { Header } from '../Header'
import { Sidebar } from '../Sidebar'
import { authSlice } from '../../../store/slices/authSlice'
import { navigationSlice } from '../../../store/slices/navigationSlice'

// Mock only external dependencies
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

describe('Navigation Integration', () => {
  it('mobile menu button controls sidebar visibility', () => {
    const store = configureStore({
      reducer: {
        auth: authSlice.reducer,
        navigation: navigationSlice.reducer,
      },
    })

    render(
      <Provider store={store}>
        <Header />
        <Sidebar />
      </Provider>
    )

    fireEvent.click(screen.getByRole('button', { name: /toggle navigation/i }))

    expect(store.getState().navigation.isMobileMenuOpen).toBe(true)
  })
})
```

### E2E Tests (Playwright + Gherkin)

Tests complete user journeys through the application.

**Requirements:**

- **Must use Gherkin `.feature` files**
- Test critical business flows
- Run against a real (or realistic) environment
- Use `data-testid` attributes for element selection

**Example Feature File:**

```gherkin
# features/auth/login.feature
@auth
Feature: User Login

  As a user of the LEGO MOC Instructions application
  I want to be able to log in to my account
  So that I can access my personal content

  Background:
    Given I am on the login page

  @smoke
  Scenario: Display login page elements
    Then I should see the login form
    And I should see the email input field
    And I should see the password input field
    And I should see the sign in button

  Scenario: Show validation error for invalid email
    When I enter "invalid-email" in the email field
    And I click the sign in button
    Then I should see an email format error
```

**Example Step Definitions:**

```typescript
// steps/auth.steps.ts
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

Given('I am on the login page', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
})

When('I enter {string} in the email field', async ({ page }, email: string) => {
  await page.getByTestId('email-input').fill(email)
})

Then('I should see an email format error', async ({ page }) => {
  await expect(page.getByText(/invalid email/i)).toBeVisible()
})
```

## Technology Stack

| Purpose                  | Technology                | Version |
| ------------------------ | ------------------------- | ------- |
| Unit/Integration Testing | Vitest                    | 3.0.5   |
| Component Testing        | React Testing Library     | Latest  |
| E2E Testing              | Playwright                | 1.54+   |
| BDD Framework            | playwright-bdd            | 8.4+    |
| Gherkin Parser           | @cucumber/cucumber        | 12.2+   |
| API Mocking              | MSW (Mock Service Worker) | 2.x     |
| Coverage                 | Istanbul (via Vitest)     | -       |

### Why These Choices

- **Vitest**: Vite-native, fast execution, ESM support, compatible with Jest API
- **playwright-bdd**: Combines Playwright's power with Gherkin readability
- **MSW**: Intercepts at network level, works in both browser and Node.js
- **React Testing Library**: Encourages testing user behavior over implementation

## File Organization

### Directory Structure

```
apps/web/main-app/
├── src/
│   ├── components/
│   │   └── Auth/
│   │       ├── LoginForm.tsx
│   │       └── __tests__/
│   │           ├── LoginForm.test.tsx        # Unit test
│   │           └── AuthFlow.integration.tsx  # Integration test
│   ├── store/
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       └── __tests__/
│   │           └── authSlice.test.ts         # Unit test
│   └── test/
│       ├── setup.ts                          # Test setup file
│       ├── mocks/                            # Shared mocks
│       └── utils/                            # Test utilities

apps/web/playwright/
├── features/                                 # Gherkin feature files
│   ├── auth/
│   │   └── login.feature
│   └── navigation/
│       └── app-navigation.feature
├── steps/                                    # Step definitions
│   ├── auth.steps.ts
│   ├── navigation.steps.ts
│   └── fixtures.ts                           # Custom fixtures
├── .features-gen/                            # Generated (gitignored)
└── playwright.config.ts
```

### Test Location Rules

| Test Type    | Location                        | Pattern                                  |
| ------------ | ------------------------------- | ---------------------------------------- |
| Unit         | `__tests__/` adjacent to source | `*.test.ts` / `*.test.tsx`               |
| Integration  | `__tests__/` adjacent to source | `*.integration.ts` / `*.integration.tsx` |
| E2E Features | `apps/web/playwright/features/` | `*.feature`                              |
| E2E Steps    | `apps/web/playwright/steps/`    | `*.steps.ts`                             |

## Naming Conventions

### File Naming

| Type             | Pattern                     | Example                    |
| ---------------- | --------------------------- | -------------------------- |
| Unit Test        | `{ComponentName}.test.tsx`  | `LoginForm.test.tsx`       |
| Integration Test | `{Feature}.integration.tsx` | `AuthFlow.integration.tsx` |
| Feature File     | `{feature-name}.feature`    | `user-login.feature`       |
| Step Definition  | `{domain}.steps.ts`         | `auth.steps.ts`            |

### Test Naming

Use descriptive names that explain the behavior:

```typescript
// ✅ Good - Describes behavior
describe('authSlice', () => {
  describe('setAuthenticated', () => {
    it('should set isAuthenticated to true when user is provided', () => {})
    it('should clear any existing error state', () => {})
  })
})

// ❌ Bad - Vague or implementation-focused
describe('authSlice', () => {
  it('works', () => {})
  it('calls reducer', () => {})
})
```

### Gherkin Naming

```gherkin
# ✅ Good - User-focused, behavior-driven
Feature: User Login
  Scenario: Successful login with valid credentials
  Scenario: Show error for incorrect password

# ❌ Bad - Technical, implementation-focused
Feature: Auth Module
  Scenario: POST /api/auth returns 200
  Scenario: Redux state updates
```

## Mocking Strategy

### What to Mock by Test Type

| Dependency       | Unit Test | Integration Test | E2E Test        |
| ---------------- | --------- | ---------------- | --------------- |
| External APIs    | ✅ Mock   | ✅ Mock (MSW)    | ⚠️ Mock or real |
| Database         | ✅ Mock   | ✅ Mock          | Real (test DB)  |
| Redux Store      | ✅ Mock   | ❌ Real          | ❌ Real         |
| React Context    | ✅ Mock   | ❌ Real          | ❌ Real         |
| Internal Modules | ✅ Mock   | ❌ Real          | ❌ Real         |
| TanStack Router  | ✅ Mock   | ✅ Mock          | ❌ Real         |
| AWS Amplify      | ✅ Mock   | ✅ Mock          | ⚠️ Mock or real |

### MSW for API Mocking

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      email: 'test@example.com',
      name: 'Test User',
    })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json()
    if (body.email === 'valid@example.com') {
      return HttpResponse.json({ token: 'mock-token' })
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),
]
```

### Mocking Best Practices

```typescript
// ✅ Good - Mock at the boundary
vi.mock('@/services/api', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: '123', name: 'Test' }),
}))

// ❌ Bad - Mocking implementation details
vi.mock('@/components/Button', () => ({
  Button: ({ onClick }: any) => <button onClick={onClick}>Mocked</button>,
}))
```

## Test Setup & Test Fixtures

This section covers the configuration, utilities, and reusable fixtures that support all test types in the monorepo.

### Vitest Configuration

Each package and app has its own `vitest.config.ts` that defines the test environment. The main-app configuration serves as the reference implementation:

```typescript
// apps/web/main-app/vitest.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      // ... additional path aliases matching tsconfig.json
    },
  },
  test: {
    globals: true, // Enable global test APIs (describe, it, expect)
    environment: 'jsdom', // Browser-like environment for React
    setupFiles: ['./src/test/setup.ts'], // Global setup file
    css: true, // Process CSS imports
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts'],
    },
    env: {
      // Test environment variables
      VITE_APP_ENVIRONMENT: 'test',
      VITE_AWS_REGION: 'us-east-1',
      // ... additional env vars
    },
  },
})
```

#### Key Configuration Patterns

| Setting                | Purpose                                    | When to Modify                  |
| ---------------------- | ------------------------------------------ | ------------------------------- |
| `globals: true`        | Avoid importing `describe`, `it`, `expect` | Never (project standard)        |
| `environment: 'jsdom'` | DOM APIs for React components              | Use `'node'` for pure utilities |
| `setupFiles`           | Global mocks and polyfills                 | Add new global mocks here       |
| `css: true`            | Process CSS in tests                       | Disable for unit-only packages  |

### Global Test Setup

The setup file (`src/test/setup.ts`) runs before every test file. It handles:

1. **Test Library Configuration**
2. **Browser API Polyfills**
3. **Global Mocks for External Dependencies**

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// ─────────────────────────────────────────────────────────────────
// Browser API Polyfills (jsdom lacks these)
// ─────────────────────────────────────────────────────────────────

// HTMLFormElement.requestSubmit polyfill
HTMLFormElement.prototype.requestSubmit = function (submitter?: HTMLElement) {
  const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
  if (submitter) (submitEvent as any).submitter = submitter
  this.dispatchEvent(submitEvent)
}

// window.matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ResizeObserver mock
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// IntersectionObserver mock
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// ─────────────────────────────────────────────────────────────────
// External Dependency Mocks
// ─────────────────────────────────────────────────────────────────

// AWS Amplify
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn().mockResolvedValue({
    isSignedIn: true,
    nextStep: { signInStep: 'DONE' },
  }),
  signUp: vi.fn().mockResolvedValue({
    isSignUpComplete: false,
    nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
  }),
  // ... additional auth methods
}))

// TanStack Router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
    useParams: () => ({}),
    useSearch: () => ({}),
    Link: vi.fn(({ children }) => children),
  }
})

// Logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}))
```

#### Adding New Global Mocks

When adding mocks that apply to **all tests**:

1. Add the mock to `src/test/setup.ts`
2. Document why it's needed (browser API limitation, external service, etc.)
3. Keep mocks minimal—only mock what's necessary for tests to run

### Custom Render Utilities

The `test-utils.tsx` file provides a custom `render` function that wraps components with all required providers:

```typescript
// src/test/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { AuthProvider } from '../services/auth/AuthProvider'
import { NavigationProvider } from '../components/Navigation/NavigationProvider'
import { authSlice } from '../store/slices/authSlice'
import { navigationSlice } from '../store/slices/navigationSlice'
import { themeSlice } from '../store/slices/themeSlice'
import { globalUISlice } from '../store/slices/globalUISlice'

// ─────────────────────────────────────────────────────────────────
// Mock Store Factory
// ─────────────────────────────────────────────────────────────────

export const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      navigation: navigationSlice.reducer,
      theme: themeSlice.reducer,
      globalUI: globalUISlice.reducer,
    },
    preloadedState: initialState,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
      }),
  })
}

// ─────────────────────────────────────────────────────────────────
// Test Wrapper Component
// ─────────────────────────────────────────────────────────────────

interface TestWrapperProps {
  children: React.ReactNode
  initialState?: Record<string, unknown>
}

export function TestWrapper({ children, initialState = {} }: TestWrapperProps) {
  const store = createMockStore(initialState)

  return (
    <Provider store={store}>
      <AuthProvider>
        <NavigationProvider>
          {children}
        </NavigationProvider>
      </AuthProvider>
    </Provider>
  )
}

// ─────────────────────────────────────────────────────────────────
// Custom Render Function
// ─────────────────────────────────────────────────────────────────

export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions & { initialState?: Record<string, unknown> } = {},
) => {
  const { initialState, ...renderOptions } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper initialState={initialState}>{children}</TestWrapper>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
```

#### Usage in Tests

```typescript
// ✅ Use custom render for components needing Redux/Context
import { renderWithProviders, screen } from '@/test/test-utils'

it('displays user name when authenticated', () => {
  renderWithProviders(<UserProfile />, {
    initialState: mockAuthStates.authenticated,
  })

  expect(screen.getByText('Test User')).toBeInTheDocument()
})

// ✅ Use standard render for isolated components
import { render, screen } from '@testing-library/react'

it('renders button with label', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole('button')).toHaveTextContent('Click me')
})
```

### Test Data Fixtures

Fixtures provide reusable, consistent test data. They're organized in `src/test/mocks.tsx`:

```typescript
// src/test/mocks.tsx

// ─────────────────────────────────────────────────────────────────
// User Fixtures
// ─────────────────────────────────────────────────────────────────

export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  preferences: {
    theme: 'light' as const,
    notifications: true,
  },
}

// ─────────────────────────────────────────────────────────────────
// Auth State Fixtures
// ─────────────────────────────────────────────────────────────────

export const mockAuthStates = {
  authenticated: {
    auth: {
      isAuthenticated: true,
      user: mockUser,
      isLoading: false,
      error: null,
    },
  },
  unauthenticated: {
    auth: {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    },
  },
  loading: {
    auth: {
      isAuthenticated: false,
      user: null,
      isLoading: true,
      error: null,
    },
  },
  error: {
    auth: {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: 'Authentication failed',
    },
  },
}

// ─────────────────────────────────────────────────────────────────
// Form Data Fixtures
// ─────────────────────────────────────────────────────────────────

export const mockFormData = {
  validLogin: {
    email: 'test@example.com',
    password: 'ValidPassword123!',
  },
  invalidLogin: {
    email: 'invalid-email',
    password: '123',
  },
  validSignup: {
    name: 'Test User',
    email: 'test@example.com',
    password: 'ValidPassword123!',
    confirmPassword: 'ValidPassword123!',
    acceptTerms: true,
  },
  invalidSignup: {
    name: 'T',
    email: 'invalid-email',
    password: 'weak',
    confirmPassword: 'different',
    acceptTerms: false,
  },
}

// ─────────────────────────────────────────────────────────────────
// External Service Mocks
// ─────────────────────────────────────────────────────────────────

export const mockAmplifyAuth = {
  signIn: vi.fn().mockResolvedValue({
    isSignedIn: true,
    nextStep: { signInStep: 'DONE' },
  }),
  signUp: vi.fn().mockResolvedValue({
    isSignUpComplete: false,
    nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
  }),
  confirmSignUp: vi.fn().mockResolvedValue({
    isSignUpComplete: true,
    nextStep: { signUpStep: 'DONE' },
  }),
  resetPassword: vi.fn().mockResolvedValue({
    nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
  }),
  signOut: vi.fn().mockResolvedValue({}),
}
```

#### Fixture Design Guidelines

| Guideline               | Rationale                                 |
| ----------------------- | ----------------------------------------- |
| Use descriptive names   | `mockAuthStates.authenticated` > `state1` |
| Create variations       | Cover valid, invalid, edge cases          |
| Keep fixtures immutable | Create new objects, don't mutate          |
| Colocate with usage     | Domain fixtures near domain tests         |

### Factory Functions (Advanced Pattern)

For complex objects with many variations, use factory functions with the builder pattern:

```typescript
// src/test/factories/userFactory.ts
import { mockUser } from '../mocks'

interface UserOverrides {
  id?: string
  email?: string
  name?: string
  role?: 'user' | 'admin' | 'moderator'
  isVerified?: boolean
}

export function createUser(overrides: UserOverrides = {}) {
  return {
    ...mockUser,
    ...overrides,
    id: overrides.id ?? `user-${Math.random().toString(36).slice(2, 9)}`,
  }
}

// Usage in tests:
const adminUser = createUser({ role: 'admin', isVerified: true })
const unverifiedUser = createUser({ isVerified: false })
```

### Playwright Custom Fixtures

E2E tests use Playwright's fixture system for shared setup and page objects:

```typescript
// apps/web/playwright/steps/fixtures.ts
import { test as base } from 'playwright-bdd'

/**
 * Custom fixtures for BDD tests
 */
export const test = base.extend<{
  authenticatedPage: Page
  testUser: { email: string; password: string }
}>({
  // Fixture: Pre-authenticated page
  authenticatedPage: async ({ page }, use) => {
    // Setup: Log in before test
    await page.goto('/login')
    await page.getByTestId('email-input').fill('test@example.com')
    await page.getByTestId('password-input').fill('ValidPassword123!')
    await page.getByTestId('sign-in-button').click()
    await page.waitForURL('/dashboard')

    // Provide the authenticated page to the test
    await use(page)

    // Teardown: Log out after test
    await page.getByTestId('user-menu').click()
    await page.getByText('Sign Out').click()
  },

  // Fixture: Test user credentials
  testUser: async ({}, use) => {
    await use({
      email: 'test@example.com',
      password: 'ValidPassword123!',
    })
  },
})
```

#### Using Custom Fixtures in Step Definitions

```typescript
// steps/dashboard.steps.ts
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './fixtures'

const { Given, When, Then } = createBdd(test)

Given('I am logged in', async ({ authenticatedPage }) => {
  // Page is already authenticated via fixture
  await expect(authenticatedPage.getByTestId('dashboard')).toBeVisible()
})

When('I view my profile', async ({ authenticatedPage }) => {
  await authenticatedPage.getByTestId('user-menu').click()
  await authenticatedPage.getByText('Profile').click()
})

Then('I should see my email', async ({ authenticatedPage, testUser }) => {
  await expect(authenticatedPage.getByText(testUser.email)).toBeVisible()
})
```

### Test Directory Structure Summary

```
apps/web/main-app/src/test/
├── setup.ts              # Global setup: polyfills, external mocks
├── test-utils.tsx        # Custom render, providers, store factory
├── mocks.tsx             # Shared mock objects and fixtures
└── factories/            # (Optional) Factory functions for complex data
    ├── userFactory.ts
    └── galleryFactory.ts

apps/web/playwright/
├── steps/
│   └── fixtures.ts       # Playwright custom fixtures
├── features/             # Gherkin feature files
└── playwright.config.ts
```

### Checklist: Adding a New Test Environment

When setting up tests for a new package:

- [ ] Create `vitest.config.ts` with appropriate environment (`jsdom` or `node`)
- [ ] Create `src/test/setup.ts` with required polyfills
- [ ] Create `src/test/test-utils.tsx` if components need providers
- [ ] Add test script to `package.json`: `"test": "vitest"`
- [ ] Configure coverage thresholds appropriate to package criticality
- [ ] Update CI pipeline if new package needs separate test stage

## Coverage Requirements

### Minimum Thresholds

| Package                     | Statements | Branches | Functions | Lines |
| --------------------------- | ---------- | -------- | --------- | ----- |
| `@repo/ui`                  | 80%        | 75%      | 80%       | 80%   |
| `@repo/api-client`          | 85%        | 80%      | 85%       | 85%   |
| `main-app` (critical paths) | 80%        | 75%      | 80%       | 80%   |
| `main-app` (overall)        | 60%        | 50%      | 60%       | 60%   |
| Lambda handlers             | 85%        | 80%      | 85%       | 85%   |

### Critical Paths (Must Have High Coverage)

- Authentication flows
- Payment/checkout (if applicable)
- Data mutations (create, update, delete)
- Error boundaries
- Route guards

### Coverage Exclusions

```typescript
// vitest.config.ts
coverage: {
  exclude: [
    '**/node_modules/**',
    '**/*.config.*',
    '**/test/**',
    '**/__tests__/**',
    '**/*.d.ts',
    '**/types/**',
    '**/mocks/**',
  ],
}
```

## Best Practices

### Arrange-Act-Assert (AAA) Pattern

```typescript
it('should update user name', () => {
  // Arrange
  const store = createMockStore()
  const newName = 'Updated Name'

  // Act
  store.dispatch(updateUser({ name: newName }))

  // Assert
  expect(selectUserName(store.getState())).toBe(newName)
})
```

### Use `data-testid` for E2E Selection

```tsx
// ✅ Good - Stable selector
;<input data-testid="email-input" type="email" />

// In test
await page.getByTestId('email-input').fill('test@example.com')
```

### Avoid Test Pollution

```typescript
// ✅ Good - Reset state between tests
beforeEach(() => {
  vi.clearAllMocks()
  store = createFreshStore()
})

afterEach(() => {
  cleanup() // React Testing Library
})
```

### Prefer `waitFor` Over Fixed Timeouts

```typescript
// ✅ Good - Waits for condition
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})

// ❌ Bad - Arbitrary delay
await new Promise(resolve => setTimeout(resolve, 1000))
expect(screen.getByText('Success')).toBeInTheDocument()
```

### Test Error States

```typescript
it('should display error message on API failure', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 })
    })
  )

  render(<UserList />)

  await waitFor(() => {
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })
})
```

## Package-Specific Guidelines

### Frontend Components (`main-app`)

```typescript
// Component tests should verify:
// 1. Renders correctly with required props
// 2. Handles user interactions
// 3. Displays correct states (loading, error, empty)
// 4. Accessibility (roles, labels)

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Submit</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Redux Slices & RTK Query

```typescript
// Test slices in isolation
describe('authSlice', () => {
  it('handles login success', () => {
    const initialState = { user: null, isAuthenticated: false }
    const user = { id: '123', email: 'test@example.com' }

    const result = authSlice.reducer(initialState, setAuthenticated({ user, tokens: null }))

    expect(result.isAuthenticated).toBe(true)
    expect(result.user).toEqual(user)
  })
})

// Test RTK Query endpoints with MSW
describe('userApi', () => {
  it('fetches user successfully', async () => {
    const { result } = renderHook(() => useGetUserQuery('123'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: '123', name: 'Test User' })
  })
})
```

### Backend Lambda Handlers

```typescript
// apps/api/endpoints/gallery/__tests__/list.test.ts
import { describe, it, expect, vi } from 'vitest'
import { handler } from '../list'
import { createMockContext, createMockEvent } from '@/test/utils'

describe('GET /api/gallery', () => {
  it('returns paginated gallery items', async () => {
    const event = createMockEvent({
      queryStringParameters: { limit: '10', cursor: null },
    })

    const result = await handler(event, createMockContext())

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.items).toHaveLength(10)
    expect(body.nextCursor).toBeDefined()
  })

  it('returns 401 for unauthenticated requests', async () => {
    const event = createMockEvent({ headers: {} }) // No auth header

    const result = await handler(event, createMockContext())

    expect(result.statusCode).toBe(401)
  })
})
```

## CI/CD Integration

### Pipeline Stages

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Install dependencies
      run: pnpm install

    - name: Type check
      run: pnpm check-types

    - name: Lint
      run: pnpm lint

    - name: Unit & Integration Tests
      run: pnpm test --coverage

    - name: E2E Tests
      run: pnpm --filter @repo/playwright test

    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

### Required Gates

| Gate        | Condition     | Blocking     |
| ----------- | ------------- | ------------ |
| Type Check  | Must pass     | Yes          |
| Lint        | Must pass     | Yes          |
| Unit Tests  | Must pass     | Yes          |
| Coverage    | >= thresholds | Yes          |
| E2E (smoke) | Must pass     | Yes          |
| E2E (full)  | Must pass     | No (warning) |

## Running Tests

### Common Commands

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter main-app test
pnpm --filter @repo/ui test

# Run with coverage
pnpm --filter main-app test -- --coverage

# Run in watch mode
pnpm --filter main-app test -- --watch

# Run specific test file
pnpm --filter main-app test -- src/components/Auth/__tests__/LoginForm.test.tsx
```

### E2E Commands (Playwright + BDD)

```bash
# Generate and run all BDD tests
pnpm --filter @repo/playwright test

# Generate BDD tests only
pnpm --filter @repo/playwright bdd:gen

# Run smoke tests only
pnpm --filter @repo/playwright test:bdd:smoke

# Run with UI mode
pnpm --filter @repo/playwright test:ui

# Run headed (visible browser)
pnpm --filter @repo/playwright test:headed

# Run legacy spec tests
pnpm --filter @repo/playwright test:legacy
```

### Debugging Tests

```bash
# Vitest UI
pnpm --filter main-app test -- --ui

# Playwright debug mode
pnpm --filter @repo/playwright test:debug

# Run single scenario
pnpm --filter @repo/playwright test -- --grep "Display login page"
```

## Related Documentation

- **Coding Standards**: `/docs/architecture/coding-standards.md`
- **Tech Stack**: `/docs/architecture/tech-stack.md`
- **Source Tree**: `/docs/architecture/source-tree.md`

---

**Last Updated**: 2025-11-29
**Version**: 1.0
