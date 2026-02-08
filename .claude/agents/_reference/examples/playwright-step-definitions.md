# Playwright Step Definitions Reference

Existing step definitions for reuse in Playwright E2E tests.

---

## Authentication Steps (steps/api/wishlist-api.steps.ts)

```gherkin
Given the API is available
Given I am authenticated as the primary test user
Given I am authenticated as the secondary test user
Given I am not authenticated
```

---

## CRUD Steps (steps/api/wishlist-api.steps.ts)

```gherkin
Given I have created a wishlist item
Given I have created a wishlist item with title {string}
Given I have created {int} wishlist items
When I request the wishlist list endpoint
When I create a wishlist item with all fields
When I update the item with title {string}
When I delete the item
```

---

## Response Steps (steps/api/wishlist-api.steps.ts)

```gherkin
Then the response status should be {int}
Then the response should match the wishlist item schema
Then the response should contain a valid UUID id
Then the items array should have {int} items
```

---

## Sorting Steps (steps/api/api-common.steps.ts)

```gherkin
Given I have created item {string} with price {string} and pieceCount {int}
Then {string} should appear before {string} in results
Then items should be ordered by price from lowest to highest
```

---

## Finding Existing Steps

Before writing ANY step, search for existing steps:

```bash
grep -r "Given\|When\|Then" apps/web/playwright/steps/ | grep -i "<keyword>"
```

---

## Test Users (South Park Characters)

Available in `utils/api-auth.ts`:

```typescript
TEST_USERS.primary   // Stan Marsh - main test user
TEST_USERS.secondary // Kyle Broflovski - cross-user tests
TEST_USERS.cartman   // Eric Cartman - edge cases
TEST_USERS.kenny     // Kenny McCormick - additional tests
TEST_USERS.butters   // Butters Stotch - additional tests
TEST_USERS.admin     // Randy Marsh - admin tests
```
