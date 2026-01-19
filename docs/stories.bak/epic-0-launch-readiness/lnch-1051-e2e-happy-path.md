# Story lnch-1051: E2E Happy Path Journeys

## Status

Draft

## Story

**As a** QA engineer,
**I want** E2E tests for all critical user journeys,
**so that** I can verify the application works end-to-end before launch.

## Epic Context

This is **Story 1 of Launch Readiness Epic: E2E Testing Workstream**.
Priority: **Critical** - Validates all launch readiness work.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- All UX stories (lnch-1039 to lnch-1050) should be complete

## Related Stories

- lnch-1052: E2E UX Verification (additional E2E tests)
- lnch-1046: Browser Compatibility (cross-browser E2E)

## Acceptance Criteria

1. E2E test for complete signup/login flow
2. E2E test for create MOC flow (full upload)
3. E2E test for view/browse gallery
4. E2E test for edit MOC flow
5. E2E test for delete MOC flow
6. E2E test for user settings update
7. All tests pass in CI/CD pipeline

## Tasks / Subtasks

- [ ] **Task 1: Set Up E2E Test Infrastructure** (AC: 7)
  - [ ] Verify Playwright is configured
  - [ ] Set up test database/fixtures
  - [ ] Configure CI/CD workflow

- [ ] **Task 2: Create Auth Flow Tests** (AC: 1)
  - [ ] Signup with email/password
  - [ ] Email verification (mock)
  - [ ] Login with valid credentials
  - [ ] Login with invalid credentials
  - [ ] Logout flow

- [ ] **Task 3: Create MOC Upload Tests** (AC: 2)
  - [ ] Navigate to create page
  - [ ] Fill out MOC details
  - [ ] Upload instruction PDF
  - [ ] Upload thumbnail
  - [ ] Submit and verify creation

- [ ] **Task 4: Create Gallery Tests** (AC: 3)
  - [ ] Navigate to gallery
  - [ ] View MOC list
  - [ ] Click to view MOC detail
  - [ ] Verify detail page content

- [ ] **Task 5: Create Edit Flow Tests** (AC: 4)
  - [ ] Navigate to edit page
  - [ ] Modify MOC details
  - [ ] Save changes
  - [ ] Verify changes persisted

- [ ] **Task 6: Create Delete Flow Tests** (AC: 5)
  - [ ] Navigate to MOC detail
  - [ ] Click delete
  - [ ] Confirm deletion
  - [ ] Verify MOC removed

- [ ] **Task 7: Create Settings Tests** (AC: 6)
  - [ ] Navigate to settings
  - [ ] Update display name
  - [ ] Update avatar
  - [ ] Save and verify

## Dev Notes

### Playwright Location
- `apps/web/playwright/`

### Test Structure
```typescript
// tests/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can sign up', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'SecureP@ss123')
    await page.click('button[type="submit"]')

    // Verify redirect to verification or dashboard
    await expect(page).toHaveURL(/\/(verify|dashboard)/)
  })

  test('user can log in', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'existing@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
  })
})
```

### Test Fixtures
```typescript
// fixtures/test-user.ts
export const testUser = {
  email: 'e2e-test@example.com',
  password: 'TestP@ss123!',
  name: 'E2E Test User'
}

// Before all: Create test user via API
// After all: Clean up test data
```

### CI/CD Workflow
```yaml
# .github/workflows/e2e.yml
e2e:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: pnpm install
    - run: pnpm playwright install --with-deps
    - run: pnpm test:e2e
```

### Critical Journeys

| Journey | Steps | Priority |
|---------|-------|----------|
| Signup → Dashboard | 5+ | Critical |
| Login → Dashboard | 3 | Critical |
| Create MOC | 6+ | Critical |
| View Gallery | 3 | High |
| Edit MOC | 4 | High |
| Delete MOC | 3 | High |
| Update Settings | 4 | Medium |

## Testing

### Test Requirements
- All tests run in headless mode
- Tests use isolated test data
- Tests clean up after themselves
- Tests are deterministic (no flakiness)

### Run Commands
```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e tests/auth.spec.ts

# Run with UI
pnpm test:e2e --ui
```

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
