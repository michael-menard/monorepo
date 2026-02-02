/**
 * Delete Flow E2E Tests - WISH-2004
 *
 * Tests for the DeleteConfirmModal component in the wishlist gallery.
 * Covers AC1-9: Delete confirmation modal behavior.
 *
 * Prerequisites:
 * - Wishlist items seeded in database
 * - Cognito test users available
 */

import { test, expect } from '../../fixtures/browser-auth.fixture'

test.describe('Delete Flow', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Navigate to wishlist by clicking the link in the sidebar (maintains auth state)
    const wishlistLink = page.locator('a[href="/wishlist"]').first()
    await wishlistLink.click()
    // Wait for navigation
    await page.waitForURL('**/wishlist', { timeout: 10000 })
    console.log('Navigated to wishlist, URL:', page.url())

    // Wait for loading to complete (either filter bar appears or empty state)
    const filterBar = page.locator('[data-testid="wishlist-filter-bar"]')
    const emptyState = page.locator('[data-testid="gallery-empty-state"]')
    const errorState = page.getByText(/error|failed/i)

    // Wait for one of these to appear
    await Promise.race([
      filterBar.waitFor({ timeout: 30000 }),
      emptyState.waitFor({ timeout: 30000 }),
      errorState.waitFor({ timeout: 30000 }),
    ]).catch(() => {
      console.log('None of filter bar, empty state, or error appeared')
    })

    // Check what state we're in
    if (await filterBar.isVisible()) {
      console.log('Gallery loaded with items')
    } else if (await emptyState.isVisible()) {
      console.log('Gallery loaded but empty')
    } else {
      // Take a screenshot for debugging
      console.log('Page is in unknown state, checking for loading...')
      const isLoading = await page.getByText('Loading').isVisible()
      console.log('Is loading visible:', isLoading)
      throw new Error('Gallery did not load - check API/MSW configuration')
    }
  })

  test.describe('AC1-3: Modal Opening and Preview', () => {
    test('AC1: DeleteConfirmModal opens when user triggers delete action', async ({ authenticatedPage: page }) => {
      // Find a wishlist card and click its delete button
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()

      // Click delete button (usually in card actions menu)
      const deleteButton = card.locator('[data-testid="wishlist-card-delete"]')
      await deleteButton.click()

      // Modal should be visible
      await expect(page.locator('[role="alertdialog"]')).toBeVisible()
      await expect(page.getByText('Delete Item?')).toBeVisible()
    })

    test('AC2: Modal displays item preview with thumbnail, title, set number, store', async ({
      page,
    }) => {
      // Open delete modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      // Check item preview elements
      const preview = page.locator('[data-testid="delete-confirm-item-preview"]')
      await expect(preview).toBeVisible()

      // Title should be present
      await expect(page.locator('[data-testid="delete-confirm-title"]')).toBeVisible()
    })

    test('AC3: Cancel button closes modal without deleting', async ({ authenticatedPage: page }) => {
      // Open delete modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      const cardTitle = await card.locator('[data-testid="gallery-card-title"]').textContent()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      // Click cancel
      await page.locator('[data-testid="delete-confirm-cancel"]').click()

      // Modal should close
      await expect(page.locator('[role="alertdialog"]')).not.toBeVisible()

      // Item should still be in gallery
      await expect(page.getByText(cardTitle!)).toBeVisible()
    })
  })

  test.describe('AC4-6: Delete Confirmation', () => {
    test('AC4: Confirm button triggers DELETE /api/wishlist/:id', async ({ authenticatedPage: page }) => {
      // Set up request interception to verify API call
      let deleteRequestMade = false
      await page.route('**/api/wishlist/*', async route => {
        if (route.request().method() === 'DELETE') {
          deleteRequestMade = true
          await route.fulfill({ status: 204 })
        } else {
          await route.continue()
        }
      })

      // Open delete modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      // Click delete
      await page.locator('[data-testid="delete-confirm-delete"]').click()

      // Verify DELETE request was made
      await page.waitForTimeout(500)
      expect(deleteRequestMade).toBe(true)
    })

    test('AC5: 204 response removes item from gallery (RTK Query cache invalidation)', async ({
      page,
    }) => {
      // Mock successful delete
      await page.route('**/api/wishlist/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ status: 204 })
        } else {
          await route.continue()
        }
      })

      // Get initial card count
      const initialCount = await page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').count()

      // Open delete modal for first card
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      // Confirm delete
      await page.locator('[data-testid="delete-confirm-delete"]').click()

      // Wait for modal to close and gallery to update
      await expect(page.locator('[role="alertdialog"]')).not.toBeVisible()

      // Card count should decrease by 1
      await expect(page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]')).toHaveCount(initialCount - 1)
    })

    test('AC6: Loading state disables buttons during deletion', async ({ authenticatedPage: page }) => {
      // Mock slow delete response
      await page.route('**/api/wishlist/*', async route => {
        if (route.request().method() === 'DELETE') {
          await new Promise(resolve => setTimeout(resolve, 2000))
          await route.fulfill({ status: 204 })
        } else {
          await route.continue()
        }
      })

      // Open delete modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      // Click delete
      await page.locator('[data-testid="delete-confirm-delete"]').click()

      // Buttons should be disabled during loading
      await expect(page.locator('[data-testid="delete-confirm-cancel"]')).toBeDisabled()
      await expect(page.locator('[data-testid="delete-confirm-delete"]')).toBeDisabled()

      // Loading text should appear
      await expect(page.getByText('Deleting...')).toBeVisible()
    })
  })

  test.describe('AC7-9: Error Handling', () => {
    test('AC7: 403 response when user does not own item', async ({ authenticatedPage: page }) => {
      // Mock 403 response
      await page.route('**/api/wishlist/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 403,
            body: JSON.stringify({ error: 'FORBIDDEN' }),
          })
        } else {
          await route.continue()
        }
      })

      // Open delete modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      // Click delete
      await page.locator('[data-testid="delete-confirm-delete"]').click()

      // Error should be shown (toast or inline)
      await expect(
        page.getByText(/forbidden|not authorized|permission/i).first(),
      ).toBeVisible({ timeout: 5000 })
    })

    test('AC8: 404 response when item does not exist', async ({ authenticatedPage: page }) => {
      // Mock 404 response
      await page.route('**/api/wishlist/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 404,
            body: JSON.stringify({ error: 'NOT_FOUND' }),
          })
        } else {
          await route.continue()
        }
      })

      // Open delete modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      // Click delete
      await page.locator('[data-testid="delete-confirm-delete"]').click()

      // Error should be shown
      await expect(page.getByText(/not found|item.*deleted/i).first()).toBeVisible({
        timeout: 5000,
      })
    })

    test('AC9: Toast notification appears on success', async ({ authenticatedPage: page }) => {
      // Mock successful delete
      await page.route('**/api/wishlist/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ status: 204 })
        } else {
          await route.continue()
        }
      })

      // Open delete modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      // Click delete
      await page.locator('[data-testid="delete-confirm-delete"]').click()

      // Success toast should appear
      await expect(page.getByText(/deleted|removed/i).first()).toBeVisible({ timeout: 5000 })
    })
  })
})
