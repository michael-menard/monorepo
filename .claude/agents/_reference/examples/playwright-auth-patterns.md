# Playwright Authentication Patterns

Real Cognito authentication patterns for E2E tests.

---

## API Authentication

For API tests, use `authState` from `utils/api-auth.ts`:

```typescript
import { TEST_USERS, authState } from '../../utils/api-auth'

Given('I am authenticated as the primary test user', async () => {
  await authState.setUser(TEST_USERS.primary)  // Real Cognito auth
  apiState.client?.setAuthToken(authState.currentToken)
})
```

---

## UI Authentication

For UI tests, use the `browser-auth.fixture.ts`:

```typescript
import { test, expect } from '../fixtures/browser-auth.fixture'

test('authenticated test', async ({ authenticatedPage }) => {
  // authenticatedPage is already logged in with real Cognito
  await authenticatedPage.goto('/wishlist')
})
```

---

## Authentication in Feature Background

Every scenario needs auth setup in Background:

```gherkin
Feature: Authenticated feature

  Background:
    Given the API is available
    And I am authenticated as the primary test user

  Scenario: Do something
    When I do an action
    Then it should work
```

---

## Multi-User Testing

For cross-user isolation tests:

```typescript
Given('I am authenticated as {word} user', async ({}, userType: string) => {
  const user = TEST_USERS[userType as keyof typeof TEST_USERS]
  await authState.setUser(user)  // Real Cognito JWT
})
```

Example feature:

```gherkin
Scenario: User cannot see other user's items
  Given I am authenticated as the primary test user
  And I have created a wishlist item
  When I am authenticated as the secondary test user
  And I request the wishlist list endpoint
  Then my item should not be visible
```

---

## Cognito Configuration

Required environment variables:

```bash
export COGNITO_USER_POOL_ID="us-east-1_vtW1Slo3o"
export COGNITO_CLIENT_ID="4527ui02h63b7c0ra7vs00gua5"
```

---

## No Mock Authentication

**BANNED patterns:**

```typescript
// NEVER use these
setupAuthMock()           // BANNED
'mock-access-token'       // BANNED
page.route('**/api/**')   // BANNED for auth mocking
```

**ALWAYS use real Cognito:**

```typescript
// CORRECT
await authState.setUser(TEST_USERS.primary)
```
