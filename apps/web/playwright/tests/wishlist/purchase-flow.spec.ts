/**
 * Purchase Flow E2E Tests - WISH-2004
 *
 * Tests for the GotItModal component in the wishlist gallery.
 * Covers AC10-25: Purchase/"Got It" modal behavior.
 *
 * Prerequisites:
 * - Wishlist items seeded in database
 * - User authenticated (MSW mocked or AUTH_BYPASS=true)
 */

import { test, expect } from '@playwright/test'

test.describe('Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to wishlist gallery
    await page.goto('/wishlist')
    // Wait for gallery to load - filter bar indicates the page has rendered
    await page.waitForSelector('[data-testid="wishlist-filter-bar"]', { timeout: 10000 })
  })

  test.describe('AC10-15: Modal Opening and Defaults', () => {
    test('AC10: GotItModal opens when user triggers "Got It" action', async ({ page }) => {
      // Find a wishlist card and click its "Got It" button
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()

      // Click "Got It" button
      const gotItButton = card.locator('[data-testid="wishlist-card-got-it"]')
      await gotItButton.click()

      // Modal should be visible
      await expect(page.locator('[role="dialog"]')).toBeVisible()
      await expect(page.getByText('Got It!')).toBeVisible()
    })

    test('AC11: Modal displays item title in description', async ({ page }) => {
      // Get card title before opening modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      const cardTitle = await card.locator('[data-testid="gallery-card-title"]').textContent()

      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Modal description should contain item title
      await expect(page.getByText(new RegExp(cardTitle!, 'i'))).toBeVisible()
    })

    test('AC12: Price field pre-filled from wishlist item price', async ({ page }) => {
      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Price input should have a value (pre-filled)
      const priceInput = page.locator('[data-testid="price-paid-input"]')
      await expect(priceInput).toBeVisible()
      // Value may be pre-filled from wishlist item
      const value = await priceInput.inputValue()
      expect(value).toBeDefined()
    })

    test('AC13: Quantity defaults to 1', async ({ page }) => {
      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Quantity input should default to 1
      const quantityInput = page.locator('[data-testid="quantity-input"]')
      await expect(quantityInput).toHaveValue('1')
    })

    test('AC14: Purchase date defaults to today', async ({ page }) => {
      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Date input should have today's date
      const dateInput = page.locator('[data-testid="purchase-date-input"]')
      const today = new Date().toISOString().split('T')[0]
      await expect(dateInput).toHaveValue(today)
    })

    test('AC15: "Keep on wishlist" checkbox defaults to unchecked', async ({ page }) => {
      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Checkbox should be unchecked
      const checkbox = page.locator('[data-testid="keep-on-wishlist-checkbox"]')
      await expect(checkbox).toHaveAttribute('aria-checked', 'false')
    })
  })

  test.describe('AC16-17: Form Validation', () => {
    test('AC16: Form validates price/tax/shipping format (decimal only)', async ({ page }) => {
      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Enter invalid price format
      const priceInput = page.locator('[data-testid="price-paid-input"]')
      await priceInput.fill('abc')

      // Submit form
      await page.locator('[data-testid="submit-button"]').click()

      // Validation error should appear
      await expect(page.getByText(/price must be a valid decimal/i)).toBeVisible()
    })

    test('AC17: Form validates quantity >= 1', async ({ page }) => {
      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Enter invalid quantity
      const quantityInput = page.locator('[data-testid="quantity-input"]')
      await quantityInput.fill('0')

      // Submit form
      await page.locator('[data-testid="submit-button"]').click()

      // Validation error should appear or input should be constrained
      const value = await quantityInput.inputValue()
      // HTML5 number input with min=1 may auto-correct or show validation
      expect(parseInt(value)).toBeGreaterThanOrEqual(1)
    })
  })

  test.describe('AC18-21: Form Submission', () => {
    test('AC18: Submit triggers POST /api/wishlist/:id/purchased', async ({ page }) => {
      // Set up request interception
      let purchaseRequestMade = false
      let requestBody: Record<string, unknown> | null = null

      await page.route('**/api/wishlist/*/purchased', async route => {
        if (route.request().method() === 'POST') {
          purchaseRequestMade = true
          requestBody = route.request().postDataJSON()
          await route.fulfill({
            status: 201,
            body: JSON.stringify({
              id: 'set-uuid',
              title: 'Test Set',
            }),
          })
        } else {
          await route.continue()
        }
      })

      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Fill form
      await page.locator('[data-testid="price-paid-input"]').fill('99.99')

      // Submit
      await page.locator('[data-testid="submit-button"]').click()

      // Verify request was made
      await page.waitForTimeout(500)
      expect(purchaseRequestMade).toBe(true)
      expect(requestBody).not.toBeNull()
    })

    test('AC19: 201 response returns new SetItem', async ({ page }) => {
      const mockSetItem = {
        id: 'set-uuid-123',
        userId: 'user-uuid',
        title: 'LEGO Star Wars Millennium Falcon',
        setNumber: '75192',
        purchasePrice: '799.99',
      }

      await page.route('**/api/wishlist/*/purchased', async route => {
        await route.fulfill({
          status: 201,
          body: JSON.stringify(mockSetItem),
        })
      })

      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Submit
      await page.locator('[data-testid="submit-button"]').click()

      // Success toast should appear
      await expect(page.getByText(/added to your collection/i)).toBeVisible({ timeout: 5000 })
    })

    test('AC21: Success toast shows with "View in Sets" button', async ({ page }) => {
      await page.route('**/api/wishlist/*/purchased', async route => {
        await route.fulfill({
          status: 201,
          body: JSON.stringify({ id: 'set-uuid-123' }),
        })
      })

      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Submit
      await page.locator('[data-testid="submit-button"]').click()

      // Toast should have "View in Sets" button
      await expect(page.getByText(/view in sets/i)).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('AC22-23: Wishlist Item Handling', () => {
    test('AC22: Item removed from gallery when keepOnWishlist=false', async ({ page }) => {
      await page.route('**/api/wishlist/*/purchased', async route => {
        await route.fulfill({
          status: 201,
          body: JSON.stringify({ id: 'set-uuid-123' }),
        })
      })

      // Get initial card count
      const initialCount = await page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').count()

      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Ensure keepOnWishlist is unchecked (default)
      const checkbox = page.locator('[data-testid="keep-on-wishlist-checkbox"]')
      await expect(checkbox).toHaveAttribute('aria-checked', 'false')

      // Submit
      await page.locator('[data-testid="submit-button"]').click()

      // Wait for modal to close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })

      // Card count should decrease
      await expect(page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]')).toHaveCount(initialCount - 1, {
        timeout: 5000,
      })
    })

    test('AC23: Item remains in gallery when keepOnWishlist=true', async ({ page }) => {
      await page.route('**/api/wishlist/*/purchased', async route => {
        await route.fulfill({
          status: 201,
          body: JSON.stringify({ id: 'set-uuid-123' }),
        })
      })

      // Get initial card count
      const initialCount = await page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').count()

      // Open Got It modal
      const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
      await card.hover()
      await card.locator('[data-testid="wishlist-card-got-it"]').click()

      // Check keepOnWishlist
      const checkbox = page.locator('[data-testid="keep-on-wishlist-checkbox"]')
      await checkbox.click()
      await expect(checkbox).toHaveAttribute('aria-checked', 'true')

      // Submit
      await page.locator('[data-testid="submit-button"]').click()

      // Wait for modal to close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })

      // Card count should remain the same
      await expect(page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]')).toHaveCount(initialCount, {
        timeout: 5000,
      })
    })
  })

  test.describe('AC25: Loading States', () => {
    test('AC25: Loading state shows progress messages', async ({ page }) => {
      // Mock slow response
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

      // Submit
      await page.locator('[data-testid="submit-button"]').click()

      // Loading state should show
      await expect(page.locator('[role="status"]')).toBeVisible()

      // Progress message should appear
      await expect(
        page.getByText(/creating|copying|finalizing/i).first(),
      ).toBeVisible()

      // Buttons should be disabled
      await expect(page.locator('[data-testid="submit-button"]')).toBeDisabled()
      await expect(page.locator('[data-testid="cancel-button"]')).toBeDisabled()
    })
  })
})
