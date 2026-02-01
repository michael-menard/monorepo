# Fix Playwright Tests for Story

## Overview

This prompt guides the process of diagnosing and fixing failing Playwright tests related to a specific story. Follow these steps to identify failures, analyze root causes, and implement fixes.

**Playwright Location:** `apps/web/playwright/`

## Input Required

Before starting, identify:
- **Story ID**: e.g., `WISH-2000`, `SETS-001`, `AUTH-042`
- **Test scope**: API tests, E2E tests, or both

## Directory Structure

```
apps/web/playwright/
├── features/           # BDD feature files (.feature)
│   ├── api/            # API-only tests
│   │   ├── auth/
│   │   └── wishlist/
│   ├── auth/
│   ├── gallery/
│   ├── sets/
│   ├── uploader/
│   └── wishlist/
├── steps/              # Step definitions
│   ├── api/            # API step implementations
│   └── ...             # E2E step implementations
├── fixtures/           # Test fixtures and setup
├── utils/              # Shared utilities (api-client, auth, etc.)
├── seeds/              # Test data seeds
├── playwright.config.ts        # E2E config
└── playwright.api.config.ts    # API-only config
```

## Step 1: Find Related Tests

Locate feature files and step definitions related to the story:

```bash
# Search for story ID in feature files
grep -r "STORY_ID" apps/web/playwright/features/

# Search for related domain keywords
grep -r "domain_keyword" apps/web/playwright/features/*.feature
```

## Step 2: Run the Failing Tests

Run tests to capture current failures:

```bash
# Run all Playwright tests
cd apps/web/playwright && pnpm test

# Run specific feature file
cd apps/web/playwright && pnpm test features/path/to/feature.feature

# Run API tests only
cd apps/web/playwright && pnpm test:api

# Run with debug output
cd apps/web/playwright && DEBUG=pw:api pnpm test
```

## Step 3: Analyze Failures

For each failing test:

1. **Read the feature file** - Understand the expected behavior
2. **Read the step definition** - Check the implementation
3. **Check test output** - Look for:
   - HTTP status code mismatches
   - Response body validation errors
   - Timeout issues
   - Selector/element not found errors
   - Authentication failures

4. **Common failure patterns**:
   - API contract changed (schema mismatch)
   - Auth token expired or misconfigured
   - Database state not properly seeded
   - Race conditions / timing issues
   - Environment variable missing

## Step 4: Fix Categories

### API Contract Changes

If the API response structure changed:

1. Update step definitions in `steps/api/` to match new contract
2. Update Zod schemas if used for validation
3. Update assertions to match new response shape

### Authentication Issues

If auth is failing:

1. Check `utils/api-auth.ts` for token generation
2. Check `fixtures/cognito-auth.fixture.ts` for auth setup
3. Verify environment variables in `.env`

### Selector/Element Issues (E2E)

If elements aren't found:

1. Check if UI component structure changed
2. Update selectors to use accessible queries (`getByRole`, `getByLabel`)
3. Add proper waits for dynamic content

### Data/State Issues

If test data is wrong:

1. Check `seeds/` directory for test data setup
2. Verify database state before/after tests
3. Add proper cleanup in `afterEach` hooks

## Step 5: Implement Fixes

Follow these guidelines:

```typescript
// Use accessible selectors
await page.getByRole('button', { name: 'Submit' }).click()

// Wait for network idle when needed
await page.waitForLoadState('networkidle')

// Use proper assertions
await expect(page.getByRole('heading')).toHaveText('Expected Title')

// For API tests, validate response schema
expect(response.status()).toBe(200)
const body = await response.json()
expect(body).toMatchObject({ expected: 'shape' })
```

## Step 6: Verify Fixes

Run the tests multiple times to ensure stability:

```bash
# Run the specific test 3 times
cd apps/web/playwright && pnpm test features/path/to/feature.feature --repeat-each=3

# Run full test suite
cd apps/web/playwright && pnpm test
```

## Step 7: Update Story Documentation

If the story has a PROOF or VERIFICATION file, update it with:
- Tests that were fixed
- Root cause of failures
- Changes made

## Checklist

- [ ] Located all test files related to the story
- [ ] Ran tests and captured failure output
- [ ] Analyzed each failure's root cause
- [ ] Fixed step definitions where needed
- [ ] Fixed feature files if scenarios were incorrect
- [ ] Updated utils/fixtures if shared code needed changes
- [ ] Verified fixes with multiple test runs
- [ ] All tests pass consistently
- [ ] Updated story documentation

## Quick Reference Commands

```bash
# Navigate to Playwright directory
cd apps/web/playwright

# Run all tests
pnpm test

# Run API tests only
pnpm test:api

# Run specific feature
pnpm test features/wishlist/wishlist-gallery.feature

# Run with headed browser (E2E only)
pnpm test --headed

# Run with specific tag
pnpm test --grep @smoke

# Generate report
pnpm test --reporter=html

# View last run results
cat test-results/.last-run.json
```

## Troubleshooting

### Tests pass locally but fail in CI
- Check environment variables
- Verify test isolation (no shared state)
- Look for timing/race conditions

### Authentication errors
- Regenerate test tokens
- Check Cognito configuration
- Verify API base URL

### Flaky tests
- Add explicit waits
- Use `toPass()` for retry assertions
- Check for proper test isolation

---

## Example Usage

```
Story: WISH-2000 - Wishlist API Reorder

1. Find tests:
   grep -r "reorder" apps/web/playwright/features/

2. Run failing tests:
   cd apps/web/playwright && pnpm test features/api/wishlist/wishlist-api-reorder.feature

3. Fix: Updated step definition to handle new response format

4. Verify:
   pnpm test features/api/wishlist/wishlist-api-reorder.feature --repeat-each=3
   ✓ All passing
```
