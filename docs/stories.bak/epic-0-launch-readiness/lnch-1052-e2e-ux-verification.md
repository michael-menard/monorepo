# Story lnch-1052: E2E UX Improvements Verification

## Status

Draft

## Story

**As a** QA engineer,
**I want** E2E tests verifying UX improvements,
**so that** I can confirm all launch readiness UX work is complete.

## Epic Context

This is **Story 2 of Launch Readiness Epic: E2E Testing Workstream**.
Priority: **Critical** - Validates all UX launch readiness stories.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1051: E2E Happy Path (baseline E2E tests)
- All UX stories (lnch-1039 to lnch-1050) should be complete

## Related Stories

- lnch-1051: E2E Happy Path (core E2E tests)
- lnch-1043: Accessibility Audit (a11y E2E verification)

## Acceptance Criteria

1. E2E test verifies error messages display correctly
2. E2E test verifies empty states appear properly
3. E2E test verifies loading states are shown
4. E2E test verifies session expiry handling
5. E2E test verifies 404 page displays
6. E2E test verifies accessibility (axe-core)
7. All tests pass in CI/CD pipeline

## Tasks / Subtasks

- [ ] **Task 1: Create Error Message Tests** (AC: 1)
  - [ ] Trigger validation error, verify message
  - [ ] Trigger API error, verify toast
  - [ ] Trigger network error, verify message

- [ ] **Task 2: Create Empty State Tests** (AC: 2)
  - [ ] New user sees dashboard empty state
  - [ ] Empty gallery shows CTA
  - [ ] Empty search results show message

- [ ] **Task 3: Create Loading State Tests** (AC: 3)
  - [ ] Verify skeletons appear during load
  - [ ] Verify spinners on button actions
  - [ ] Verify loading indicators clear

- [ ] **Task 4: Create Session Expiry Tests** (AC: 4)
  - [ ] Expire token, verify re-auth prompt
  - [ ] Verify user can re-login
  - [ ] Verify return to original page

- [ ] **Task 5: Create Error Page Tests** (AC: 5)
  - [ ] Navigate to invalid URL
  - [ ] Verify 404 page displays
  - [ ] Verify navigation options work

- [ ] **Task 6: Create Accessibility Tests** (AC: 6)
  - [ ] Run axe-core on key pages
  - [ ] Verify no critical violations
  - [ ] Document any known exceptions

- [ ] **Task 7: Integrate with CI/CD** (AC: 7)
  - [ ] Add to E2E workflow
  - [ ] Ensure all tests pass
  - [ ] Fix any failures

## Dev Notes

### Error Message Test
```typescript
test('shows validation error on invalid input', async ({ page }) => {
  await page.goto('/create')

  // Submit without filling required fields
  await page.click('button[type="submit"]')

  // Verify error messages appear
  await expect(page.locator('.text-destructive')).toBeVisible()
  await expect(page.getByText('required')).toBeVisible()
})

test('shows error toast on API failure', async ({ page }) => {
  // Mock API to return 500
  await page.route('/api/mocs', route => route.fulfill({ status: 500 }))

  await page.goto('/dashboard')

  // Verify error toast appears
  await expect(page.getByRole('alert')).toContainText('Something went wrong')
})
```

### Empty State Test
```typescript
test('new user sees empty dashboard', async ({ page }) => {
  // Login as new user with no data
  await loginAsNewUser(page)

  await page.goto('/dashboard')

  // Verify empty state
  await expect(page.getByText('Welcome')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
})
```

### Loading State Test
```typescript
test('shows skeleton during data load', async ({ page }) => {
  // Slow down API response
  await page.route('/api/mocs', async route => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    await route.continue()
  })

  await page.goto('/gallery')

  // Verify skeleton appears
  await expect(page.locator('[data-testid="skeleton"]')).toBeVisible()

  // Wait for content
  await expect(page.locator('[data-testid="moc-card"]')).toBeVisible()
})
```

### Session Expiry Test
```typescript
test('handles session expiry gracefully', async ({ page }) => {
  await loginAsUser(page)

  // Expire the token
  await page.evaluate(() => {
    localStorage.removeItem('accessToken')
  })

  // Trigger API call
  await page.goto('/dashboard')

  // Verify re-auth prompt
  await expect(page.getByText('Session expired')).toBeVisible()
})
```

### 404 Test
```typescript
test('shows 404 page for invalid routes', async ({ page }) => {
  await page.goto('/this-page-does-not-exist')

  await expect(page.getByText('404')).toBeVisible()
  await expect(page.getByText('Page Not Found')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Go Home' })).toBeVisible()
})
```

### Accessibility Test
```typescript
import AxeBuilder from '@axe-core/playwright'

test('dashboard has no accessibility violations', async ({ page }) => {
  await loginAsUser(page)
  await page.goto('/dashboard')

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations).toEqual([])
})

// Run on multiple pages
const pages = ['/login', '/dashboard', '/gallery', '/create']

for (const url of pages) {
  test(`${url} has no a11y violations`, async ({ page }) => {
    await page.goto(url)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
}
```

### Pages to Test

| Page | Error States | Empty States | Loading | A11y |
|------|--------------|--------------|---------|------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Gallery | ✓ | ✓ | ✓ | ✓ |
| Create MOC | ✓ | - | ✓ | ✓ |
| MOC Detail | ✓ | - | ✓ | ✓ |
| Settings | ✓ | - | ✓ | ✓ |
| 404 | - | - | - | ✓ |

## Testing

### Test Requirements
- Tests verify UX stories are complete
- Tests run in CI/CD
- Accessibility tests use axe-core
- Network conditions are simulated

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
