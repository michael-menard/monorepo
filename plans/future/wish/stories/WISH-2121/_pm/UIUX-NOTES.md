# UI/UX Notes: WISH-2121 - Playwright E2E MSW Setup for Browser-Mode Testing

## Verdict

**PASS** - This is a testing infrastructure story with minimal direct UI impact. The story sets up MSW browser-mode for Playwright E2E tests, enabling tests to run without real backend/S3 dependencies.

## MVP-Critical Assessment

### UI Classification

This story is primarily **testing infrastructure**, not UI feature development. The "UI touched" designation applies because:
1. Playwright E2E tests interact with the wishlist UI
2. MSW browser worker runs in the browser context during tests
3. Worker script is served from public directory

However, no user-facing UI components are created or modified. The infrastructure enables testing of existing UI.

---

## MVP Component Architecture

### Components Required for Core Journey

**None created** - This story creates test infrastructure, not UI components.

### Components Tested by This Infrastructure

The MSW browser-mode setup enables E2E testing of:
- `AddItemPage.tsx` - Add item form with image upload
- `WishlistForm` - Form component with file upload
- `useS3Upload` hook - Upload behavior verification

### Reuse Targets

| Target | Package | Purpose |
|--------|---------|---------|
| MSW handlers | `src/test/mocks/handlers.ts` | Reuse from WISH-2011 |
| MSW fixtures | `src/test/fixtures/` | Reuse from WISH-2011 |
| Playwright utilities | `apps/web/playwright/utils/` | Existing test helpers |

### shadcn Primitives

Not applicable - no UI components created.

---

## MVP Accessibility (Blocking Only)

**Not applicable** - This story creates testing infrastructure, not user-facing features.

### Future Accessibility Testing

The MSW browser-mode infrastructure enables:
- E2E accessibility testing via `@axe-core/playwright`
- Automated WCAG checks during E2E test runs
- Keyboard navigation verification in E2E tests

These are opportunities for WISH-2012 (Accessibility Testing Harness) to leverage this infrastructure.

---

## MVP Design System Rules

### Token-Only Colors

**Not applicable** - No UI components created.

### `_primitives` Import Requirement

**Not applicable** - No UI components created.

---

## MVP Playwright Evidence

### Core Journey Demonstration Steps

The following Playwright test validates MSW browser-mode infrastructure:

```typescript
// wishlist/add-item.spec.ts

test('upload flow works with MSW mocking', async ({ page }) => {
  // 1. Navigate to add item page
  await page.goto('/wishlist/add')

  // 2. Fill form with item details
  await page.fill('[data-testid="item-title"]', 'Test LEGO Set')
  await page.fill('[data-testid="item-price"]', '99.99')

  // 3. Select image file
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('fixtures/sample-image.jpg')

  // 4. Submit form
  await page.click('[data-testid="submit-button"]')

  // 5. Verify success (MSW intercepted all requests)
  await expect(page.locator('.toast-success')).toBeVisible()
})
```

### Evidence Requirements

| Step | Evidence |
|------|----------|
| Worker registration | Console log: `[MSW] Mocking enabled.` |
| Presign interception | MSW request log shows presign URL |
| S3 PUT interception | MSW request log shows S3 URL |
| Success state | Success toast visible in screenshot |

---

## Developer Experience Notes

### MSW Debug Mode

Enable MSW debugging in Playwright tests:

```typescript
// In Playwright global setup
worker.start({
  onUnhandledRequest: 'warn', // Log unhandled requests
})
```

With `DEBUG=pw:api` env var, Playwright will show detailed request logs including MSW interceptions.

### Test Isolation

Each Playwright browser context gets its own MSW worker instance. This ensures:
- No state bleed between tests
- Handler overrides apply only to current test
- Parallel tests run in isolation

---

## Non-Goals for UI/UX

This story explicitly does **not**:
- Create new UI components
- Modify existing UI
- Add user-facing features
- Change visual design

The infrastructure enables testing of existing UI without creating new UI.
