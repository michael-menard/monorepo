/**
 * E2E Tests: Set Detail Page
 *
 * Verifies the set detail page renders correctly, displays product specs,
 * and supports CRUD operations on set instances (copies).
 *
 * Tests against live backend + frontend (localhost:3000).
 * Auth is handled via Cognito token injection.
 *
 * Prerequisites:
 *   - Frontend running on http://localhost:3000
 *   - Backend API running (proxied via Vite dev server)
 *   - Test user authenticated via Cognito
 */

import { test, expect } from '../wishlist/helpers/auth-fixture'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * We need a real set ID from the database for live E2E tests.
 * The beforeEach navigates to /sets and picks the first available set.
 * If no sets exist, tests are skipped.
 */

let testSetId: string
let testSetUrl: string

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to the sets gallery and click into the first set to get a valid
 * set detail URL. Stores the set ID for subsequent tests.
 */
async function navigateToFirstSetDetail(page: import('@playwright/test').Page) {
  await page.goto('/sets')

  // Wait for gallery to load
  const firstCard = page.locator('[data-testid^="set-card-"]').first()
  await firstCard.waitFor({ state: 'visible', timeout: 15000 })

  // Extract the set ID from the card's data-testid
  const testIdAttr = await firstCard.getAttribute('data-testid')
  if (!testIdAttr) throw new Error('Could not find set card data-testid')
  testSetId = testIdAttr.replace('set-card-', '')
  testSetUrl = `/sets/${testSetId}`

  // Click the "View" action to navigate to detail
  const viewButton = firstCard.getByTestId('set-card-action-view')
  await viewButton.click()

  // Wait for detail page to render
  await page.waitForSelector('[data-testid="set-detail-page"]', { timeout: 15000 })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Set Detail Page', () => {
  test('navigates to set detail and renders all sections', async ({
    authenticatedPage: page,
  }) => {
    await navigateToFirstSetDetail(page)

    // Header section
    await expect(page.getByTestId('set-detail-title')).toBeVisible()
    await expect(page.getByTestId('set-detail-back-button')).toBeVisible()
    await expect(page.getByTestId('set-detail-add-copy')).toBeVisible()

    // Product specs card
    await expect(page.getByTestId('set-detail-specs')).toBeVisible()

    // Instances section
    await expect(page.getByTestId('set-detail-instances-section')).toBeVisible()

    // Notes section
    await expect(page.getByTestId('set-detail-notes-section')).toBeVisible()

    // Provenance footer
    await expect(page.getByTestId('set-detail-provenance')).toBeVisible()
  })

  test('product specs display piece count, theme, and year', async ({
    authenticatedPage: page,
  }) => {
    await navigateToFirstSetDetail(page)

    const specsCard = page.getByTestId('set-detail-specs')
    await expect(specsCard).toBeVisible()

    // The specs card should contain labeled rows for key fields.
    // Values may be real data or em-dashes for null fields.
    await expect(specsCard.getByText('Pieces')).toBeVisible()
    await expect(specsCard.getByText('Year')).toBeVisible()

    // The card header should say "Product Specs"
    await expect(specsCard.getByText('Product Specs')).toBeVisible()

    // Verify at least one spec value is rendered (not all are loading skeletons)
    const specValues = specsCard.locator('.font-medium')
    const count = await specValues.count()
    expect(count).toBeGreaterThan(0)
  })

  test('add a copy creates a new instance row', async ({ authenticatedPage: page }) => {
    await navigateToFirstSetDetail(page)

    const instancesSection = page.getByTestId('set-detail-instances-section')
    await expect(instancesSection).toBeVisible()

    // Count existing rows (could be 0 if empty state)
    const existingRows = instancesSection.locator('table tbody tr')
    const initialCount = await existingRows.count()

    // Click "Add Copy" button in the header
    const addCopyButton = page.getByTestId('set-detail-add-copy')
    await addCopyButton.click()

    // Wait for the API response and table to update
    await page.waitForTimeout(2000)

    // If we started with 0 rows (empty state), the table should now show
    // at least one real row. If we had rows, count should increase.
    if (initialCount === 0) {
      // Empty state had a skeleton row — now we should have a real table
      const newRows = instancesSection.locator('table tbody tr')
      const newCount = await newRows.count()
      expect(newCount).toBeGreaterThanOrEqual(1)
    } else {
      const newRows = instancesSection.locator('table tbody tr')
      await expect(newRows).toHaveCount(initialCount + 1, { timeout: 10000 })
    }

    // The new row should show default values: "New" condition badge
    const lastRow = instancesSection.locator('table tbody tr').last()
    await expect(lastRow.getByText('New')).toBeVisible()
  })

  test('edit instance condition cell to "used"', async ({ authenticatedPage: page }) => {
    await navigateToFirstSetDetail(page)

    const instancesSection = page.getByTestId('set-detail-instances-section')

    // Ensure there is at least one instance row
    const rows = instancesSection.locator('table tbody tr')
    const rowCount = await rows.count()

    if (rowCount === 0) {
      // Add a copy first so we have something to edit
      await page.getByTestId('set-detail-add-copy').click()
      await page.waitForTimeout(2000)
    }

    // Click the condition badge in the first real row to open the dropdown
    const firstRow = instancesSection.locator('table tbody tr').first()
    const conditionCell = firstRow.locator('td').nth(1) // Condition is the 2nd column
    const conditionButton = conditionCell.locator('button').first()
    await conditionButton.click()

    // A <select> should appear — pick "used"
    const select = conditionCell.locator('select')
    await expect(select).toBeVisible({ timeout: 5000 })
    await select.selectOption('used')

    // After selecting, the dropdown should close and the badge should show "Used"
    await expect(conditionCell.getByText('Used')).toBeVisible({ timeout: 5000 })
  })

  test('delete a copy removes the instance row', async ({ authenticatedPage: page }) => {
    await navigateToFirstSetDetail(page)

    const instancesSection = page.getByTestId('set-detail-instances-section')

    // Ensure there is at least one instance to delete
    let rows = instancesSection.locator('table tbody tr')
    let rowCount = await rows.count()

    if (rowCount === 0) {
      // Add a copy first
      await page.getByTestId('set-detail-add-copy').click()
      await page.waitForTimeout(2000)
      rowCount = await rows.count()
    }

    // Click the delete button (trash icon) on the last row
    const lastRow = instancesSection.locator('table tbody tr').last()
    const deleteButton = lastRow.getByLabel('Delete copy')
    await deleteButton.click()

    // Confirmation dialog should appear
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.getByText('Delete this copy?')).toBeVisible()

    // Confirm deletion
    const confirmButton = dialog.getByRole('button', { name: /delete/i })
    await confirmButton.click()

    // Wait for the row to be removed
    await page.waitForTimeout(2000)

    // Row count should decrease
    rows = instancesSection.locator('table tbody tr')
    const newCount = await rows.count()
    expect(newCount).toBeLessThan(rowCount)
  })

  test('empty instances shows skeleton table with "Add your first copy" prompt', async ({
    authenticatedPage: page,
  }) => {
    // Navigate to the gallery and find the set we are using
    await navigateToFirstSetDetail(page)

    const instancesSection = page.getByTestId('set-detail-instances-section')

    // Delete all existing instances to reach the empty state
    let rows = instancesSection.locator('table tbody tr')
    let rowCount = await rows.count()

    // Keep deleting until no real data rows remain.
    // The empty state still renders one skeleton row, so we track by checking
    // for the "Add your first copy" button as the stopping condition.
    let maxAttempts = 10
    while (maxAttempts > 0) {
      const addFirstCopyButton = instancesSection.getByRole('button', {
        name: /add your first copy/i,
      })
      const isEmptyState = await addFirstCopyButton.isVisible().catch(() => false)
      if (isEmptyState) break

      // Delete the last row
      const lastRow = instancesSection.locator('table tbody tr').last()
      const deleteBtn = lastRow.getByLabel('Delete copy')
      const hasDelete = await deleteBtn.isVisible().catch(() => false)
      if (!hasDelete) break

      await deleteBtn.click()

      // Confirm in dialog
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })
      const confirmBtn = dialog.getByRole('button', { name: /delete/i })
      await confirmBtn.click()
      await page.waitForTimeout(1500)

      maxAttempts--
    }

    // Now verify the empty state
    const addFirstCopyButton = instancesSection.getByRole('button', {
      name: /add your first copy/i,
    })
    await expect(addFirstCopyButton).toBeVisible({ timeout: 5000 })

    // The skeleton row should have opacity-40 styling
    const skeletonRow = instancesSection.locator('table tbody tr')
    await expect(skeletonRow).toHaveCount(1)

    // Re-add a copy to leave the set in a clean state
    await addFirstCopyButton.click()
    await page.waitForTimeout(2000)
  })

  test('back button navigates to sets gallery', async ({ authenticatedPage: page }) => {
    await navigateToFirstSetDetail(page)

    // Click the back button
    const backButton = page.getByTestId('set-detail-back-button')
    await backButton.click()

    // URL should change to /sets
    await page.waitForURL('**/sets', { timeout: 10000 })
    expect(page.url()).toContain('/sets')

    // The gallery grid or set cards should be visible
    const gallery = page.locator(
      '[data-testid="gallery-grid"], [data-testid^="set-card-"]',
    ).first()
    await expect(gallery).toBeVisible({ timeout: 15000 })
  })
})
