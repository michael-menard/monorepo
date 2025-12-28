# Story insp-2021: E2E Test Suite

## Status

Draft

## Consolidates

- insp-1050.e2e-test-suite

## Story

**As a** developer,
**I want** comprehensive E2E tests for the Inspiration Gallery,
**so that** I can ensure all features work correctly in production.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - Definition of Done

## Dependencies

All previous Inspiration Gallery stories should be complete before running full E2E suite.

## Acceptance Criteria

### Test Coverage

1. Gallery page loads and displays items
2. Upload flow: single and multiple images
3. Edit flow: update metadata and tags
4. Delete flow: with confirmation
5. Album CRUD: create, view, edit, delete
6. Album membership: add/remove items
7. Nested albums: navigation and breadcrumbs
8. Multi-select and bulk operations
9. Drag-and-drop reorder
10. Stack-to-create-album gesture
11. MOC linking
12. Search and filtering
13. Empty states
14. Error handling and recovery

### Test Quality

15. Tests run in CI/CD pipeline
16. Tests use realistic test data
17. Tests clean up after themselves
18. Tests handle async operations properly
19. Tests are maintainable and documented

### Mobile Tests

20. Gallery displays correctly on mobile
21. Touch interactions work
22. Upload works on mobile

## Tasks / Subtasks

### Task 1: Set Up Test Infrastructure

- [ ] Configure Playwright for inspiration tests
- [ ] Create test fixtures (users, images)
- [ ] Set up test database seeding
- [ ] Configure test file upload mocking

### Task 2: Write Core Gallery Tests (AC: 1, 12, 13)

- [ ] Gallery page loads
- [ ] Items display correctly
- [ ] Search filters items
- [ ] Tag filtering works
- [ ] Sorting works
- [ ] Empty state displays

### Task 3: Write Upload Tests (AC: 2)

- [ ] Single image upload
- [ ] Multiple image upload
- [ ] Create as album flow
- [ ] Upload progress and errors
- [ ] Validation (file type, size)

### Task 4: Write CRUD Tests (AC: 3, 4)

- [ ] Edit inspiration metadata
- [ ] Edit tags
- [ ] Delete with confirmation
- [ ] Multi-album delete warning

### Task 5: Write Album Tests (AC: 5, 6, 7)

- [ ] Create album
- [ ] View album contents
- [ ] Edit album
- [ ] Delete album (both modes)
- [ ] Add to album
- [ ] Remove from album
- [ ] Nested album navigation
- [ ] Breadcrumbs

### Task 6: Write Interaction Tests (AC: 8, 9, 10)

- [ ] Multi-select mode
- [ ] Bulk delete
- [ ] Bulk add to album
- [ ] Drag-and-drop reorder
- [ ] Stack gesture (optional, may be flaky)

### Task 7: Write Integration Tests (AC: 11, 14)

- [ ] MOC linking flow
- [ ] Error state and retry
- [ ] Offline behavior (optional)

### Task 8: Write Mobile Tests (AC: 20, 21, 22)

- [ ] Gallery on mobile viewport
- [ ] Touch interactions
- [ ] Mobile upload

### Task 9: CI Integration (AC: 15-19)

- [ ] Configure GitHub Actions
- [ ] Set up test parallelization
- [ ] Configure test reports
- [ ] Add to PR checks

## Dev Notes

### Test File Structure

```
apps/web/playwright/
  inspiration/
    gallery.spec.ts          # Gallery display and navigation
    upload.spec.ts           # Upload flows
    edit.spec.ts             # Edit metadata
    delete.spec.ts           # Delete flows
    albums.spec.ts           # Album CRUD
    album-membership.spec.ts # Add/remove from albums
    nested-albums.spec.ts    # Hierarchy and breadcrumbs
    multi-select.spec.ts     # Multi-select and bulk ops
    drag-drop.spec.ts        # Reorder and stack gesture
    moc-linking.spec.ts      # MOC integration
    mobile.spec.ts           # Mobile viewport tests
  fixtures/
    inspiration-fixtures.ts  # Test data factories
```

### Example Test: Gallery Load

```typescript
// apps/web/playwright/inspiration/gallery.spec.ts
import { test, expect } from '@playwright/test'
import { createTestUser, seedInspirations } from '../fixtures/inspiration-fixtures'

test.describe('Inspiration Gallery', () => {
  test.beforeEach(async ({ page }) => {
    // Seed test data
    await seedInspirations(10)
    // Login
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('displays gallery with inspiration cards', async ({ page }) => {
    await page.goto('/inspiration')

    // Wait for gallery to load
    await expect(page.getByRole('heading', { name: 'Inspiration Gallery' })).toBeVisible()

    // Check cards display
    const cards = page.locator('[data-testid="inspiration-card"]')
    await expect(cards).toHaveCount(10)

    // Check first card has image
    const firstCard = cards.first()
    await expect(firstCard.locator('img')).toBeVisible()
  })

  test('shows empty state for new user', async ({ page }) => {
    // Clear inspirations
    await clearInspirations()

    await page.goto('/inspiration')

    await expect(page.getByText('Start your inspiration collection')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Upload your first image' })).toBeVisible()
  })

  test('filters by search query', async ({ page }) => {
    await page.goto('/inspiration')

    // Search for specific term
    await page.fill('[placeholder="Search"]', 'castle')
    await page.keyboard.press('Enter')

    // Wait for filtered results
    await expect(page.locator('[data-testid="inspiration-card"]')).toHaveCount(2) // Assuming 2 match
  })

  test('filters by tag', async ({ page }) => {
    await page.goto('/inspiration')

    // Click tag filter
    await page.click('[data-testid="tag-filter-medieval"]')

    // Verify filter applied
    const activeFilter = page.locator('[data-testid="active-tag-filter"]')
    await expect(activeFilter).toContainText('medieval')

    // Clear filter
    await page.click('[data-testid="clear-filters"]')
    await expect(activeFilter).not.toBeVisible()
  })
})
```

### Example Test: Upload Flow

```typescript
// apps/web/playwright/inspiration/upload.spec.ts
import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Inspiration Upload', () => {
  test('uploads single image successfully', async ({ page }) => {
    await page.goto('/inspiration')

    // Open upload modal
    await page.click('button:has-text("Add")')
    await expect(page.getByRole('dialog')).toBeVisible()

    // Upload file
    const filePath = path.join(__dirname, '../fixtures/test-image.jpg')
    await page.setInputFiles('input[type="file"]', filePath)

    // Verify preview
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible()

    // Fill optional metadata
    await page.fill('[name="title"]', 'Test Inspiration')
    await page.fill('[name="description"]', 'Test description')

    // Submit
    await page.click('button:has-text("Add Inspiration")')

    // Wait for modal to close
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Verify new item in gallery
    await expect(page.locator('[data-testid="inspiration-card"]').first()).toContainText('Test Inspiration')
  })

  test('uploads multiple images and creates album', async ({ page }) => {
    await page.goto('/inspiration')

    // Open upload modal
    await page.click('button:has-text("Add")')

    // Upload multiple files
    await page.setInputFiles('input[type="file"]', [
      path.join(__dirname, '../fixtures/test-image-1.jpg'),
      path.join(__dirname, '../fixtures/test-image-2.jpg'),
      path.join(__dirname, '../fixtures/test-image-3.jpg'),
    ])

    // Verify album prompt appears
    await expect(page.getByText('Create as album?')).toBeVisible()

    // Select create album
    await page.click('button:has-text("Yes, create album")')

    // Fill album name
    await page.fill('[placeholder="Album name"]', 'Test Album')

    // Submit
    await page.click('button:has-text("Create Album")')

    // Verify album created
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.locator('[data-testid="album-card"]').first()).toContainText('Test Album')
  })

  test('shows upload progress', async ({ page }) => {
    await page.goto('/inspiration')
    await page.click('button:has-text("Add")')

    // Upload large file to see progress
    const filePath = path.join(__dirname, '../fixtures/large-test-image.jpg')
    await page.setInputFiles('input[type="file"]', filePath)

    await page.click('button:has-text("Add Inspiration")')

    // Verify progress indicator appears
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()

    // Wait for completion
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 30000 })
  })
})
```

### Example Test: Album Flow

```typescript
// apps/web/playwright/inspiration/albums.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Album Management', () => {
  test('creates album and adds items', async ({ page }) => {
    await page.goto('/inspiration')

    // Create album
    await page.click('[data-testid="create-album-button"]')
    await page.fill('[name="title"]', 'New Album')
    await page.click('button:has-text("Create Album")')

    // Navigate to album
    await page.click('[data-testid="album-card"]:has-text("New Album")')
    await expect(page.url()).toContain('/inspiration/album/')

    // Verify empty state
    await expect(page.getByText('This album is empty')).toBeVisible()

    // Add item to album
    await page.goto('/inspiration')
    await page.click('[data-testid="inspiration-card"]').first()
    await page.click('button:has-text("Add to Album")')
    await page.click('[data-testid="album-option"]:has-text("New Album")')
    await page.click('button:has-text("Save")')

    // Verify item added
    await page.goto('/inspiration/album/...') // Navigate back to album
    await expect(page.locator('[data-testid="inspiration-card"]')).toHaveCount(1)
  })

  test('deletes album with contents option', async ({ page }) => {
    // Setup: create album with items
    // ...

    await page.goto('/inspiration/album/...')
    await page.click('button[aria-label="Delete album"]')

    // Select delete with contents
    await page.click('[data-testid="delete-with-contents"]')
    await page.click('button:has-text("Delete")')

    // Verify redirected to gallery
    await expect(page.url()).toBe('/inspiration')

    // Verify album gone
    await expect(page.locator('[data-testid="album-card"]:has-text("Test Album")')).not.toBeVisible()
  })
})
```

### Mobile Viewport Tests

```typescript
// apps/web/playwright/inspiration/mobile.spec.ts
import { test, expect, devices } from '@playwright/test'

test.use(devices['iPhone 13'])

test.describe('Mobile Inspiration Gallery', () => {
  test('displays gallery on mobile', async ({ page }) => {
    await page.goto('/inspiration')

    // Verify responsive grid (2 columns on mobile)
    const grid = page.locator('[data-testid="gallery-grid"]')
    await expect(grid).toHaveCSS('grid-template-columns', /repeat\(2,/)

    // Cards should be visible
    await expect(page.locator('[data-testid="inspiration-card"]').first()).toBeVisible()
  })

  test('upload works on mobile', async ({ page }) => {
    await page.goto('/inspiration')
    await page.click('button:has-text("Add")')

    // Modal should be full screen on mobile
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Upload flow should work
    // ... (similar to desktop test)
  })
})
```

### Test Fixtures

```typescript
// apps/web/playwright/fixtures/inspiration-fixtures.ts
import { prisma } from '@repo/database'

export async function seedInspirations(count: number) {
  const user = await getTestUser()

  const inspirations = Array.from({ length: count }, (_, i) => ({
    userId: user.id,
    title: `Test Inspiration ${i + 1}`,
    imageUrl: `https://test-bucket.s3.amazonaws.com/test-${i}.jpg`,
    tags: i % 2 === 0 ? ['medieval', 'castle'] : ['modern', 'city'],
    sortOrder: i,
  }))

  await prisma.inspiration.createMany({ data: inspirations })
}

export async function clearInspirations() {
  const user = await getTestUser()
  await prisma.inspiration.deleteMany({ where: { userId: user.id } })
}

export async function getTestUser() {
  return prisma.user.upsert({
    where: { email: 'test@example.com' },
    create: { email: 'test@example.com', name: 'Test User' },
    update: {},
  })
}
```

## Testing

### CI Verification

- [ ] All tests pass locally
- [ ] All tests pass in CI
- [ ] Tests complete in reasonable time (<5 min)
- [ ] Test reports generated

### Coverage Verification

- [ ] Core flows covered
- [ ] Edge cases covered
- [ ] Error states covered
- [ ] Mobile covered

## Definition of Done

- [ ] All test files created
- [ ] Tests pass locally and in CI
- [ ] Test fixtures work correctly
- [ ] Tests clean up properly
- [ ] Coverage meets requirements
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1050                    | Claude   |
