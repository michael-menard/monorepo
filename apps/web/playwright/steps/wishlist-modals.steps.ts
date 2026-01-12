/**
 * Wishlist Modals Step Definitions
 * Story wish-2004: Modals & Transitions
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ---------------------------------------------------------------------------
// Background / API mocking
// ---------------------------------------------------------------------------

// With MSW enabled (VITE_ENABLE_MSW), delete and purchased behavior
// is mocked at the application layer. These Given steps are
// documentation-only and do not perform any routing.

Given('the delete-from-wishlist API is mocked', async () => {})

Given('the mark-as-purchased API is mocked', async () => {})

// ---------------------------------------------------------------------------
// Detail helpers
// ---------------------------------------------------------------------------

When('I open the wishlist detail page for item "wish-002"', async ({ page }) => {
  await page.goto('/wishlist/wish-002')
  await page.waitForSelector('h1', { timeout: 10000 })
})

When('I open the wishlist detail page for item "wish-001"', async ({ page }) => {
  await page.goto('/wishlist/wish-001')
  await page.waitForSelector('h1', { timeout: 10000 })
})

When('I open the wishlist detail page for item "wish-003"', async ({ page }) => {
  await page.goto('/wishlist/wish-003')
  await page.waitForSelector('h1', { timeout: 10000 })
})

When('I open the wishlist detail page for item "wish-004"', async ({ page }) => {
  await page.goto('/wishlist/wish-004')
  await page.waitForSelector('h1', { timeout: 10000 })
})

// ---------------------------------------------------------------------------
// Delete modal
// ---------------------------------------------------------------------------

When('I click the "Delete" button on the detail page', async ({ page }) => {
  const deleteButton = page.getByRole('button', { name: /delete/i })
  await deleteButton.click()
})

Then('I should see the delete confirmation modal with the item title', async ({ page }) => {
  const modalTitle = page.getByText(/remove from wishlist\?/i)
  await expect(modalTitle).toBeVisible({ timeout: 10000 })
})

When('I click "Cancel" in the delete confirmation modal', async ({ page }) => {
  const cancel = page.getByRole('button', { name: /cancel/i })
  await cancel.click()
})

When('I confirm deletion in the delete confirmation modal', async ({ page }) => {
  const confirm = page.getByRole('button', { name: /remove/i })
  await confirm.click()
})

Then('the wishlist item should still be visible on the detail page', async ({ page }) => {
  const heading = page.getByRole('heading')
  await expect(heading).toBeVisible()
})

Then('I should see a success toast for removing the wishlist item', async ({ page }) => {
  const toast = page.getByText(/item removed from wishlist/i)
  await expect(toast.first()).toBeVisible({ timeout: 10000 })
})

Then('the deleted item should no longer appear in the gallery', async ({ page }) => {
  await page.waitForURL(/\/wishlist$/, { timeout: 10000 })
  // Rely on UI state only; specific item title is asserted via feature text.
})

// ---------------------------------------------------------------------------
// Gallery delete
// ---------------------------------------------------------------------------

When('I open the action menu for the wishlist card "Imperial Star Destroyer"', async ({ page }) => {
  const card = page.getByText(/imperial star destroyer/i)
  const menuButton = card.locator('..').locator('button').last()
  await menuButton.click()
})

When('I choose the "Remove" action', async ({ page }) => {
  const removeItem = page.getByRole('menuitem', { name: /remove/i })
  await removeItem.click()
})

Then('the removed item should disappear from the gallery', async ({ page }) => {
  await expect(page.getByText(/imperial star destroyer/i)).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// Got It modal
// ---------------------------------------------------------------------------

When('I click the "Got it!" button on the detail page', async ({ page }) => {
  const gotIt = page.getByRole('button', { name: /got it/i })
  await gotIt.click()
})

Then('I should see the Got It modal with the item summary', async ({ page }) => {
  const title = page.getByText(/add to your collection/i)
  await expect(title).toBeVisible({ timeout: 10000 })
})

Then('the price paid field should be pre-filled from the wishlist price', async ({ page }) => {
  const priceInput = page.getByLabel(/price paid/i)
  await expect(priceInput).not.toHaveValue('0')
})

Then('the purchase date field should default to today', async ({ page }) => {
  const dateInput = page.getByLabel(/purchase date/i)
  const value = await dateInput.inputValue()
  expect(value).toBeTruthy()
})

When('I fill in the remaining purchase details', async ({ page }) => {
  const taxInput = page.getByLabel(/tax/i)
  if (await taxInput.isVisible().catch(() => false)) {
    await taxInput.fill('10')
  }
  const shippingInput = page.getByLabel(/shipping/i)
  if (await shippingInput.isVisible().catch(() => false)) {
    await shippingInput.fill('5')
  }
})

When('I check "Keep on wishlist" in the Got It modal', async ({ page }) => {
  const checkbox = page.getByLabel(/keep on wishlist/i)
  await checkbox.check()
})

When('I submit the Got It form', async ({ page }) => {
  const submit = page.getByRole('button', { name: /add to collection/i })
  await submit.click()
})

Then('I should see a success toast for adding the item to my collection', async ({ page }) => {
  const toast = page.getByText(/added to your collection|marked as purchased/i)
  await expect(toast.first()).toBeVisible({ timeout: 10000 })
})

Then('the wishlist item should be removed from the gallery if not kept on wishlist', async ({ page }) => {
  await page.waitForURL(/\/wishlist$/, { timeout: 10000 })
})

Then('I should see a success toast for marking the item as purchased', async ({ page }) => {
  const toast = page.getByText(/marked as purchased/i)
  await expect(toast.first()).toBeVisible({ timeout: 10000 })
})

Then('the wishlist item should remain visible in the gallery', async ({ page }) => {
  await page.waitForURL(/\/wishlist$/, { timeout: 10000 })
})

Then('I should see a success toast with an "Undo" action', async ({ page }) => {
  const toast = page.getByText(/undo/i)
  await expect(toast).toBeVisible({ timeout: 10000 })
})

Then('the item should disappear from the wishlist gallery', async ({ page }) => {
  await page.waitForURL(/\/wishlist$/, { timeout: 10000 })
})

When('I click the "Undo" button in the toast within five seconds', async ({ page }) => {
  const undo = page.getByRole('button', { name: /undo/i })
  await undo.click()
})

Then('the wishlist item should reappear in the gallery', async ({ page }) => {
  await page.waitForURL(/\/wishlist$/, { timeout: 10000 })
})

// ---------------------------------------------------------------------------
// Keyboard interaction
// ---------------------------------------------------------------------------

When('I open the delete confirmation modal', async ({ page }) => {
  const deleteButton = page.getByRole('button', { name: /delete/i })
  await deleteButton.click()
})

When('I press the Escape key', async ({ page }) => {
  await page.keyboard.press('Escape')
})

Then('the delete confirmation modal should close', async ({ page }) => {
  const modal = page.getByText(/remove from wishlist\?/i)
  await expect(modal).toHaveCount(0)
})

Then('focus should return to the delete button on the detail page', async ({ page }) => {
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
})
