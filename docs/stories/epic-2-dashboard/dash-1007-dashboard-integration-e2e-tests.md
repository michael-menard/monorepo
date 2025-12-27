# Story 7.8: Dashboard Integration & E2E Tests

## Status

Draft

## Story

**As a** QA engineer,
**I want** comprehensive integration and E2E tests for the dashboard,
**so that** we can verify the entire real-time dashboard flow works correctly.

## Acceptance Criteria

1. ✅ Integration tests verify REST API returns correct dashboard data
2. ✅ Integration tests verify WebSocket connection and event handling
3. ✅ E2E tests verify dashboard loads and displays all cards
4. ✅ E2E tests verify real-time updates work (mock backend events)
5. ✅ E2E tests verify degraded mode fallback behavior
6. ✅ E2E tests written in Gherkin `.feature` files
7. ✅ Performance test validates p95 latency < 600ms for REST endpoint
8. ✅ Performance test validates real-time latency < 2s from change to client
9. ✅ All tests pass in CI pipeline
10. ✅ Test coverage meets project thresholds

## Tasks / Subtasks

- [ ] **Task 1: Create Dashboard API Integration Tests** (AC: 1)
  - [ ] Create `apps/api/endpoints/dashboard/__tests__/dashboard.integration.ts`
  - [ ] Test full request/response cycle with test database
  - [ ] Verify response matches `DashboardViewSchema`
  - [ ] Test with various data scenarios (empty, full, partial)

- [ ] **Task 2: Create WebSocket Integration Tests** (AC: 2)
  - [ ] Create `apps/api/endpoints/websocket/dashboard/__tests__/websocket.integration.ts`
  - [ ] Test connection handshake with valid/invalid tokens
  - [ ] Test event emission to correct user rooms
  - [ ] Test event envelope format

- [ ] **Task 3: Create E2E Feature Files** (AC: 3, 4, 5, 6)
  - [ ] Create `apps/web/playwright/features/dashboard/dashboard.feature`
  - [ ] Write scenarios for initial page load
  - [ ] Write scenarios for real-time updates
  - [ ] Write scenarios for degraded mode

- [ ] **Task 4: Create E2E Step Definitions** (AC: 3, 4, 5)
  - [ ] Create `apps/web/playwright/steps/dashboard.steps.ts`
  - [ ] Implement Given steps for page navigation
  - [ ] Implement When steps for user actions
  - [ ] Implement Then steps for assertions

- [ ] **Task 5: Create Performance Tests** (AC: 7, 8)
  - [ ] Create `apps/api/endpoints/dashboard/__tests__/dashboard.perf.ts`
  - [ ] Test p95 latency for GET /api/dashboard
  - [ ] Test real-time event delivery latency
  - [ ] Use k6 or similar load testing tool

- [ ] **Task 6: Configure CI Pipeline** (AC: 9)
  - [ ] Add dashboard tests to GitHub Actions workflow
  - [ ] Configure test database for integration tests
  - [ ] Configure WebSocket mock server for E2E
  - [ ] Set up performance test stage

- [ ] **Task 7: Verify Coverage Thresholds** (AC: 10)
  - [ ] Run coverage report for dashboard-app
  - [ ] Run coverage report for API dashboard endpoints
  - [ ] Verify meets 80% threshold for critical paths
  - [ ] Document any coverage gaps with justification

## Dev Notes

### Source Tree Location
[Source: architecture/testing-strategy.md#file-organization]

```
apps/api/endpoints/dashboard/__tests__/
├── get.test.ts                    # Unit tests (Story 7.2)
├── dashboard.integration.ts       # Integration tests
└── dashboard.perf.ts              # Performance tests

apps/api/endpoints/websocket/dashboard/__tests__/
├── auth.test.ts                   # Unit tests (Story 7.3)
├── events.test.ts                 # Unit tests (Story 7.3)
└── websocket.integration.ts       # Integration tests

apps/web/playwright/
├── features/
│   └── dashboard/
│       └── dashboard.feature      # Gherkin E2E tests
├── steps/
│   └── dashboard.steps.ts         # Step definitions
└── fixtures/
    └── dashboard.fixtures.ts      # Test fixtures
```

### E2E Feature File (Gherkin)
[Source: architecture/testing-strategy.md#e2e-tests-playwright-gherkin]

```gherkin
# apps/web/playwright/features/dashboard/dashboard.feature
@dashboard
Feature: Real-Time Dashboard

  As an authenticated user
  I want to view my dashboard with real-time updates
  So that I can monitor my LEGO collection status

  Background:
    Given I am logged in as a user with MOCs

  @smoke
  Scenario: Dashboard displays all cards on initial load
    When I navigate to the dashboard
    Then I should see the Collection Summary card
    And I should see the Theme Breakdown card
    And I should see the Recent MOCs card
    And I should see the Quick Actions card
    And I should see the Partial Parts table

  Scenario: Collection Summary shows correct totals
    Given I have 10 MOCs and 5 wishlist items
    When I navigate to the dashboard
    Then the Collection Summary should show "10" total MOCs
    And the Collection Summary should show "5" wishlist items

  Scenario: Recent MOCs display in correct order
    Given I have recently added MOCs
    When I navigate to the dashboard
    Then the Recent MOCs card should show up to 10 MOCs
    And they should be ordered by date added descending

  Scenario: Quick Actions navigate to correct pages
    Given I am on the dashboard
    When I click "Add New MOC"
    Then I should be on the new MOC page
    When I navigate to the dashboard
    And I click "Browse Gallery"
    Then I should be on the gallery page

  @realtime
  Scenario: Real-time update when new MOC is added
    Given I am on the dashboard
    And the WebSocket connection is active
    When a new MOC is added to my collection
    Then the Recent MOCs card should update to show the new MOC
    And the Collection Summary should increment the total count

  @realtime
  Scenario: Real-time update for parts coverage change
    Given I am on the dashboard
    And the WebSocket connection is active
    And I have a MOC with partial parts ordered
    When the parts coverage changes to 75%
    Then the Partial Parts table should show 75% coverage

  @degraded
  Scenario: Degraded mode activates on connection failure
    Given I am on the dashboard
    When the WebSocket connection fails repeatedly
    Then I should see the degraded mode banner
    And the data should refresh via polling

  @degraded
  Scenario: Degraded mode clears on reconnection
    Given I am in degraded mode on the dashboard
    When the WebSocket connection is restored
    Then the degraded mode banner should disappear
    And real-time updates should resume

  Scenario: Connection status indicator reflects state
    Given I am on the dashboard
    When the WebSocket is connected
    Then I should see a green connection indicator
    When the WebSocket disconnects
    Then I should see a red connection indicator
```

### Step Definitions
[Source: architecture/testing-strategy.md#example-step-definitions]

```typescript
// apps/web/playwright/steps/dashboard.steps.ts
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../fixtures/dashboard.fixtures'

const { Given, When, Then } = createBdd(test)

// Background
Given('I am logged in as a user with MOCs', async ({ authenticatedPage, testUser }) => {
  // authenticatedPage fixture handles login
  await expect(authenticatedPage).toHaveURL(/dashboard|home/)
})

Given('I have {int} MOCs and {int} wishlist items', async ({ page, mockApi }, mocs, wishlist) => {
  mockApi.setDashboardData({
    summary: {
      totalMocs: mocs,
      totalWishlistItems: wishlist,
      mocsByBuildStatus: { ADDED: mocs, IN_PROGRESS: 0, BUILT: 0 },
      mocsByCoverageStatus: { FULL_INVENTORY: 0, PARTIAL_ORDERED: 0, NONE: mocs },
    },
    themeBreakdown: [],
    recentMocs: [],
    partialPartsMocs: [],
  })
})

// Navigation
When('I navigate to the dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
})

// Assertions
Then('I should see the Collection Summary card', async ({ page }) => {
  await expect(page.getByTestId('collection-summary-card')).toBeVisible()
})

Then('I should see the Theme Breakdown card', async ({ page }) => {
  await expect(page.getByTestId('theme-breakdown-card')).toBeVisible()
})

Then('I should see the Recent MOCs card', async ({ page }) => {
  await expect(page.getByTestId('recent-mocs-card')).toBeVisible()
})

Then('I should see the Quick Actions card', async ({ page }) => {
  await expect(page.getByTestId('quick-actions-card')).toBeVisible()
})

Then('I should see the Partial Parts table', async ({ page }) => {
  await expect(page.getByTestId('partial-parts-table')).toBeVisible()
})

Then('the Collection Summary should show {string} total MOCs', async ({ page }, count) => {
  await expect(page.getByTestId('total-mocs-count')).toHaveText(count)
})

// Quick Actions
When('I click {string}', async ({ page }, buttonText) => {
  await page.getByRole('button', { name: buttonText }).click()
})

Then('I should be on the new MOC page', async ({ page }) => {
  await expect(page).toHaveURL(/\/mocs\/new/)
})

Then('I should be on the gallery page', async ({ page }) => {
  await expect(page).toHaveURL(/\/gallery/)
})

// Real-time updates
Given('the WebSocket connection is active', async ({ page, mockWebSocket }) => {
  await mockWebSocket.connect()
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-connected', 'true')
})

When('a new MOC is added to my collection', async ({ mockWebSocket }) => {
  mockWebSocket.emit('dashboard:recentMocAdded', {
    eventId: 'test-event-1',
    type: 'dashboard:recentMocAdded',
    timestamp: new Date().toISOString(),
    payload: {
      id: 'new-moc-123',
      title: 'Test New MOC',
      theme: 'Star Wars',
      buildStatus: 'ADDED',
      coverImageUrl: null,
      createdAt: new Date().toISOString(),
    },
  })
})

Then('the Recent MOCs card should update to show the new MOC', async ({ page }) => {
  await expect(page.getByText('Test New MOC')).toBeVisible()
})

// Degraded mode
When('the WebSocket connection fails repeatedly', async ({ mockWebSocket }) => {
  await mockWebSocket.simulateReconnectFailure(10)
})

Then('I should see the degraded mode banner', async ({ page }) => {
  await expect(page.getByTestId('degraded-mode-banner')).toBeVisible()
})

Then('the data should refresh via polling', async ({ page, mockApi }) => {
  // Verify polling call is made
  await mockApi.waitForDashboardRequest({ timeout: 35000 })
})

Given('I am in degraded mode on the dashboard', async ({ page, mockWebSocket }) => {
  await page.goto('/dashboard')
  await mockWebSocket.simulateReconnectFailure(10)
  await expect(page.getByTestId('degraded-mode-banner')).toBeVisible()
})

When('the WebSocket connection is restored', async ({ mockWebSocket }) => {
  await mockWebSocket.simulateReconnect()
})

Then('the degraded mode banner should disappear', async ({ page }) => {
  await expect(page.getByTestId('degraded-mode-banner')).not.toBeVisible()
})
```

### Integration Test Example

```typescript
// apps/api/endpoints/dashboard/__tests__/dashboard.integration.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestServer, createTestDatabase, cleanupTestData } from '@/test/integration-utils'

describe('GET /api/dashboard (Integration)', () => {
  let server: TestServer
  let db: TestDatabase
  let testUserId: string

  beforeAll(async () => {
    server = await createTestServer()
    db = await createTestDatabase()
  })

  afterAll(async () => {
    await server.close()
    await db.close()
  })

  beforeEach(async () => {
    await cleanupTestData(db)
    testUserId = await db.createTestUser()
  })

  it('returns complete dashboard data for user with MOCs', async () => {
    // Seed test data
    await db.createMocs(testUserId, [
      { title: 'MOC 1', buildStatus: 'ADDED', coverageStatus: 'NONE' },
      { title: 'MOC 2', buildStatus: 'IN_PROGRESS', coverageStatus: 'PARTIAL_ORDERED' },
      { title: 'MOC 3', buildStatus: 'BUILT', coverageStatus: 'FULL_INVENTORY' },
    ])
    await db.createWishlistItems(testUserId, 5)

    const response = await server.request('/api/dashboard', {
      headers: { authorization: `Bearer ${await server.createToken(testUserId)}` },
    })

    expect(response.status).toBe(200)
    const body = await response.json()

    // Verify summary
    expect(body.summary.totalMocs).toBe(3)
    expect(body.summary.totalWishlistItems).toBe(5)
    expect(body.summary.mocsByBuildStatus.ADDED).toBe(1)
    expect(body.summary.mocsByBuildStatus.IN_PROGRESS).toBe(1)
    expect(body.summary.mocsByBuildStatus.BUILT).toBe(1)

    // Verify structure matches schema
    expect(() => DashboardViewSchema.parse(body)).not.toThrow()
  })

  it('returns empty arrays for user with no data', async () => {
    const response = await server.request('/api/dashboard', {
      headers: { authorization: `Bearer ${await server.createToken(testUserId)}` },
    })

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.summary.totalMocs).toBe(0)
    expect(body.themeBreakdown).toEqual([])
    expect(body.recentMocs).toEqual([])
    expect(body.partialPartsMocs).toEqual([])
  })

  it('returns 401 for unauthenticated request', async () => {
    const response = await server.request('/api/dashboard')

    expect(response.status).toBe(401)
  })

  it('isolates data between users', async () => {
    const otherUserId = await db.createTestUser()
    await db.createMocs(otherUserId, [{ title: 'Other User MOC' }])

    const response = await server.request('/api/dashboard', {
      headers: { authorization: `Bearer ${await server.createToken(testUserId)}` },
    })

    const body = await response.json()
    expect(body.summary.totalMocs).toBe(0) // Should not see other user's data
  })
})
```

### Performance Test

```typescript
// apps/api/endpoints/dashboard/__tests__/dashboard.perf.ts
import { describe, it, expect } from 'vitest'
import { createTestServer, createTestDatabase } from '@/test/integration-utils'

describe('Dashboard Performance', () => {
  it('GET /api/dashboard p95 latency < 600ms', async () => {
    const server = await createTestServer()
    const db = await createTestDatabase()
    const userId = await db.createTestUser()

    // Seed realistic amount of data
    await db.createMocs(userId, Array(50).fill({ title: 'Test MOC' }))

    const latencies: number[] = []

    // Run 100 requests
    for (let i = 0; i < 100; i++) {
      const start = performance.now()
      await server.request('/api/dashboard', {
        headers: { authorization: `Bearer ${await server.createToken(userId)}` },
      })
      latencies.push(performance.now() - start)
    }

    // Calculate p95
    latencies.sort((a, b) => a - b)
    const p95Index = Math.floor(latencies.length * 0.95)
    const p95Latency = latencies[p95Index]

    expect(p95Latency).toBeLessThan(600)
  })
})
```

### PRD Requirements Reference
[Source: docs/prd/dashboard-realtime-prd.md#11-non-functional-observability]

- D-NFR-1: p95 latency for GET /api/dashboard under 600ms
- D-NFR-2: p95 real-time latency from backend change to client event ≤ 2s

### Test Data IDs (data-testid)

Components must include these test IDs for E2E tests:

| Component | data-testid |
|-----------|-------------|
| Collection Summary Card | `collection-summary-card` |
| Theme Breakdown Card | `theme-breakdown-card` |
| Recent MOCs Card | `recent-mocs-card` |
| Quick Actions Card | `quick-actions-card` |
| Partial Parts Table | `partial-parts-table` |
| Connection Status | `connection-status` |
| Degraded Mode Banner | `degraded-mode-banner` |
| Total MOCs Count | `total-mocs-count` |
| Wishlist Items Count | `wishlist-items-count` |

## Testing

### Test Commands

```bash
# Unit tests
pnpm --filter @repo/dashboard-app test

# Integration tests (API)
pnpm --filter @repo/api test:integration -- --grep dashboard

# E2E tests
pnpm --filter @repo/playwright test:bdd -- --grep @dashboard

# Performance tests
pnpm --filter @repo/api test:perf -- --grep dashboard

# Coverage report
pnpm --filter @repo/dashboard-app test -- --coverage
```

### CI Pipeline Configuration

```yaml
# .github/workflows/test.yml additions
jobs:
  dashboard-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup
        uses: ./.github/actions/setup

      - name: Dashboard Unit Tests
        run: pnpm --filter @repo/dashboard-app test

      - name: Dashboard Integration Tests
        run: pnpm --filter @repo/api test:integration -- --grep dashboard
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

      - name: Dashboard E2E Tests
        run: pnpm --filter @repo/playwright test:bdd -- --grep @dashboard

      - name: Dashboard Performance Tests
        run: pnpm --filter @repo/api test:perf -- --grep dashboard
        if: github.ref == 'refs/heads/main'
```

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-30 | 0.1 | Initial draft | SM Agent (Bob) |
