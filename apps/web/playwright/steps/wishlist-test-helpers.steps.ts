/**
 * Wishlist Test Helper Step Definitions
 * INST-1111: Test utility steps for remembering state and intercepting requests
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// Store state in page context
const testState: Record<string, any> = {}

// ============================================================================
// State Management Steps
// ============================================================================

Given('I remember the first card title', async ({ page }) => {
  const firstCard = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]').first()
  const title = await firstCard.locator('[data-testid="card-title"], h2, h3').first().textContent()
  testState.rememberedTitle = title
})

Then('the remembered card should still be in the gallery', async ({ page }) => {
  const titleText = testState.rememberedTitle
  const card = page.getByText(titleText)
  await expect(card).toBeVisible()
})

Then('the remembered card should not be in the gallery', async ({ page }) => {
  const titleText = testState.rememberedTitle
  const card = page.getByText(titleText)
  await expect(card).not.toBeVisible()
})

// ============================================================================
// API Interception Steps
// ============================================================================

Given('I intercept DELETE requests to wishlist API', async ({ page }) => {
  await page.route('**/api/wishlist/**', route => {
    if (route.request().method() === 'DELETE') {
      testState.deleteRequestMade = true
      route.fulfill({ status: 204 })
    } else {
      route.continue()
    }
  })
})

Then('a DELETE request should have been made', async () => {
  expect(testState.deleteRequestMade).toBeTruthy()
})

Given('I mock DELETE to return {int} Forbidden', async ({ page }, status: number) => {
  await page.route('**/api/wishlist/**', route => {
    if (route.request().method() === 'DELETE') {
      route.fulfill({ status, body: JSON.stringify({ error: 'Forbidden' }) })
    } else {
      route.continue()
    }
  })
})

Given('I mock DELETE to return {int} Not Found', async ({ page }, status: number) => {
  await page.route('**/api/wishlist/**', route => {
    if (route.request().method() === 'DELETE') {
      route.fulfill({ status, body: JSON.stringify({ error: 'Not Found' }) })
    } else {
      route.continue()
    }
  })
})

Given('I mock DELETE to return {int} No Content', async ({ page }, status: number) => {
  await page.route('**/api/wishlist/**', route => {
    if (route.request().method() === 'DELETE') {
      route.fulfill({ status })
    } else {
      route.continue()
    }
  })
})


// ============================================================================
// Order Management Steps
// ============================================================================

