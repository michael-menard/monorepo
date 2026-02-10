# Playwright MSW Browser-Mode Setup

Story: WISH-2121

## Overview

This project supports two modes for E2E testing:

- **`chromium-live`** - Tests against the real backend (requires API server)
- **`chromium-mocked`** - Tests with MSW intercepting all API/S3 requests in the browser (no backend needed)

Browser-mode MSW uses a Service Worker to intercept network requests directly in the browser, providing the same mocking layer used in Vitest unit tests.

## Quick Start

```bash
# Run E2E tests with MSW mocking (no backend required)
pnpm --filter @repo/playwright test --project=chromium-mocked

# Run E2E tests against live backend
pnpm --filter @repo/playwright test --project=chromium-live
```

## How It Works

1. The `chromium-mocked` Playwright project starts the dev server with `VITE_ENABLE_MSW=true`
2. The main-app bootstrap (`main.tsx`) detects this env var and imports `mocks/browser.ts`
3. `browser.ts` calls `setupWorker(...handlers)` to register the MSW Service Worker
4. The Service Worker (`mockServiceWorker.js` in `public/`) intercepts all matching requests
5. MSW handlers return mock responses - no real API or S3 calls are made

```
Browser Context
  |
  +--> Page navigates to localhost:3002
  |
  +--> main.tsx detects VITE_ENABLE_MSW=true
  |
  +--> setupWorker() registers Service Worker
  |
  +--> All fetch() calls pass through Service Worker
  |
  +--> MSW handlers match URL patterns and return mock data
```

## Worker Lifecycle (AC15)

The MSW worker lifecycle is managed by the application bootstrap, not by Playwright directly:

| Event | What Happens |
|-------|-------------|
| Dev server starts | Vite serves `mockServiceWorker.js` from `public/` |
| Page loads | `main.tsx` calls `worker.start()` once |
| Test navigates | Service Worker is already active, intercepts requests |
| Between tests | Playwright creates new browser context (isolated) |
| Test suite ends | Browser contexts are closed, workers are garbage collected |

Key points:
- `worker.start()` runs **once** when the app bootstraps (not per-test)
- Playwright's default context isolation gives each test an independent browser context
- Each browser context gets its own Service Worker instance
- No explicit per-test worker registration is needed
- No explicit `worker.stop()` call needed (contexts are isolated)

## Node-Mode vs Browser-Mode MSW

| Aspect | Vitest (Node-Mode) | Playwright (Browser-Mode) |
|--------|-------------------|--------------------------|
| Setup function | `setupServer()` | `setupWorker()` |
| Intercept mechanism | `@mswjs/interceptors` (Node.js) | Service Worker (browser) |
| Where it runs | Node.js process | Browser context |
| Handler definitions | Same `http.get()`, `http.post()`, etc. | Same handlers |
| Configuration file | `src/test/mocks/server.ts` | `src/mocks/browser.ts` |
| Worker script needed | No | Yes (`mockServiceWorker.js`) |
| Context isolation | Manual (`beforeEach`/`afterEach`) | Automatic (browser contexts) |

Both modes use the same handler definitions from `main-app/src/mocks/handlers.ts`.

## Error Injection (AC16)

MSW handlers support error injection via the `x-mock-error` HTTP header. In Playwright, use `page.route()` to add the header before MSW processes the request:

### Presign Error (500)

```typescript
await page.route('**/api/wishlist/images/presign', async route => {
  const headers = {
    ...route.request().headers(),
    'x-mock-error': '500',
  }
  await route.continue({ headers })
})
```

### S3 Upload Error (403)

```typescript
await page.route('**/*.s3.amazonaws.com/**', async route => {
  const headers = {
    ...route.request().headers(),
    'x-mock-error': '403',
  }
  await route.continue({ headers })
})
```

### Timeout Simulation

```typescript
await page.route('**/api/wishlist/images/presign', async route => {
  const headers = {
    ...route.request().headers(),
    'x-mock-error': 'timeout',
  }
  await route.continue({ headers })
})
```

### Using the Error Injection Helper

```typescript
import { injectPresignError, injectS3Error, clearInjectedErrors } from '../fixtures/msw-error-injection'

// Inject errors
await injectPresignError(page, '500')
await injectS3Error(page, '403')

// Clear all injected errors
await clearInjectedErrors(page)
```

### Supported Error Codes

| Endpoint | Error Codes | Effect |
|----------|------------|--------|
| `/api/wishlist/images/presign` | `500`, `403`, `timeout` | Returns error or hangs |
| `*.s3.amazonaws.com/*` | `403`, `500`, `timeout` | Returns error or hangs |

This pattern matches the error injection used in Vitest tests (WISH-2011) but uses Playwright's route API instead of `server.use()`.

## Extending Handlers (AC19)

### Adding a New Handler

Add handlers to `apps/web/main-app/src/mocks/handlers.ts`:

```typescript
// In handlers array:
http.get('/api/v2/my-new-endpoint', ({ request }) => {
  return HttpResponse.json({ data: 'mock response' })
})
```

Handlers added here are automatically available in both Vitest and Playwright tests.

### Global vs Per-Test Handlers

| Type | Where Defined | Scope |
|------|--------------|-------|
| Global handlers | `main-app/src/mocks/handlers.ts` | All tests |
| Per-test overrides | `page.route()` in step definitions | Single test |

For per-test behavior changes, use Playwright's `page.route()` to modify or intercept requests before MSW processes them.

### Handler Patterns

```typescript
// Exact path match
http.get('/api/v2/wishlist/items', handler)

// Path with parameters
http.get('/api/v2/wishlist/items/:id', handler)

// Wildcard prefix (any base URL)
http.get('*/api/v2/instructions/mocs', handler)

// Regex pattern (S3 bucket URLs)
http.put(/https:\/\/.*\.s3\.amazonaws\.com\/.*/, handler)
```

## Debugging

### Check Service Worker Registration

In step definitions or fixtures:

```typescript
const swCount = await page.evaluate(async () => {
  const registrations = await navigator.serviceWorker.getRegistrations()
  return registrations.length
})
console.log('Service workers registered:', swCount)
```

### Use the Request Inspector

```typescript
import { MswRequestInspector } from '../fixtures/msw-request-inspector'

const inspector = new MswRequestInspector(page)
await inspector.start()

// ... run test actions ...

// Check what was intercepted
const presignRequests = inspector.getRequestsByPattern(/presign/)
console.log('Presign requests:', presignRequests)
```

### MSW Console Logging

MSW logs to the browser console. Capture logs in tests:

```typescript
page.on('console', msg => {
  if (msg.text().includes('[MSW]')) {
    console.log('MSW:', msg.text())
  }
})
```

### CI Debugging

Set `DEBUG` environment variables for verbose output:

```bash
DEBUG=pw:api pnpm --filter @repo/playwright test --project=chromium-mocked
```

## Troubleshooting

### Service Worker Not Registering

- Verify `mockServiceWorker.js` exists in `apps/web/main-app/public/`
- Verify `VITE_ENABLE_MSW=true` is set (check `chromium-mocked` project config)
- Check browser console for MSW initialization errors

### Requests Not Being Intercepted

- Check that the URL pattern in the handler matches the actual request URL
- Handlers use relative paths (e.g., `/api/v2/...`) by default
- S3 handlers use regex to match any `*.s3.amazonaws.com` URL
- Use `MswRequestInspector` to debug what's being intercepted

### Tests Pass Locally but Fail in CI

- Ensure headless Chrome supports Service Workers (it does by default)
- Check that the dev server starts before tests run (`webServer.timeout`)
- Verify no real backend dependencies are needed for mocked tests

### MSW Worker Script Out of Date

Regenerate the worker script:

```bash
cd apps/web/main-app
npx msw init public/ --save
```

## File Structure

```
apps/web/playwright/
  fixtures/
    msw.fixture.ts              # Playwright fixture for MSW readiness
    msw-error-injection.ts      # Error injection helpers (AC21)
    msw-request-inspector.ts    # Request inspection utility (AC22)
  features/wishlist/
    wishlist-msw-upload.feature # MSW upload E2E test scenarios
  steps/
    wishlist-msw-upload.steps.ts # Step definitions for MSW tests
  setup/
    README.md                   # This file

apps/web/main-app/
  public/
    mockServiceWorker.js        # MSW Service Worker (generated)
  src/mocks/
    browser.ts                  # setupWorker() - browser-mode MSW
    handlers.ts                 # All MSW handler definitions
```
