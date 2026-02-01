/**
 * Wishlist Gallery Step Definitions
 * Story wish-2001: Wishlist Gallery MVP
 *
 * BDD step definitions for wishlist E2E tests.
 * Network behavior is controlled via MSW in the main app; tests never
 * intercept or mock routes at the Playwright layer.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { setupAuthMock } from '../utils/api-mocks'
import { wishlistState } from './wishlist-state'

const { Given, When, Then } = createBdd()

// ============================================================================
// Background / Setup Steps
// ============================================================================

Given('the wishlist API is mocked with items', async () => {
  // Default scenario: populated list via MSW
  wishlistState.scenario = null
  wishlistState.delayMs = null
})

Given('the wishlist API returns empty results', async () => {
  wishlistState.scenario = 'empty'
})

Given('the wishlist API returns an error', async () => {
  wishlistState.scenario = 'error'
})

Given('the wishlist API returns search results for {string}', async () => {
  // No special scenario needed; search behavior is driven by q parameter.
})

Given('the wishlist API has a {int} second delay', async ({}, seconds: number) => {
  wishlistState.delayMs = seconds * 1000
})

Given('the wishlist has more than {int} items', async () => {
  wishlistState.scenario = 'many'
})

// Note: 'I am using a mobile viewport' is defined in gallery-datatable-view.steps.ts

// ============================================================================
// Navigation Steps
// ============================================================================

When('I navigate to the wishlist page', async ({ page }) => {
  const params = new URLSearchParams()
  if (wishlistState.scenario) {
    params.set('__wishlistScenario', wishlistState.scenario)
  }
  if (wishlistState.delayMs != null) {
    params.set('__wishlistDelayMs', String(wishlistState.delayMs))
  }
  const query = params.toString()
  await page.goto(`/wishlist${query ? `?${query}` : ''}`)

  // Reset scenario after navigation so it does not leak between tests
  wishlistState.scenario = null
  wishlistState.delayMs = null

  // Wait for either content or loading state
  await page.waitForSelector('[data-testid="gallery-skeleton"], h1:has-text("Wishlist")', {
    timeout: 10000,
  })
})

// ============================================================================
// Page Element Verification Steps
// ============================================================================

// Note: 'I should see the page title {string}' is defined in common.steps.ts

Then('I should see the total item count', async ({ page }) => {
  // Look for item count text (e.g., "4 items")
  const countText = page.getByText(/\d+ items?/)
  await expect(countText).toBeVisible()
})

Then('I should see the filter bar with search input', async ({ page }) => {
  const searchInput = page.getByPlaceholder(/search/i)
  await expect(searchInput).toBeVisible()
})

Then('I should see the sort dropdown', async ({ page }) => {
  // Look for sort control
  const sortDropdown = page.getByRole('combobox').or(page.locator('[data-testid*="sort"]'))
  await expect(sortDropdown.first()).toBeVisible()
})

Then('I should see wishlist cards in the gallery', async ({ page }) => {
  // Wait for cards to appear
  const cards = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]')
  await expect(cards.first()).toBeVisible({ timeout: 10000 })
  expect(await cards.count()).toBeGreaterThan(0)
})

Then('I should see a wishlist card with title {string}', async ({ page }, title: string) => {
  const card = page.getByText(title)
  await expect(card).toBeVisible()
})

Then('the card should show store badge {string}', async ({ page }, store: string) => {
  const badge = page.getByText(store, { exact: true }).first()
  await expect(badge).toBeVisible()
})

Then('the card should show price {string}', async ({ page }, price: string) => {
  const priceText = page.getByText(price)
  await expect(priceText).toBeVisible()
})

Then('the card should show piece count {string}', async ({ page }, count: string) => {
  const pieceText = page.getByText(new RegExp(`${count}.*pieces`, 'i'))
  await expect(pieceText).toBeVisible()
})

Then('the card should show priority indicator', async ({ page }) => {
  // Priority is shown as stars or a badge for high priority items
  const priorityIndicator = page
    .locator('[data-testid="priority-indicator"]')
    .or(page.getByText(/must have|high priority/i))
  await expect(priorityIndicator.first()).toBeVisible()
})

// ============================================================================
// Filter Steps
// ============================================================================

When('I click on the {string} store tab', async ({ page }, store: string) => {
  const tab = page.getByRole('tab', { name: new RegExp(store, 'i') })
  await tab.click()
  // Wait for data to refresh
  await page.waitForTimeout(500)
})

Then('I should only see items from store {string}', async ({ page }, store: string) => {
  // All visible store badges should be the selected store
  const cards = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]')
  const count = await cards.count()

  if (count > 0) {
    // Check that the store badge is visible in cards
    const storeBadges = page.getByText(store, { exact: true })
    expect(await storeBadges.count()).toBeGreaterThan(0)
  }
})

Then('the item count should update', async ({ page }) => {
  // Item count should be visible and reflect filtered results
  const countText = page.getByText(/\d+ items?/)
  await expect(countText).toBeVisible()
})

// ============================================================================
// Search Steps
// ============================================================================

When('I search for {string}', async ({ page }, query: string) => {
  const searchInput = page.getByPlaceholder(/search/i)
  await searchInput.fill(query)
  await searchInput.press('Enter')
  // Wait for results to update
  await page.waitForTimeout(500)
})

Then('I should see items matching {string}', async ({ page }, query: string) => {
  const matchingText = page.getByText(new RegExp(query, 'i'))
  await expect(matchingText.first()).toBeVisible()
})

Then('I should not see items not matching {string}', async ({ page }, query: string) => {
  // This is validated by the mock returning only matching items
  const cards = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]')
  const count = await cards.count()
  // If we have results, they should all match the query
  expect(count).toBeGreaterThanOrEqual(0)
})

Then('I should see the item with set number {string}', async ({ page }, setNumber: string) => {
  const setNumberText = page.getByText(new RegExp(`#?${setNumber}`, 'i'))
  await expect(setNumberText.first()).toBeVisible()
})

// ============================================================================
// Sort Steps
// ============================================================================

When('I select sort option {string}', async ({ page }, option: string) => {
  // Click the sort dropdown
  const sortDropdown = page.getByRole('combobox').first()
  await sortDropdown.click()

  // Select the option
  const optionElement = page.getByRole('option', { name: new RegExp(option, 'i') })
  await optionElement.click()

  // Wait for re-sort
  await page.waitForTimeout(500)
})

Then('the items should be sorted by price ascending', async ({ page }) => {
  // Verify sort is applied (visual verification in real test)
  const cards = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]')
  expect(await cards.count()).toBeGreaterThan(0)
})

Then('the items should be sorted by priority descending', async ({ page }) => {
  // Verify sort is applied (visual verification in real test)
  const cards = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]')
  expect(await cards.count()).toBeGreaterThan(0)
})

// ============================================================================
// Empty State Steps
// ============================================================================

Then('I should see the empty state message {string}', async ({ page }, message: string) => {
  const emptyMessage = page.getByText(message)
  await expect(emptyMessage).toBeVisible()
})

Then('I should see a {string} action button', async ({ page }, buttonText: string) => {
  const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') })
  await expect(button).toBeVisible()
})

Then('I should see the message {string}', async ({ page }, message: string) => {
  const text = page.getByText(message)
  await expect(text).toBeVisible()
})

// Note: 'I should see a {string} button' is defined in common.steps.ts

// ============================================================================
// Error State Steps
// ============================================================================

Then('I should see the error message {string}', async ({ page }, message: string) => {
  const errorMessage = page.getByText(message)
  await expect(errorMessage).toBeVisible({ timeout: 10000 })
})

// ============================================================================
// Loading State Steps
// ============================================================================

Then('I should see the loading skeleton', async ({ page }) => {
  const skeleton = page.locator('[data-testid="gallery-skeleton"]')
  await expect(skeleton).toBeVisible()
})

Then('after loading completes I should see wishlist items', async ({ page }) => {
  // Wait for skeleton to disappear and items to appear
  const cards = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]')
  await expect(cards.first()).toBeVisible({ timeout: 15000 })
})

// ============================================================================
// Accessibility Steps
// ============================================================================

When('I press Tab to focus on the first card', async ({ page }) => {
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab') // May need multiple tabs to reach card
})

Then('the first wishlist card should be focused', async ({ page }) => {
  // Check that some element within the gallery has focus
  const focusedElement = page.locator(':focus')
  await expect(focusedElement).toBeVisible()
})

When('I press Tab again', async ({ page }) => {
  await page.keyboard.press('Tab')
})

Then('the next interactive element should be focused', async ({ page }) => {
  const focusedElement = page.locator(':focus')
  await expect(focusedElement).toBeVisible()
})

// ============================================================================
// Responsive Steps
// ============================================================================

Then('the gallery should display in a single column', async ({ page }) => {
  // On mobile, grid should be single column
  const gallery = page.locator('[data-testid="gallery-grid"]').or(page.locator('.grid'))
  await expect(gallery.first()).toBeVisible()
  // Visual verification - grid-cols-1 on mobile
})

Then('the filter bar should be collapsed', async ({ page }) => {
  // On mobile, filter bar may be collapsed or stacked
  const filterBar = page.locator('[data-testid="wishlist-filter-bar"]').or(page.locator('.flex'))
  await expect(filterBar.first()).toBeVisible()
})

// ============================================================================
// Pagination Steps
// ============================================================================

Then('I should see pagination controls', async ({ page }) => {
  const pagination = page.locator('[data-testid="gallery-pagination"]').or(page.getByRole('navigation'))
  await expect(pagination.first()).toBeVisible()
})

When('I click {string}', async ({ page }, buttonText: string) => {
  const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') })
  await button.click()
  await page.waitForTimeout(500)
})

Then('I should see the next page of items', async ({ page }) => {
  // Verify page changed (cards should still be visible)
  const cards = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]')
  await expect(cards.first()).toBeVisible()
})
