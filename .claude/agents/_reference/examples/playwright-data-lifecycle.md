# Playwright Test Data Lifecycle Pattern

Complete pattern for creating and cleaning up test data via real API calls.

---

## Complete Step Definition File Pattern

```typescript
/**
 * Example Step Definitions with Proper Data Lifecycle
 *
 * Key patterns:
 * 1. Create data via real API calls
 * 2. Track all created resources
 * 3. Clean up after each scenario
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { createWishlistApiClient, WishlistApiClient, WishlistItem } from '../../utils/api-client'
import { TEST_USERS, authState } from '../../utils/api-auth'

const { Given, When, Then, Before, After } = createBdd()

// ─────────────────────────────────────────────────────────────────────────────
// Test State (tracks resources for cleanup)
// ─────────────────────────────────────────────────────────────────────────────

interface TestState {
  client: WishlistApiClient | null
  createdItems: WishlistItem[]
  currentItemId: string | null
}

const state: TestState = {
  client: null,
  createdItems: [],
  currentItemId: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle Hooks
// ─────────────────────────────────────────────────────────────────────────────

Before(async ({ request }) => {
  // Reset state for each scenario
  state.client = createWishlistApiClient(request, 'http://localhost:3001')
  state.createdItems = []
  state.currentItemId = null
})

After(async () => {
  // CLEANUP: Delete all items created during this scenario
  if (state.client && state.createdItems.length > 0) {
    for (const item of state.createdItems) {
      try {
        await state.client.delete(item.id)
      } catch (e) {
        // Item may already be deleted by test - that's OK
      }
    }
  }
  state.createdItems = []
})

// ─────────────────────────────────────────────────────────────────────────────
// Setup Steps (Create Real Data)
// ─────────────────────────────────────────────────────────────────────────────

Given('I have created a test item with title {string}', async ({}, title: string) => {
  // Real API call to create real data
  const response = await state.client!.create({
    title: `${title} ${Date.now()}`,  // Unique to avoid collisions
    store: 'LEGO',
  })
  expect(response.status()).toBe(201)

  const item = await response.json()
  state.createdItems.push(item)  // Track for cleanup
  state.currentItemId = item.id
})

// ─────────────────────────────────────────────────────────────────────────────
// Action Steps (Real API Operations)
// ─────────────────────────────────────────────────────────────────────────────

When('I update the current item', async () => {
  expect(state.currentItemId).not.toBeNull()
  // Real API call
  const response = await state.client!.update(state.currentItemId!, {
    title: 'Updated ' + Date.now(),
  })
  expect(response.status()).toBe(200)
})

// ─────────────────────────────────────────────────────────────────────────────
// Assertion Steps (Verify Real Results)
// ─────────────────────────────────────────────────────────────────────────────

Then('the item should exist in the database', async () => {
  expect(state.currentItemId).not.toBeNull()
  // Real API call to verify
  const response = await state.client!.get(state.currentItemId!)
  expect(response.status()).toBe(200)
})
```

---

## Feature File with Data Lifecycle

```gherkin
@WISH-XXXX
Feature: Example with proper data lifecycle

  Background:
    Given the API is available
    And I am authenticated as the primary test user
    # Note: Before hook creates client, After hook cleans up

  @AC1
  Scenario: Create and verify item
    Given I have created a test item with title "Test"  # Creates real data
    When I update the current item                       # Real API call
    Then the item should exist in the database           # Real verification
    # After hook automatically deletes the created item
```

---

## State Tracking Pattern

```typescript
// Shared state for tracking created resources
interface TestState {
  createdItems: Array<{ id: string; title: string }>
  currentItemId: string | null
}

const testState: TestState = {
  createdItems: [],
  currentItemId: null,
}

// Reset at start of each scenario
function resetTestState(): void {
  testState.createdItems = []
  testState.currentItemId = null
}
```

---

## Cleanup Best Practices

1. **Always track created resources** - Store IDs immediately after creation
2. **Use unique identifiers** - Append `Date.now()` to avoid collisions
3. **Clean up in After hook** - Runs even if test fails
4. **Handle deletion errors gracefully** - Item may already be deleted
5. **Reset state in Before hook** - Clean slate for each scenario
