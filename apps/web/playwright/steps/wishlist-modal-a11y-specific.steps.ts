/**
 * Wishlist Modal Accessibility Step Definitions (Wishlist-specific)
 * INST-1111: Missing step definitions for wishlist modal accessibility
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// Only wishlist-specific modal steps that don't conflict with inspiration-accessibility.steps.ts

Then('the delete confirmation modal should be visible', async ({ page }) => {
  const modal = page.locator('[data-testid="delete-confirmation-modal"], [role="dialog"][aria-labelledby*="delete"]')
  await expect(modal).toBeVisible()
})

Then('the delete confirmation modal should not be visible', async ({ page }) => {
  const modal = page.locator('[data-testid="delete-confirmation-modal"], [role="dialog"][aria-labelledby*="delete"]')
  await expect(modal).not.toBeVisible()
})

Then('the Got It modal should be visible', async ({ page }) => {
  const modal = page.locator('[data-testid="got-it-modal"], [role="dialog"][aria-labelledby*="got"]')
  await expect(modal).toBeVisible()
})

Then('the Got It modal should not be visible', async ({ page }) => {
  const modal = page.locator('[data-testid="got-it-modal"], [role="dialog"][aria-labelledby*="got"]')
  await expect(modal).not.toBeVisible()
})

When('I click the delete button', async ({ page }) => {
  const deleteButton = page.getByRole('button', { name: /delete|remove/i })
  await deleteButton.click()
})

When('I click the confirm delete button', async ({ page }) => {
  const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i }).filter({ hasText: /confirm|yes|delete/i })
  await confirmButton.click()
})

When('I click the Got It button', async ({ page }) => {
  const gotItButton = page.getByRole('button', { name: /got it|mark as purchased/i })
  await gotItButton.click()
})

Then('I should see a permission error message', async ({ page }) => {
  const errorMessage = page.getByText(/permission denied|forbidden|not authorized/i)
  await expect(errorMessage).toBeVisible()
})

Then('I should see a not found error message', async ({ page }) => {
  const errorMessage = page.getByText(/not found|does not exist/i)
  await expect(errorMessage).toBeVisible()
})

Then('I should see a success toast with {string} or {string}', async ({ page }, text1: string, text2: string) => {
  const toast = page.locator('[data-testid="toast"], [role="status"], .toast')
  await expect(toast).toBeVisible()
  
  const toastText = await toast.textContent()
  const hasText = toastText?.toLowerCase().includes(text1.toLowerCase()) || 
                  toastText?.toLowerCase().includes(text2.toLowerCase())
  expect(hasText).toBeTruthy()
})

Then('I should see a price validation error', async ({ page }) => {
  const errorMessage = page.getByText(/invalid price|price.*required|price.*format/i)
  await expect(errorMessage).toBeVisible()
})
