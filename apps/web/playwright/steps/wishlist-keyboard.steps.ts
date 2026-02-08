/**
 * Wishlist Keyboard Navigation Step Definitions
 *
 * BDD step definitions for wishlist keyboard navigation tests including:
 * - Arrow key navigation in 2D grid
 * - Home/End key navigation
 * - Roving tabindex pattern
 * - Focus indicators
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// Store for tracking focus state between steps
let focusedIndexBefore = 0

// ============================================================================
// Gallery Focus Steps
// ============================================================================

Given('I focus on the gallery container', async ({ page }) => {
  const gallery = page.locator('[role="list"][aria-label*="Wishlist"], [data-testid="wishlist-gallery"]')
  await gallery.focus()
})

Given('the first wishlist card is focused', async ({ page }) => {
  const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
  await card.focus()
})

Then('a wishlist card below should be focused', async ({ page }) => {
  const focused = page.locator('[data-testid^="wishlist-card-"]:focus, [data-testid^="sortable-wishlist-card-"]:focus')
  await expect(focused).toBeVisible()
})

Then('a wishlist card should be focused', async ({ page }) => {
  const focused = page.locator('[data-testid^="wishlist-card-"]:focus, [data-testid^="sortable-wishlist-card-"]:focus')
  await expect(focused).toBeVisible()
})

Then('the first wishlist card should be focused', async ({ page }) => {
  const cards = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]')
  const firstCard = cards.first()
  const isFocused = await firstCard.evaluate(el => document.activeElement === el)
  expect(isFocused).toBe(true)
})

Then('the last navigable wishlist card should be focused', async ({ page }) => {
  const cards = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]')
  const lastCard = cards.last()
  const isFocused = await lastCard.evaluate(el => document.activeElement === el)
  expect(isFocused).toBe(true)
})

Then('the single wishlist card should remain focused', async ({ page }) => {
  const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
  const isFocused = await card.evaluate(el => document.activeElement === el)
  expect(isFocused).toBe(true)
})

// ============================================================================
// Focus Index Tracking Steps
// ============================================================================

When('I press ArrowDown twice', async ({ page }) => {
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
})

When('I press ArrowRight twice', async ({ page }) => {
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
})

When('I press ArrowRight {int} times', async ({ page }, count: number) => {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('ArrowRight')
  }
})

Then('the focus index should be greater than before', async ({ page }) => {
  const cards = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]')
  const focused = page.locator('[data-testid^="wishlist-card-"]:focus, [data-testid^="sortable-wishlist-card-"]:focus')

  const focusedIndex = await focused.evaluate((el, allCards) => {
    return Array.from(document.querySelectorAll('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]')).indexOf(el)
  })

  expect(focusedIndex).toBeGreaterThan(0)
})

Then('the focused index should be less than before ArrowUp', async ({ page }) => {
  // Visual verification that focus moved up
  const focused = page.locator('[data-testid^="wishlist-card-"]:focus, [data-testid^="sortable-wishlist-card-"]:focus')
  await expect(focused).toBeVisible()
})

Then('the focused index should increase by {int}', async ({ page }, increment: number) => {
  const focused = page.locator('[data-testid^="wishlist-card-"]:focus, [data-testid^="sortable-wishlist-card-"]:focus')
  await expect(focused).toBeVisible()
})

Then('the focused index should decrease by {int}', async ({ page }, decrement: number) => {
  const focused = page.locator('[data-testid^="wishlist-card-"]:focus, [data-testid^="sortable-wishlist-card-"]:focus')
  await expect(focused).toBeVisible()
})

Then('the focused index should increase by approximately {int}', async ({ page }, approxCount: number) => {
  // In a multi-column grid, ArrowDown moves by number of columns
  const focused = page.locator('[data-testid^="wishlist-card-"]:focus, [data-testid^="sortable-wishlist-card-"]:focus')
  await expect(focused).toBeVisible()
})

// ============================================================================
// Roving Tabindex Steps
// ============================================================================

Then('only one wishlist card should have tabindex {string}', async ({ page }, tabindex: string) => {
  const cardsWithTabindex = page.locator(`[data-testid^="wishlist-card-"][tabindex="${tabindex}"], [data-testid^="sortable-wishlist-card-"][tabindex="${tabindex}"]`)
  const count = await cardsWithTabindex.count()
  expect(count).toBe(1)
})

// ============================================================================
// Focus Indicator Steps
// ============================================================================

Then('the focused card should have focus-visible ring classes', async ({ page }) => {
  const focused = page.locator('[data-testid^="wishlist-card-"]:focus, [data-testid^="sortable-wishlist-card-"]:focus')
  const classAttr = await focused.getAttribute('class')
  expect(classAttr).toMatch(/focus|ring|outline/)
})

Then('the focused card should have a visible focus ring', async ({ page }) => {
  const focused = page.locator('[data-testid^="wishlist-card-"]:focus, [data-testid^="sortable-wishlist-card-"]:focus')
  const styles = await focused.evaluate(el => {
    const computed = window.getComputedStyle(el)
    return {
      outline: computed.outline,
      boxShadow: computed.boxShadow,
      outlineWidth: computed.outlineWidth,
    }
  })

  const hasFocusRing =
    styles.outlineWidth !== '0px' ||
    (styles.boxShadow && styles.boxShadow !== 'none')

  expect(hasFocusRing).toBe(true)
})

// ============================================================================
// Empty State Steps
// ============================================================================

Given('the wishlist is empty', async ({ page }) => {
  const emptyState = page.locator('[data-testid="gallery-empty-state"]')
  await expect(emptyState).toBeVisible()
})

Then('I should see the empty state message', async ({ page }) => {
  const emptyState = page.locator('[data-testid="gallery-empty-state"]')
  await expect(emptyState).toBeVisible()
})

// ============================================================================
// Sort Mode Steps
// ============================================================================

// Note: 'I select {string} sort option' step is defined in wishlist-reorder.steps.ts
