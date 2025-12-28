# Story sets-1021: E2E Tests for Sets Gallery

## Status

Draft

## Story

**As a** developer,
**I want** comprehensive E2E tests for the Sets Gallery,
**So that** I can verify the complete user flow works before marking the epic complete.

## Acceptance Criteria

1. [ ] E2E test suite covers all critical user flows
2. [ ] Tests run in CI pipeline
3. [ ] All tests pass before epic marked complete
4. [ ] Test data is isolated (no pollution between tests)
5. [ ] Tests cover happy paths and key error scenarios
6. [ ] Mobile viewport tests for responsive behavior

## Tasks

- [ ] **Task 1: Test infrastructure setup**
  - [ ] Configure Playwright for Sets routes
  - [ ] Create test fixtures (user, sets)
  - [ ] Set up test database seeding

- [ ] **Task 2: Gallery tests**
  - [ ] View empty gallery
  - [ ] View gallery with sets
  - [ ] Search and filter sets
  - [ ] Sort by different fields
  - [ ] Pagination works

- [ ] **Task 3: CRUD tests**
  - [ ] Add set manually
  - [ ] View set detail
  - [ ] Edit set
  - [ ] Delete set with confirmation

- [ ] **Task 4: Feature tests**
  - [ ] Toggle build status
  - [ ] Adjust quantity
  - [ ] Image upload
  - [ ] MOC linking (if available)

- [ ] **Task 5: Error handling tests**
  - [ ] Network failure recovery
  - [ ] Validation errors
  - [ ] Unauthorized access

- [ ] **Task 6: Accessibility tests**
  - [ ] Keyboard navigation
  - [ ] Screen reader basics
  - [ ] Focus management

## Dev Notes

### Test File Structure

```
apps/web/playwright/
└── e2e/
    └── sets/
        ├── gallery.spec.ts
        ├── add-set.spec.ts
        ├── edit-set.spec.ts
        ├── delete-set.spec.ts
        ├── build-status.spec.ts
        ├── quantity.spec.ts
        ├── image-upload.spec.ts
        ├── moc-linking.spec.ts
        └── accessibility.spec.ts
```

### Test Fixtures

```typescript
// fixtures/sets.ts
import { test as base } from '@playwright/test'

interface SetFixtures {
  testSet: {
    id: string
    title: string
    setNumber: string
  }
  emptyGallery: void
  populatedGallery: { sets: Array<{ id: string; title: string }> }
}

export const test = base.extend<SetFixtures>({
  testSet: async ({ request }, use) => {
    // Create test set via API
    const response = await request.post('/api/sets', {
      data: {
        title: 'Test Set',
        setNumber: '12345',
        pieceCount: 500,
        theme: 'Star Wars',
        isBuilt: false,
        quantity: 1,
      },
    })
    const set = await response.json()

    await use(set)

    // Cleanup
    await request.delete(`/api/sets/${set.id}`)
  },

  emptyGallery: async ({ request }, use) => {
    // Ensure gallery is empty
    const response = await request.get('/api/sets')
    const { items } = await response.json()

    // Delete all existing sets
    for (const set of items) {
      await request.delete(`/api/sets/${set.id}`)
    }

    await use()
  },

  populatedGallery: async ({ request }, use) => {
    // Create multiple test sets
    const sets = []
    for (let i = 0; i < 5; i++) {
      const response = await request.post('/api/sets', {
        data: {
          title: `Test Set ${i + 1}`,
          setNumber: `1000${i}`,
          pieceCount: 100 * (i + 1),
          theme: i % 2 === 0 ? 'Star Wars' : 'City',
          isBuilt: i % 2 === 0,
        },
      })
      sets.push(await response.json())
    }

    await use({ sets })

    // Cleanup
    for (const set of sets) {
      await request.delete(`/api/sets/${set.id}`)
    }
  },
})
```

### Gallery Tests

```typescript
// gallery.spec.ts
import { test, expect } from '../fixtures/sets'

test.describe('Sets Gallery', () => {
  test('shows empty state for new user', async ({ page, emptyGallery }) => {
    await page.goto('/sets')

    await expect(page.getByText('Your collection is empty')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Set' })).toBeVisible()
  })

  test('displays sets in grid', async ({ page, populatedGallery }) => {
    await page.goto('/sets')

    for (const set of populatedGallery.sets) {
      await expect(page.getByText(set.title)).toBeVisible()
    }
  })

  test('search filters sets by title', async ({ page, populatedGallery }) => {
    await page.goto('/sets')

    await page.getByPlaceholder('Search').fill('Test Set 1')

    await expect(page.getByText('Test Set 1')).toBeVisible()
    await expect(page.getByText('Test Set 2')).not.toBeVisible()
  })

  test('theme filter works', async ({ page, populatedGallery }) => {
    await page.goto('/sets')

    await page.getByRole('combobox', { name: 'Theme' }).click()
    await page.getByRole('option', { name: 'Star Wars' }).click()

    // Only Star Wars sets visible
    const cards = page.locator('[data-testid="set-card"]')
    await expect(cards).toHaveCount(3) // Sets 1, 3, 5 are Star Wars
  })

  test('sort by piece count works', async ({ page, populatedGallery }) => {
    await page.goto('/sets')

    await page.getByRole('combobox', { name: 'Sort' }).click()
    await page.getByRole('option', { name: 'Piece Count' }).click()

    const firstCard = page.locator('[data-testid="set-card"]').first()
    await expect(firstCard).toContainText('500 pieces') // Highest first
  })
})
```

### Add Set Tests

```typescript
// add-set.spec.ts
import { test, expect } from '../fixtures/sets'

test.describe('Add Set', () => {
  test('can add set with required fields', async ({ page }) => {
    await page.goto('/sets/add')

    await page.getByLabel('Title').fill('Millennium Falcon')
    await page.getByLabel('Set Number').fill('75192')
    await page.getByLabel('Piece Count').fill('7541')
    await page.getByRole('combobox', { name: 'Theme' }).click()
    await page.getByRole('option', { name: 'Star Wars' }).click()

    await page.getByRole('button', { name: 'Add to Collection' }).click()

    // Redirected to gallery
    await expect(page).toHaveURL('/sets')
    await expect(page.getByText('Set added to collection')).toBeVisible()
    await expect(page.getByText('Millennium Falcon')).toBeVisible()
  })

  test('validates required title', async ({ page }) => {
    await page.goto('/sets/add')

    await page.getByRole('button', { name: 'Add to Collection' }).click()

    await expect(page.getByText('Title is required')).toBeVisible()
  })

  test('cancel returns to gallery', async ({ page }) => {
    await page.goto('/sets/add')
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page).toHaveURL('/sets')
  })
})
```

### Build Status Tests

```typescript
// build-status.spec.ts
import { test, expect } from '../fixtures/sets'

test.describe('Build Status Toggle', () => {
  test('can toggle build status from detail page', async ({ page, testSet }) => {
    await page.goto(`/sets/${testSet.id}`)

    // Initially "In Pieces"
    await expect(page.getByText('In Pieces')).toBeVisible()

    // Toggle to "Built"
    await page.getByRole('button', { name: /Built/i }).click()

    // Toast appears
    await expect(page.getByText('Marked as built')).toBeVisible()

    // Status updated
    await expect(page.getByRole('button', { name: /Built/i })).toHaveAttribute('aria-pressed', 'true')
  })

  test('undo reverts build status', async ({ page, testSet }) => {
    await page.goto(`/sets/${testSet.id}`)

    // Toggle
    await page.getByRole('button', { name: /Built/i }).click()

    // Click Undo in toast
    await page.getByRole('button', { name: 'Undo' }).click()

    // Reverted
    await expect(page.getByText('In Pieces')).toBeVisible()
  })
})
```

### Accessibility Tests

```typescript
// accessibility.spec.ts
import { test, expect } from '../fixtures/sets'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('gallery has no accessibility violations', async ({ page, populatedGallery }) => {
    await page.goto('/sets')

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('keyboard navigation works in gallery', async ({ page, populatedGallery }) => {
    await page.goto('/sets')

    // Tab to first card
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // Skip nav
    await page.keyboard.press('Tab') // Skip Add button

    // Arrow to navigate
    await page.keyboard.press('ArrowRight')

    // Check focus moved
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toHaveAttribute('data-testid', 'set-card')

    // Enter to open
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/sets\//)
  })

  test('modals trap focus', async ({ page, testSet }) => {
    await page.goto(`/sets/${testSet.id}`)

    // Open delete dialog
    await page.keyboard.press('Delete')

    // Focus should be in modal
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()

    // Tab should cycle within modal
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Still in modal
    const stillInModal = page.locator('[role="alertdialog"] :focus')
    await expect(stillInModal).toBeVisible()
  })
})
```

### CI Configuration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm --filter playwright test:e2e
        env:
          BASE_URL: http://localhost:3000
          # Add test API keys etc.

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright/playwright-report/
```

## Test Coverage Requirements

| Flow | Tests Required |
|------|----------------|
| Empty gallery | Empty state displays, Add CTA works |
| View gallery | Sets display, images load |
| Search | Filters by title, by setNumber |
| Filter | By theme, by build status |
| Sort | All sort options work |
| Pagination | Next/prev pages work |
| Add set | Required fields, optional fields, cancel |
| View detail | All sections display |
| Edit set | Pre-fill, save, cancel |
| Delete set | Confirmation, actually deletes |
| Build status | Toggle, undo, optimistic update |
| Quantity | Increment, decrement, min=1 |
| Images | Upload, preview, delete |
| Keyboard | Navigation, shortcuts |
| Mobile | Responsive layout |

## Definition of Done

- [ ] All tests in the table above are implemented
- [ ] Tests pass locally
- [ ] Tests pass in CI
- [ ] No flaky tests (run 3x to verify)
- [ ] Test report generated and archived
- [ ] Epic can be marked complete

## Dependencies

- All previous stories (sets-1000 through sets-1020)
- Playwright configured in project

## References

- PRD: docs/prd/epic-7-sets-gallery.md (Definition of Done)
