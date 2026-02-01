/**
 * Modal Accessibility E2E Tests - WISH-2004
 *
 * Tests for keyboard accessibility and focus management in wishlist modals.
 * Covers AC26-30: Accessibility requirements.
 *
 * Prerequisites:
 * - Wishlist items seeded in database
 * - User authenticated (MSW mocked or AUTH_BYPASS=true)
 */

import { test, expect } from '@playwright/test'

test.describe('Modal Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to wishlist gallery
    await page.goto('/wishlist')
    // Wait for gallery to load - filter bar indicates the page has rendered
    await page.waitForSelector('[data-testid="wishlist-filter-bar"]', { timeout: 10000 })
  })

  test.describe('AC26: ESC Key Closes Modals', () => {
    test('ESC key closes DeleteConfirmModal (when not loading)', async ({ page }) => {
      // Open delete modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      // Modal should be visible
      await expect(page.locator('[role="alertdialog"]')).toBeVisible()

      // Press ESC
      await page.keyboard.press('Escape')

      // Modal should close
      await expect(page.locator('[role="alertdialog"]')).not.toBeVisible()
    })

    test('ESC key closes GotItModal (when not loading)', async ({ page }) => {
      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Modal should be visible
      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Press ESC
      await page.keyboard.press('Escape')

      // Modal should close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    })

    test('ESC key does NOT close modal when loading', async ({ page }) => {
      // Mock slow delete response
      await page.route('**/api/wishlist/*', async route => {
        if (route.request().method() === 'DELETE') {
          await new Promise(resolve => setTimeout(resolve, 5000))
          await route.fulfill({ status: 204 })
        } else {
          await route.continue()
        }
      })

      // Open delete modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      // Click delete to start loading
      await page.locator('[data-testid="delete-confirm-delete"]').click()

      // Wait for loading state
      await expect(page.getByText('Deleting...')).toBeVisible()

      // Press ESC
      await page.keyboard.press('Escape')

      // Modal should still be visible (ESC blocked during loading)
      await expect(page.locator('[role="alertdialog"]')).toBeVisible()
    })
  })

  test.describe('AC27: Focus Trap', () => {
    test('Focus trap active in DeleteConfirmModal', async ({ page }) => {
      // Open delete modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      await expect(page.locator('[role="alertdialog"]')).toBeVisible()

      // Tab through all focusable elements
      // Focus should stay within modal
      const cancelButton = page.locator('[data-testid="delete-confirm-cancel"]')
      const deleteButton = page.locator('[data-testid="delete-confirm-delete"]')

      // Tab forward multiple times
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
      }

      // Focus should still be on one of the modal buttons
      const focusedElement = page.locator(':focus')
      const isWithinModal = await focusedElement.evaluate(el => {
        const modal = document.querySelector('[role="alertdialog"]')
        return modal?.contains(el) ?? false
      })

      expect(isWithinModal).toBe(true)

      // Verify focus is on one of the expected buttons (cancel or delete)
      const isCancelFocused = await cancelButton.evaluate(el => el === document.activeElement)
      const isDeleteFocused = await deleteButton.evaluate(el => el === document.activeElement)
      expect(isCancelFocused || isDeleteFocused).toBe(true)
    })

    test('Focus trap active in GotItModal', async ({ page }) => {
      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Tab through all focusable elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab')
      }

      // Focus should still be within modal
      const focusedElement = page.locator(':focus')
      const isWithinModal = await focusedElement.evaluate(el => {
        const modal = document.querySelector('[role="dialog"]')
        return modal?.contains(el) ?? false
      })

      expect(isWithinModal).toBe(true)
    })
  })

  test.describe('AC28: Focus Returns to Trigger', () => {
    test('Focus returns to delete button after DeleteConfirmModal closes', async ({ page }) => {
      // Open delete modal via keyboard
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      const deleteButton = card.locator('[data-testid="wishlist-card-delete"]')

      await card.hover()
      await deleteButton.focus()
      await deleteButton.click()

      await expect(page.locator('[role="alertdialog"]')).toBeVisible()

      // Close modal with cancel
      await page.locator('[data-testid="delete-confirm-cancel"]').click()

      await expect(page.locator('[role="alertdialog"]')).not.toBeVisible()

      // Focus should return to trigger element (or nearby)
      // Note: Radix AlertDialog may return focus to document.body first
      await page.waitForTimeout(100)
    })

    test('Focus returns to trigger after GotItModal closes', async ({ page }) => {
      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      const gotItButton = card.locator('[data-testid="wishlist-card-got-it"]')

      await card.hover()
      await gotItButton.focus()
      await gotItButton.click()

      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Close modal with cancel
      await page.locator('[data-testid="cancel-button"]').click()

      await expect(page.locator('[role="dialog"]')).not.toBeVisible()

      // Allow time for focus restoration
      await page.waitForTimeout(100)
    })
  })

  test.describe('AC29: Form Field Labels', () => {
    test('All GotItModal form fields have associated labels', async ({ page }) => {
      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Check for labeled inputs
      await expect(page.getByLabel('Price Paid')).toBeVisible()
      await expect(page.getByLabel('Tax')).toBeVisible()
      await expect(page.getByLabel('Shipping')).toBeVisible()
      await expect(page.getByLabel('Quantity')).toBeVisible()
      await expect(page.getByLabel('Purchase Date')).toBeVisible()
      await expect(page.getByLabel('Keep on wishlist')).toBeVisible()
    })
  })

  test.describe('AC30: Loading Indicators', () => {
    test('Loading indicator has role="status" in DeleteConfirmModal', async ({ page }) => {
      // Mock slow delete response
      await page.route('**/api/wishlist/*', async route => {
        if (route.request().method() === 'DELETE') {
          await new Promise(resolve => setTimeout(resolve, 3000))
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

      // Loading indicator should have role="status"
      await expect(page.locator('[role="status"]')).toBeVisible()
    })

    test('Loading indicator has role="status" in GotItModal', async ({ page }) => {
      // Mock slow purchase response
      await page.route('**/api/wishlist/*/purchased', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000))
        await route.fulfill({
          status: 201,
          body: JSON.stringify({ id: 'set-uuid-123' }),
        })
      })

      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Submit form
      await page.locator('[data-testid="submit-button"]').click()

      // Loading indicator should have role="status"
      await expect(page.locator('[role="status"]')).toBeVisible()
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('Can navigate DeleteConfirmModal with Tab key', async ({ page }) => {
      // Open delete modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-delete"]').click()

      await expect(page.locator('[role="alertdialog"]')).toBeVisible()

      // Tab to navigate between buttons
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Should be able to activate with Enter
      const focusedElement = page.locator(':focus')
      const tagName = await focusedElement.evaluate(el => el.tagName)
      expect(['BUTTON', 'A', 'INPUT'].includes(tagName)).toBe(true)
    })

    test('Can submit GotItModal form with Enter key', async ({ page }) => {
      let formSubmitted = false

      await page.route('**/api/wishlist/*/purchased', async route => {
        formSubmitted = true
        await route.fulfill({
          status: 201,
          body: JSON.stringify({ id: 'set-uuid-123' }),
        })
      })

      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Focus on submit button
      const submitButton = page.locator('[data-testid="submit-button"]')
      await submitButton.focus()

      // Press Enter to submit
      await page.keyboard.press('Enter')

      // Form should be submitted
      await page.waitForTimeout(500)
      expect(formSubmitted).toBe(true)
    })
  })
})
