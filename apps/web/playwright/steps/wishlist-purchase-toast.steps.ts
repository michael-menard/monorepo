/**
 * Wishlist Purchase Toast Step Definitions
 * Story: SETS-MVP-0321 (E2E tests for SETS-MVP-0320 Purchase UX Polish)
 *
 * Tests the enhanced success toast with "View in Collection" action button,
 * item removal animation, and toast auto-dismiss behavior.
 *
 * All tests run in live mode (not mocked) per ADR-006.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// Shared state for test scenarios
let rememberedTitle = ''
let initialCardCount = 0

// ---------------------------------------------------------------------------
// Background / Setup (reuse existing shared steps where possible)
// ---------------------------------------------------------------------------

Given('I remember the first card title', async ({ page }) => {
  const card = page
    .locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]')
    .first()
  await card.waitFor({ state: 'visible', timeout: 10000 })

  // Get the title from the card's heading or title element
  const titleEl = card.locator('h3, [data-testid*="title"]').first()
  rememberedTitle = (await titleEl.textContent()) || ''
  expect(rememberedTitle).toBeTruthy()
})

Given('I count the wishlist cards', async ({ page }) => {
  const cards = page.locator(
    '[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]',
  )
  initialCardCount = await cards.count()
  expect(initialCardCount).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------
// Success toast verification (AC3)
// ---------------------------------------------------------------------------

Then(
  'I should see a success toast with {string}',
  async ({ page }, expectedText: string) => {
    const toast = page.getByText(expectedText)
    await expect(toast.first()).toBeVisible({ timeout: 10000 })
  },
)

Then('the success toast should contain the remembered item title', async ({ page }) => {
  expect(rememberedTitle).toBeTruthy()
  const titleInToast = page.getByText(rememberedTitle)
  await expect(titleInToast.first()).toBeVisible({ timeout: 10000 })
})

// ---------------------------------------------------------------------------
// "View in Collection" navigation (AC4)
// ---------------------------------------------------------------------------

When('I click "View in Collection" in the success toast', async ({ page }) => {
  const actionButton = page.getByRole('button', { name: /view in collection/i })
  await expect(actionButton).toBeVisible({ timeout: 10000 })
  await actionButton.click()
})

Then('I should be on the collection page', async ({ page }) => {
  await page.waitForURL(/\/collection/, { timeout: 15000 })
  const url = page.url()
  expect(url).toContain('/collection')
})

// ---------------------------------------------------------------------------
// Item removal (AC5)
// ---------------------------------------------------------------------------

Then('the remembered card should not be in the gallery', async ({ page }) => {
  expect(rememberedTitle).toBeTruthy()

  // Wait for animation to complete
  await page.waitForTimeout(500)

  const cards = page.getByText(rememberedTitle)
  await expect(cards).toHaveCount(0, { timeout: 10000 })
})

Then('the wishlist card count should decrease by 1', async ({ page }) => {
  const cards = page.locator(
    '[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]',
  )
  const currentCount = await cards.count()
  expect(currentCount).toBe(initialCardCount - 1)
})

// ---------------------------------------------------------------------------
// Toast auto-dismiss (AC6)
// ---------------------------------------------------------------------------

When('I wait for the toast to auto-dismiss', async ({ page }) => {
  // Toast duration is 5000ms, wait a bit longer to ensure it dismisses
  await page.waitForTimeout(6000)
})

Then('the success toast should no longer be visible', async ({ page }) => {
  const toast = page.getByText('Added to your collection!')
  await expect(toast).toHaveCount(0, { timeout: 5000 })
})
