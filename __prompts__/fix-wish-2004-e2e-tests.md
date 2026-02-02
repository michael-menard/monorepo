# Fix WISH-2004 E2E Tests

## Objective
Get the WISH-2004 Playwright E2E tests passing. These tests are in:
- `apps/web/playwright/tests/wishlist/delete-flow.spec.ts`
- `apps/web/playwright/tests/wishlist/purchase-flow.spec.ts`
- `apps/web/playwright/tests/wishlist/modal-accessibility.spec.ts`

## Current State
- **Authentication works**: Login via UI succeeds, redirects to dashboard
- **Navigation works**: Clicking wishlist link navigates to `/wishlist`
- **Page stuck on "Loading..."**: API calls fail, wishlist data never loads

## Root Cause: API Path Mismatch

### Frontend expects (RTK Query in `@repo/api-client`):
```
GET  /api/v2/wishlist/items
GET  /api/v2/wishlist/items/:id
POST /api/v2/wishlist/items
PUT  /api/v2/wishlist/items/:id
DELETE /api/v2/wishlist/items/:id
```
See: `packages/core/api-client/src/config/endpoints.ts`

### Backend provides (Hono in `lego-api`):
```
GET  /wishlist
GET  /wishlist/:id
POST /wishlist
PUT  /wishlist/:id
DELETE /wishlist/:id
```
See: `apps/api/lego-api/domains/wishlist/routes.ts` mounted at `/wishlist` in `server.ts`

## Configuration Details

### Cognito (for test user authentication)
- **Test pool**: `us-east-1_vtW1Slo3o`
- **Test client**: `4527ui02h63b7c0ra7vs00gua5`
- **Test user**: `stan.marsh@southpark.test` / `0Xcoffee?`

### API Server
- Runs on port **3001**
- Verify with: `curl http://localhost:3001/wishlist` (returns 401 Unauthorized = working)

### Key Files
- `apps/web/playwright/playwright.legacy.config.ts` - Test config for legacy spec tests
- `apps/web/playwright/fixtures/browser-auth.fixture.ts` - Browser-based auth fixture
- `apps/web/main-app/vite.config.ts` - Has proxy config (not working yet)
- `apps/web/main-app/src/mocks/handlers.ts` - MSW handlers (has v2 endpoints now)

## Two Approaches to Fix

### Option A: Use MSW (Recommended for test isolation)
1. Enable MSW in the playwright config
2. Ensure handlers in `apps/web/main-app/src/mocks/handlers.ts` handle `/api/v2/wishlist/items` paths
3. Set `VITE_SERVERLESS_API_BASE_URL` to same origin as dev server so MSW can intercept

The v2 handlers have already been added to handlers.ts. You need to:
- Update `playwright.legacy.config.ts` to use `VITE_ENABLE_MSW=true`
- Verify MSW is intercepting requests (check browser console/network tab)

### Option B: Use Live API with Vite Proxy
1. Vite proxy in `vite.config.ts` should rewrite `/api/v2/wishlist/items` → `/wishlist`
2. Currently added but not working - may need debugging
3. Proxy target is `http://localhost:3001`

Debug steps:
- Add logging to proxy config: `configure: (proxy) => { proxy.on('proxyReq', ...) }`
- Check if requests are reaching the proxy
- Verify rewrite function is correct

### Option C: Align Backend Routes (Most work but cleanest)
Add `/api/v2` prefix to backend routes in `apps/api/lego-api/server.ts`:
```typescript
app.route('/api/v2/wishlist', wishlist)
// or use a base path middleware
```

## Run Tests
```bash
cd apps/web/playwright
npx playwright test tests/wishlist/delete-flow.spec.ts --config=playwright.legacy.config.ts --timeout=90000 --reporter=list
```

## Success Criteria
- All 9 tests in delete-flow.spec.ts pass
- All tests in purchase-flow.spec.ts pass
- All tests in modal-accessibility.spec.ts pass

## Relevant Lessons Learned
See: `plans/stories/LESSONS-LEARNED.md` - entry "WISH-2004: Playwright E2E Test Debugging Session"
