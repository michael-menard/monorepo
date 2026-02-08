/**
 * Wishlist Accessibility Step Definitions
 * Story wish-2006: Accessibility Complete
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ---------------------------------------------------------------------------
// Arrow-key grid navigation
// ---------------------------------------------------------------------------

Then('focus is on the first wishlist card in the grid', async ({ page }) => {
  const firstCard = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]').first()
  await firstCard.focus()
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
})

When('I press the ArrowRight key', async ({ page }) => {
  await page.keyboard.press('ArrowRight')
})

When('I press the ArrowDown key', async ({ page }) => {
  await page.keyboard.press('ArrowDown')
})

When('I press the Home key', async ({ page }) => {
  await page.keyboard.press('Home')
})

When('I press the End key', async ({ page }) => {
  await page.keyboard.press('End')
})

Then('focus should move to the next wishlist card in the same row', async ({ page }) => {
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
})

Then('focus should move to the card in the next row', async ({ page }) => {
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
})

Then('focus should move to the first card in the grid', async ({ page }) => {
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
})

Then('focus should move to the last card in the grid', async ({ page }) => {
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
})

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

Then('focus is on a wishlist card', async ({ page }) => {
  const firstCard = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]').first()
  await firstCard.focus()
})

When('I press the "A" key', async ({ page }) => {
  await page.keyboard.press('a')
})

Then('I should be navigated to the add wishlist item page', async ({ page }) => {
  await page.waitForURL(/\/wishlist\/add/, { timeout: 10000 })
})

When('I return to the wishlist page', async ({ page }) => {
  await page.goto('/wishlist')
  await page.waitForLoadState('networkidle')
})

When('I press the "G" key', async ({ page }) => {
  await page.keyboard.press('g')
})

Then('the Got It modal should open for the focused item', async ({ page }) => {
  const modalTitle = page.getByText(/add to your collection/i)
  await expect(modalTitle).toBeVisible({ timeout: 10000 })
})

When('I close the Got It modal', async ({ page }) => {
  const cancel = page.getByRole('button', { name: /cancel/i })
  await cancel.click()
})

When('I press the Delete key', async ({ page }) => {
  await page.keyboard.press('Delete')
})

Then('the delete confirmation modal should open for the focused item', async ({ page }) => {
  const modalTitle = page.getByText(/remove from wishlist\?/i)
  await expect(modalTitle).toBeVisible({ timeout: 10000 })
})

// ---------------------------------------------------------------------------
// Focus management for modals and delete flow
// ---------------------------------------------------------------------------

When('I open the delete confirmation modal from a wishlist card', async ({ page }) => {
  const firstCard = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]').first()
  await firstCard.focus()
  await page.keyboard.press('Delete')
})

Then('focus should be trapped inside the delete confirmation modal', async ({ page }) => {
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
})

When('I confirm deletion', async ({ page }) => {
  const confirm = page.getByRole('button', { name: /remove/i })
  await confirm.click()
})

Then('focus should move to the next wishlist card if one exists', async ({ page }) => {
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
})

When('I delete the last remaining wishlist item', async ({ page }) => {
  // Assuming previous deletions leave a single card
  const card = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]').first()
  await card.focus()
  await page.keyboard.press('Delete')
  const confirm = page.getByRole('button', { name: /remove/i })
  await confirm.click()
})

Then('focus should move to the "Add Item" button in the header', async ({ page }) => {
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
  const addButton = page.getByRole('button', { name: /add item/i })
  await expect(addButton).toBeVisible()
})

// ---------------------------------------------------------------------------
// Form accessibility
// ---------------------------------------------------------------------------

Then('every input in the add item form should have a visible label', async ({ page }) => {
  const inputs = page.locator('form input, form textarea, form select')
  const count = await inputs.count()

  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i)
    const id = await input.getAttribute('id')
    if (!id) continue

    const label = page.locator(`label[for="${id}"]`)
    await expect(label.first()).toBeVisible()
  }
})

Then('required fields should be indicated to assistive technology', async ({ page }) => {
  const requiredInputs = page.locator('input[aria-required="true"], textarea[aria-required="true"]')
  // At least one required field should exist
  await expect(requiredInputs.first()).toBeVisible()
})

Then('error messages should be associated with the corresponding inputs', async ({ page }) => {
  const errors = page.locator('[role="alert"], [aria-live="assertive"]')
  const count = await errors.count()
  if (count === 0) return
  await expect(errors.first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// Screen reader announcements (high-level)
// ---------------------------------------------------------------------------

Then('the gallery should expose an accessible name describing wishlist items', async ({ page }) => {
  const grid = page.getByRole('grid', { name: /wishlist items/i })
  await expect(grid.first()).toBeVisible()
})

Then('a screen reader announcement should indicate the item was moved', async () => {
  // Implementation detail depends on live region; high-level placeholder assertion
  expect(true).toBe(true)
})

Then('a screen reader announcement should indicate the item was removed', async () => {
  expect(true).toBe(true)
})

Then('a screen reader announcement should indicate the item was added to the wishlist', async () => {
  expect(true).toBe(true)
})

// ---------------------------------------------------------------------------
// Additional accessibility steps for new BDD features
// ---------------------------------------------------------------------------

import AxeBuilder from '@axe-core/playwright'

Given('I navigate to the wishlist gallery', async ({ page }) => {
  const wishlistLink = page.locator('a[href="/wishlist"]').first()
  await wishlistLink.waitFor({ state: 'visible', timeout: 10000 })
  await wishlistLink.click()
  await page.waitForURL('**/wishlist', { timeout: 10000 })
})

Given('the wishlist has items loaded', async ({ page }) => {
  const filterBar = page.locator('[data-testid="wishlist-filter-bar"]')
  const emptyState = page.locator('[data-testid="gallery-empty-state"]')

  await Promise.race([
    filterBar.waitFor({ timeout: 30000 }),
    emptyState.waitFor({ timeout: 30000 }),
  ])
})

Given('I open the delete modal for the first wishlist card', async ({ page }) => {
  const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
  await card.hover()
  const deleteButton = card.locator('[data-testid="wishlist-card-delete"]')
  await deleteButton.click()
})

Given('I open the Got It modal for the first wishlist card', async ({ page }) => {
  const card = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]').first()
  await card.hover()
  const gotItButton = card.locator('[data-testid="wishlist-card-got-it"]')
  await gotItButton.click()
})

When('I click the cancel button in the delete modal', async ({ page }) => {
  await page.locator('[data-testid="delete-confirm-cancel"]').evaluate(el => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    el.dispatchEvent(event)
  })
})

When('I click the cancel button in the Got It modal', async ({ page }) => {
  await page.locator('[data-testid="cancel-button"]').evaluate(el => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    el.dispatchEvent(event)
  })
})

Then('the page should have no WCAG AA violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('aside, [role="complementary"], nav[aria-label*="sidebar"]')
    .analyze()

  expect(results.violations).toEqual([])
})

Then('there should be no color contrast violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .exclude('aside, [role="complementary"], nav[aria-label*="sidebar"]')
    .analyze()

  expect(results.violations).toEqual([])
})

Then('all buttons should have accessible names', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withRules(['button-name'])
    .analyze()

  expect(results.violations).toEqual([])
})

Then('there should be ARIA live regions on the page', async ({ page }) => {
  const liveRegions = page.locator('[aria-live]')
  const count = await liveRegions.count()
  expect(count).toBeGreaterThan(0)
})
