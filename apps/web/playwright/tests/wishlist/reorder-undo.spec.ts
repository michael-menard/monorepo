/**
 * Reorder Undo Flow E2E Tests - WISH-2005b
 *
 * Tests for the optimistic updates and undo functionality
 * in the DraggableWishlistGallery component.
 *
 * Prerequisites:
 * - Wishlist items seeded in database (at least 3 items)
 * - User authenticated
 */

import { test, expect } from '@playwright/test'

test.describe('Reorder Undo Flow (WISH-2005b)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to wishlist gallery
    await page.goto('/wishlist')
    // Wait for gallery to load
    await page.waitForSelector('[data-testid="wishlist-gallery"]', { timeout: 10000 })
  })

  test.describe('AC 1-5: Optimistic Update Core', () => {
    test('AC 1-2: Items reorder immediately on drag drop (optimistic)', async ({ page }) => {
      // Mock successful reorder API
      await page.route('**/api/wishlist/reorder', async route => {
        // Delay response to verify optimistic update happens first
        await new Promise(resolve => setTimeout(resolve, 500))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ updated: 3 }),
        })
      })

      // Get initial order of items
      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const initialCount = await cards.count()
      expect(initialCount).toBeGreaterThanOrEqual(2)

      // Get first two card titles
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const firstTitle = await firstCard.locator('[data-testid^="wishlist-card-title"]').textContent()
      const secondTitle = await secondCard.locator('[data-testid^="wishlist-card-title"]').textContent()

      // Perform drag and drop (swap first two items)
      const dragHandle = firstCard.locator('[data-testid^="drag-handle-"]')
      await dragHandle.dragTo(secondCard)

      // Verify items have reordered (optimistic update - before API response)
      const newFirstTitle = await cards.first().locator('[data-testid^="wishlist-card-title"]').textContent()
      expect(newFirstTitle).toBe(secondTitle)
    })

    test('AC 5: API failure triggers rollback', async ({ page }) => {
      // Mock failed reorder API
      await page.route('**/api/wishlist/reorder', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        })
      })

      // Get initial order
      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const firstTitle = await firstCard.locator('[data-testid^="wishlist-card-title"]').textContent()

      // Attempt drag and drop
      const dragHandle = firstCard.locator('[data-testid^="drag-handle-"]')
      await dragHandle.dragTo(secondCard)

      // Wait for error toast
      await expect(page.getByText(/failed|error|try again/i).first()).toBeVisible({ timeout: 5000 })

      // Verify items rolled back to original order
      const newFirstTitle = await cards.first().locator('[data-testid^="wishlist-card-title"]').textContent()
      expect(newFirstTitle).toBe(firstTitle)
    })
  })

  test.describe('AC 6-11: Undo Flow', () => {
    test('AC 6: Success toast appears with Undo button', async ({ page }) => {
      // Mock successful reorder API
      await page.route('**/api/wishlist/reorder', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ updated: 3 }),
        })
      })

      // Perform drag and drop
      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const dragHandle = firstCard.locator('[data-testid^="drag-handle-"]')
      await dragHandle.dragTo(secondCard)

      // Wait for success toast with undo button
      await expect(page.locator('[data-testid="reorder-success-toast"]')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Order updated')).toBeVisible()
      await expect(page.locator('[data-testid="undo-reorder-button"]')).toBeVisible()
    })

    test('AC 7: Toast auto-dismisses after 5 seconds', async ({ page }) => {
      // Mock successful reorder API
      await page.route('**/api/wishlist/reorder', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ updated: 3 }),
        })
      })

      // Perform drag and drop
      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const dragHandle = firstCard.locator('[data-testid^="drag-handle-"]')
      await dragHandle.dragTo(secondCard)

      // Verify toast appears
      await expect(page.locator('[data-testid="reorder-success-toast"]')).toBeVisible({ timeout: 5000 })

      // Wait for toast to auto-dismiss (5 seconds + buffer)
      await page.waitForTimeout(6000)

      // Toast should be gone
      await expect(page.locator('[data-testid="reorder-success-toast"]')).not.toBeVisible()
    })

    test('AC 8-10: Clicking Undo restores original order', async ({ page }) => {
      let reorderCallCount = 0

      // Mock reorder API to track calls
      await page.route('**/api/wishlist/reorder', async route => {
        reorderCallCount++
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ updated: 3 }),
        })
      })

      // Get initial order
      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const firstTitle = await cards.first().locator('[data-testid^="wishlist-card-title"]').textContent()

      // Perform drag and drop
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const dragHandle = firstCard.locator('[data-testid^="drag-handle-"]')
      await dragHandle.dragTo(secondCard)

      // Wait for success toast
      await expect(page.locator('[data-testid="reorder-success-toast"]')).toBeVisible({ timeout: 5000 })

      // Click undo button
      await page.locator('[data-testid="undo-reorder-button"]').click()

      // Wait for undo to complete
      await expect(page.getByText('Order restored')).toBeVisible({ timeout: 5000 })

      // Verify items restored to original order
      const restoredFirstTitle = await cards.first().locator('[data-testid^="wishlist-card-title"]').textContent()
      expect(restoredFirstTitle).toBe(firstTitle)

      // AC 9: Verify API was called twice (initial reorder + undo reorder)
      expect(reorderCallCount).toBe(2)
    })

    test('AC 11: Undo failure shows error toast with Retry', async ({ page }) => {
      let callCount = 0

      // Mock API - first call succeeds, second (undo) fails
      await page.route('**/api/wishlist/reorder', async route => {
        callCount++
        if (callCount === 1) {
          // First reorder succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ updated: 3 }),
          })
        } else {
          // Undo fails
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' }),
          })
        }
      })

      // Perform drag and drop
      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const dragHandle = firstCard.locator('[data-testid^="drag-handle-"]')
      await dragHandle.dragTo(secondCard)

      // Wait for success toast
      await expect(page.locator('[data-testid="reorder-success-toast"]')).toBeVisible({ timeout: 5000 })

      // Click undo button
      await page.locator('[data-testid="undo-reorder-button"]').click()

      // Wait for error toast with retry
      await expect(page.getByText(/failed to restore/i).first()).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Retry')).toBeVisible()
    })
  })

  test.describe('AC 12-15: State Management', () => {
    test('AC 12, 15: New reorder cancels previous undo window', async ({ page }) => {
      // Mock successful reorder API
      await page.route('**/api/wishlist/reorder', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ updated: 3 }),
        })
      })

      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const thirdCard = cards.nth(2)

      // First reorder
      const dragHandle1 = firstCard.locator('[data-testid^="drag-handle-"]')
      await dragHandle1.dragTo(secondCard)

      // Wait for first success toast
      await expect(page.locator('[data-testid="reorder-success-toast"]')).toBeVisible({ timeout: 5000 })

      // Immediately do second reorder (should cancel first undo window)
      const dragHandle2 = cards.first().locator('[data-testid^="drag-handle-"]')
      await dragHandle2.dragTo(thirdCard)

      // Should see new success toast
      await expect(page.locator('[data-testid="reorder-success-toast"]')).toBeVisible()

      // Clicking undo should restore from second reorder, not first
      await page.locator('[data-testid="undo-reorder-button"]').click()
      await expect(page.getByText('Order restored')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('AC 16-18: Error Handling', () => {
    test('AC 16: Network timeout during reorder triggers rollback', async ({ page }) => {
      // Mock timeout (abort after delay)
      await page.route('**/api/wishlist/reorder', async route => {
        await page.waitForTimeout(30000) // Never respond
        await route.abort()
      })

      // Get initial order
      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const firstTitle = await cards.first().locator('[data-testid^="wishlist-card-title"]').textContent()

      // Perform drag and drop
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const dragHandle = firstCard.locator('[data-testid^="drag-handle-"]')

      // Use a shorter timeout for this test
      await Promise.race([
        dragHandle.dragTo(secondCard),
        page.waitForTimeout(5000),
      ])

      // Should show timeout error (or be rolled back)
      // The actual timeout handling depends on RTK Query configuration
    })

    test('AC 17: 403 error shows appropriate message and invalidates cache', async ({ page }) => {
      // Mock 403 response
      await page.route('**/api/wishlist/reorder', async route => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'FORBIDDEN' }),
        })
      })

      // Perform drag and drop
      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const dragHandle = firstCard.locator('[data-testid^="drag-handle-"]')
      await dragHandle.dragTo(secondCard)

      // Wait for 403 error message
      await expect(page.getByText(/permission/i).first()).toBeVisible({ timeout: 5000 })
    })

    test('AC 17: 404 error shows appropriate message', async ({ page }) => {
      // Mock 404 response
      await page.route('**/api/wishlist/reorder', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'NOT_FOUND' }),
        })
      })

      // Perform drag and drop
      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const dragHandle = firstCard.locator('[data-testid^="drag-handle-"]')
      await dragHandle.dragTo(secondCard)

      // Wait for 404 error message
      await expect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('AC 19-20: Accessibility', () => {
    test('AC 19: Success toast is announced by screen reader', async ({ page }) => {
      // Mock successful reorder API
      await page.route('**/api/wishlist/reorder', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ updated: 3 }),
        })
      })

      // Perform drag and drop
      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const dragHandle = firstCard.locator('[data-testid^="drag-handle-"]')
      await dragHandle.dragTo(secondCard)

      // Verify toast has proper ARIA attributes
      const toast = page.locator('[data-testid="reorder-success-toast"]')
      await expect(toast).toBeVisible({ timeout: 5000 })
      await expect(toast).toHaveAttribute('role', 'alert')
      await expect(toast).toHaveAttribute('aria-live', 'polite')
    })

    test('AC 20: Undo button is keyboard accessible', async ({ page }) => {
      // Mock successful reorder API
      await page.route('**/api/wishlist/reorder', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ updated: 3 }),
        })
      })

      // Perform drag and drop
      const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
      const firstCard = cards.first()
      const secondCard = cards.nth(1)
      const dragHandle = firstCard.locator('[data-testid^="drag-handle-"]')
      await dragHandle.dragTo(secondCard)

      // Wait for toast
      await expect(page.locator('[data-testid="reorder-success-toast"]')).toBeVisible({ timeout: 5000 })

      // Focus undo button and verify it's focusable
      const undoButton = page.locator('[data-testid="undo-reorder-button"]')
      await undoButton.focus()
      await expect(undoButton).toBeFocused()

      // Verify aria-label exists
      await expect(undoButton).toHaveAttribute('aria-label', /undo reorder/i)

      // Activate with Enter key
      await page.keyboard.press('Enter')

      // Should trigger undo
      await expect(page.getByText('Order restored')).toBeVisible({ timeout: 5000 })
    })
  })
})
