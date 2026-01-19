# Story 0.2.0: Auth E2E Test Suite - Validation & Completion

## Status

Approved

## Story

**As a** QA engineer,
**I want** a comprehensive, working E2E test suite for all authentication flows,
**so that** we can confidently validate auth functionality works correctly and catch regressions.

## Epic Context

This is a **parent story** for Epic 0.2: Authentication E2E Tests. It orchestrates:
- Validating existing tests work with current code
- Implementing draft stories 0.2.1 (Forgot Password) and 0.2.2 (Reset Password)
- Adding missing logout tests
- Ensuring proper test user cleanup

## Background

### Current State

**Existing Playwright Tests (features/auth/):**
- `signup.feature` - Sign up form and validation
- `login.feature` - Login form and validation
- `email-verification.feature` - OTP input and verification
- `account-creation-e2e.feature` - Full account creation flow

**Existing Utilities (utils/):**
- `cognito-admin.ts` - Admin operations for testing:
  - `adminConfirmSignUp()` - Bypass email verification
  - `adminDeleteUser()` - Clean up test users
  - `generateTestEmail()` - Generate unique test emails
  - `cleanupTestUser()` - Safe cleanup wrapper

**Draft Stories:**
- 0.2.1: Forgot Password Tests (Draft)
- 0.2.2: Reset Password Tests (Draft)

**Missing:**
- Logout tests
- Validation that existing tests pass with current code

### Email Verification Testing Strategy

Use `adminConfirmSignUp()` from `cognito-admin.ts` to bypass actual email sending:

```typescript
// After user signs up, confirm them programmatically
import { adminConfirmSignUp } from '../utils/cognito-admin'

// In test setup or step definition
await adminConfirmSignUp(testUserEmail)
```

### User Cleanup Strategy

All test users MUST be cleaned up after tests to avoid polluting Cognito:

```typescript
import { cleanupTestUser, generateTestEmail } from '../utils/cognito-admin'

// Generate unique email for test
const testEmail = generateTestEmail('e2e-auth')

// In afterAll or test teardown
await cleanupTestUser(testEmail)
```

## Acceptance Criteria

1. All existing auth E2E tests (signup, login, email-verification) pass with current code
2. Forgot password tests implemented per story 0.2.1
3. Reset password tests implemented per story 0.2.2
4. Logout tests implemented (new)
5. All tests use `adminConfirmSignUp()` to bypass email verification where needed
6. All tests clean up created users via `adminDeleteUser()` in teardown
7. No test users left in Cognito user pool after test suite completes
8. Tests can run in CI/CD pipeline

## Tasks / Subtasks

- [ ] **Task 1: Validate Existing Tests** (AC: 1)
  - [ ] Run existing signup.feature tests, fix any failures
  - [ ] Run existing login.feature tests, fix any failures
  - [ ] Run existing email-verification.feature tests, fix any failures
  - [ ] Run existing account-creation-e2e.feature tests, fix any failures
  - [ ] Document any code changes needed to make tests pass

- [ ] **Task 2: Implement Forgot Password Tests** (AC: 2)
  - [ ] Create `features/auth/forgot-password.feature` per story 0.2.1
  - [ ] Implement step definitions in `steps/forgot-password.steps.ts`
  - [ ] Test UI elements, validation, happy path, navigation
  - [ ] Verify tests pass

- [ ] **Task 3: Implement Reset Password Tests** (AC: 3)
  - [ ] Create `features/auth/reset-password.feature` per story 0.2.2
  - [ ] Implement step definitions in `steps/reset-password.steps.ts`
  - [ ] Test UI elements, validation, password strength, happy path, error handling
  - [ ] Verify tests pass

- [ ] **Task 4: Implement Logout Tests** (AC: 4)
  - [ ] Create `features/auth/logout.feature`
  - [ ] Implement step definitions in `steps/logout.steps.ts`
  - [ ] Scenarios:
    - [ ] Logout button visible when authenticated
    - [ ] Clicking logout clears session
    - [ ] After logout, protected routes redirect to login
    - [ ] After logout, login page accessible
  - [ ] Verify tests pass

- [ ] **Task 5: Implement Email Verification Bypass** (AC: 5)
  - [ ] Ensure `adminConfirmSignUp()` is used in account-creation-e2e tests
  - [ ] Update any tests that require confirmed users to use admin bypass
  - [ ] Verify no actual emails are sent during tests

- [ ] **Task 6: Implement User Cleanup** (AC: 6, 7)
  - [ ] Add `afterAll` hooks to all auth test suites
  - [ ] Track all created test users during test run
  - [ ] Call `cleanupTestUser()` for each created user in teardown
  - [ ] Verify no test users remain after full test suite

- [ ] **Task 7: CI/CD Integration** (AC: 8)
  - [ ] Verify tests run in CI environment
  - [ ] Ensure AWS credentials available for Cognito admin operations
  - [ ] Verify cleanup runs even on test failure

## Dev Notes

### Relevant Source Tree

```
apps/web/playwright/
├── features/
│   └── auth/
│       ├── signup.feature              # Existing
│       ├── login.feature               # Existing
│       ├── email-verification.feature  # Existing
│       ├── account-creation-e2e.feature # Existing
│       ├── forgot-password.feature     # To create (Story 0.2.1)
│       ├── reset-password.feature      # To create (Story 0.2.2)
│       └── logout.feature              # To create (new)
├── steps/
│   ├── common.steps.ts                 # Shared steps
│   ├── signup.steps.ts                 # Existing
│   ├── login.steps.ts                  # Existing
│   ├── email-verification.steps.ts     # Existing
│   ├── account-creation-e2e.steps.ts   # Existing
│   ├── forgot-password.steps.ts        # To create
│   ├── reset-password.steps.ts         # To create
│   └── logout.steps.ts                 # To create
├── utils/
│   ├── cognito-admin.ts                # Admin ops (exists)
│   ├── api-mocks.ts                    # API mocking
│   └── test-constants.ts               # Test constants
└── playwright.config.ts
```

### Cognito Admin Utilities

From `apps/web/playwright/utils/cognito-admin.ts`:

```typescript
// Bypass email verification
export async function adminConfirmSignUp(email: string): Promise<{ success: boolean; error?: string }>

// Delete test user
export async function adminDeleteUser(email: string): Promise<{ success: boolean; error?: string }>

// Check if user exists
export async function adminGetUser(email: string): Promise<{ exists: boolean; confirmed?: boolean; error?: string }>

// Generate unique test email
export function generateTestEmail(prefix = 'testuser'): string

// Safe cleanup wrapper
export async function cleanupTestUser(email: string): Promise<void>
```

### Required IAM Permissions

Tests require AWS credentials with these Cognito permissions:
- `cognito-idp:AdminConfirmSignUp`
- `cognito-idp:AdminDeleteUser`
- `cognito-idp:AdminGetUser`

### Test User Tracking Pattern

```typescript
// In test setup
const createdUsers: string[] = []

function trackUser(email: string) {
  createdUsers.push(email)
}

// In afterAll
afterAll(async () => {
  for (const email of createdUsers) {
    await cleanupTestUser(email)
  }
})
```

### Logout Feature Template

```gherkin
@auth @logout
Feature: User Logout
  As an authenticated user
  I want to log out of my account
  So that my session is securely ended

  Background:
    Given I am logged in as a test user

  @ui
  Scenario: Logout button is visible when authenticated
    Then I should see a logout button

  @happy-path
  Scenario: Successful logout clears session
    When I click the logout button
    Then I should be redirected to the login page
    And I should not be authenticated

  @navigation
  Scenario: Protected routes redirect after logout
    When I click the logout button
    And I navigate to a protected route
    Then I should be redirected to the login page
```

## Testing

### Test Location
- Feature files: `apps/web/playwright/features/auth/`
- Step definitions: `apps/web/playwright/steps/`

### Test Frameworks
- Playwright for browser automation
- Cucumber/Gherkin for BDD syntax
- playwright-bdd for integration

### Running Tests

```bash
# Run all auth tests
cd apps/web/playwright
pnpm test --grep @auth

# Run specific feature
pnpm test features/auth/logout.feature

# Run with cleanup verification
pnpm test --grep @auth && echo "Verify no test users in Cognito"
```

## Related Stories

- **0.2.1**: Forgot Password Tests (Draft) - Implementation details
- **0.2.2**: Reset Password Tests (Draft) - Implementation details

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2024-12-26 | 0.1 | Initial draft - parent story for auth E2E suite | SM Agent (Bob) |
