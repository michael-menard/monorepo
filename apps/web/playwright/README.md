# Playwright E2E & API Testing

This directory contains end-to-end tests using Playwright with BDD/Cucumber (Gherkin) syntax via `playwright-bdd`.

## Prerequisites

### For UI E2E Tests

The following services must be running:

| Service | Port | How to Start |
|---------|------|--------------|
| Frontend App | 3002 | `pnpm dev --port 3002` (in `apps/web/main-app`) |

> **Note:** UI tests auto-start the frontend via Playwright's `webServer` config, so manual startup is optional.

### For API Tests

The following services must be running:

| Service | Port | How to Start |
|---------|------|--------------|
| PostgreSQL Database | 5432 | Local install or Docker |
| Redis (optional) | 6379 | `docker-compose up -d redis` (in `apps/api/lego-api`) |
| LEGO API Server | 4000 | `pnpm dev` (in `apps/api/lego-api`) |

**Quick Start for API Tests:**

```bash
# Terminal 1: Start the database (if using Docker)
# Ensure PostgreSQL is running on port 5432

# Terminal 2: Start Redis (optional, for feature flag caching)
cd apps/api/lego-api
docker-compose up -d redis

# Terminal 3: Start the API server
cd apps/api/lego-api
pnpm dev

# Terminal 4: Run API tests
cd apps/web/playwright
pnpm test:api
```

## Environment Variables

Create a `.env` file in this directory if needed:

```env
# API Tests
API_BASE_URL=http://localhost:4000
API_LIVE_URL=https://api.your-domain.com  # For live API tests

# UI Tests
BASE_URL=http://localhost:3002
```

## Test Commands

### UI E2E Tests

```bash
pnpm test:e2e              # Run all E2E tests
pnpm test:ui               # Open Playwright UI mode
pnpm test:headed           # Run with visible browser
pnpm test:debug            # Run in debug mode

# BDD-specific
pnpm test:bdd              # Run all BDD tests
pnpm test:bdd:smoke        # Run smoke tests only (@smoke tag)
pnpm test:bdd:auth         # Run auth feature tests
pnpm test:bdd:uploader     # Run uploader feature tests
pnpm test:bdd:uploader:a11y  # Run uploader accessibility tests
pnpm test:bdd:uploader:perf  # Run uploader performance tests
```

### API Tests

```bash
pnpm test:api              # Run all API tests
pnpm test:api:smoke        # Run API smoke tests only
pnpm test:api:live         # Run against live API (uses API_LIVE_URL)

# By feature area
pnpm test:api:crud         # CRUD operations (list, create, update, delete)
pnpm test:api:auth         # Authorization & security tests
pnpm test:api:sorting      # Standard and smart sorting
pnpm test:api:reorder      # Batch reorder operations
pnpm test:api:purchase     # Purchase flow (wishlist → sets)
pnpm test:api:upload       # Presigned URL / image upload
pnpm test:api:validation   # Input validation & error handling

# By story
pnpm test:api:story @wish-2001   # Run tests for specific story
```

### Legacy Tests

```bash
pnpm test:legacy           # Run all legacy (non-BDD) tests
pnpm test:legacy:auth      # Auth tests
pnpm test:legacy:navigation  # Navigation tests
pnpm test:legacy:pages     # Page tests
pnpm test:legacy:profile   # Profile tests
```

## Project Structure

```
playwright/
├── features/                    # Gherkin feature files
│   ├── api/                     # API test features
│   │   └── wishlist/            # Wishlist API tests
│   │       ├── wishlist-api-crud.feature
│   │       ├── wishlist-api-auth.feature
│   │       ├── wishlist-api-sorting.feature
│   │       ├── wishlist-api-reorder.feature
│   │       ├── wishlist-api-purchase.feature
│   │       ├── wishlist-api-upload.feature
│   │       └── wishlist-api-validation.feature
│   ├── auth/                    # Auth UI features
│   ├── gallery/                 # Gallery UI features
│   ├── uploader/                # Uploader UI features
│   └── wishlist/                # Wishlist UI features
├── steps/                       # Step definitions
│   ├── api/                     # API step definitions
│   │   ├── api-common.steps.ts
│   │   ├── wishlist-api.steps.ts
│   │   ├── wishlist-api-auth.steps.ts
│   │   ├── wishlist-api-upload.steps.ts
│   │   └── wishlist-api-validation.steps.ts
│   ├── common.steps.ts          # Shared UI steps
│   ├── wishlist.steps.ts        # Wishlist UI steps
│   └── ...
├── utils/                       # Test utilities
│   ├── api-client.ts            # Typed API client
│   ├── api-fixtures.ts          # Test data factories
│   ├── api-auth.ts              # Auth token management
│   └── ...
├── tests/                       # Legacy (non-BDD) tests
├── fixtures/                    # Playwright fixtures
├── .features-gen/               # Generated test files (auto-created)
├── cucumber-report/             # Test reports
├── playwright.config.ts         # Playwright configuration
└── package.json
```

## Writing Tests

### BDD Feature Files

Feature files use Gherkin syntax:

```gherkin
@api @wishlist @crud
Feature: Wishlist API CRUD Operations

  Background:
    Given the API is available
    And I am authenticated as the primary test user

  @smoke
  Scenario: List wishlist items returns paginated results
    When I request the wishlist list endpoint
    Then the response status should be 200
    And the response should contain an "items" array
```

### Step Definitions

Step definitions implement the Gherkin steps:

```typescript
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

When('I request the wishlist list endpoint', async () => {
  const response = await apiState.client!.list()
  apiState.lastResponseStatus = response.status()
  apiState.lastResponseBody = await response.json()
})

Then('the response status should be {int}', async ({}, status: number) => {
  expect(apiState.lastResponseStatus).toBe(status)
})
```

### Regenerating Tests

After modifying feature files or step definitions:

```bash
pnpm bdd:gen
```

## Test Tags

| Tag | Description |
|-----|-------------|
| `@smoke` | Critical path tests, run frequently |
| `@api` | API tests (no browser UI) |
| `@auth` | Authentication/authorization tests |
| `@validation` | Input validation tests |
| `@a11y` | Accessibility tests |
| `@perf` | Performance tests |
| `@wish-XXXX` | Story-specific tests |

## Playwright Projects

| Project | Description |
|---------|-------------|
| `chromium-mocked` | UI tests with MSW mocking |
| `chromium-live` | UI tests against live API |
| `api-mocked` | API tests against local API |
| `api-live` | API tests against production API |

## Troubleshooting

### "Connection refused" errors

Ensure the required services are running:
- API tests: Check that `lego-api` is running on port 4000
- UI tests: Check that `main-app` is running on port 3002

### "Missing step definitions" errors

Run `pnpm bdd:gen` to regenerate test files after adding new steps.

### Tests timing out

- Increase timeout in `playwright.config.ts`
- Check network connectivity to the API
- Verify database is responding

## Related Documentation

- [Accessibility Testing](./ACCESSIBILITY.md)
- [Performance Testing](./PERFORMANCE.md)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [playwright-bdd Documentation](https://vitalets.github.io/playwright-bdd/)
