/**
 * Inspiration Gallery Keyboard Navigation Step Definitions
 * Feature: Inspiration Gallery Keyboard Navigation
 *
 * BDD step definitions for keyboard navigation E2E tests.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ============================================================================
// Given Steps - Test Preconditions
// ============================================================================

Given('the inspiration gallery has loaded', async ({ page }) => {
  // Wait for the gallery to be visible
  await page.waitForSelector('[data-testid="inspiration-gallery"]', { timeout: 15000 })
})

Given('a modal is open', async ({ page }) => {
  // Press 'u' to open upload modal
  await page.keyboard.press('u')
  await page.waitForSelector('[role="dialog"], [role="alertdialog"]', { timeout: 5000 })
})

Given('I am in multi-select mode', async ({ page }) => {
  const selectButton = page.getByRole('button', { name: /Select/i })
  await selectButton.click()
  await page.waitForTimeout(500)
})

Given('I have items selected', async ({ page }) => {
  // Enter multi-select mode first
  const selectButton = page.getByRole('button', { name: /Select/i })
  await selectButton.click()
  await page.waitForTimeout(500)
  
  // Select all items
  await page.keyboard.press('Control+a')
  await page.waitForTimeout(500)
})

Given('the bulk actions bar is visible', async ({ page }) => {
  const bulkBar = page.getByRole('toolbar', { name: /Bulk actions/i })
  await expect(bulkBar).toBeVisible()
})

Given('the tab list is focused', async ({ page }) => {
  // Tab to reach the tabs component
  let attempts = 0
  const maxAttempts = 20
  
  while (attempts < maxAttempts) {
    await page.keyboard.press('Tab')
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement
      return el?.getAttribute('role')
    })
    
    if (focusedElement === 'tab' || focusedElement === 'tablist') {
      return
    }
    attempts++
  }
})

Given('the gallery has inspiration cards', async ({ page }) => {
  const cards = page.locator('[data-testid^="inspiration-card-"]')
  await expect(cards.first()).toBeVisible({ timeout: 10000 })
})

Given('the first card is focused', async ({ page }) => {
  const card = page.locator('[data-testid^="inspiration-card-"]').first()
  await card.focus()
})


Given('the search input is focused', async ({ page }) => {
  const searchInput = page.locator('input[placeholder="Search..."]')
  await searchInput.focus()
})

// ============================================================================
// When Steps - User Actions
// ============================================================================


When('I press Tab twice', async ({ page }) => {
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
})

When('I focus on the search input', async ({ page }) => {
  const searchInput = page.locator('input[placeholder="Search..."]')
  await searchInput.focus()
})

When('I focus on the first card', async ({ page }) => {
  const card = page.locator('[data-testid^="inspiration-card-"]').first()
  await card.focus()
})

When('I type {string}', async ({ page }, text: string) => {
  await page.keyboard.type(text)
  await page.waitForTimeout(300)
})

// ============================================================================
// Then Steps - Assertions
// ============================================================================

Then('the bulk actions bar should be visible', async ({ page }) => {
  const bulkBar = page.getByRole('toolbar', { name: /Bulk actions/i })
  await expect(bulkBar).toBeVisible()
})

Then('the bulk actions bar should not be visible', async ({ page }) => {
  const bulkBar = page.getByRole('toolbar', { name: /Bulk actions/i })
  await expect(bulkBar).not.toBeVisible()
})

Then('I should eventually reach action buttons like Select or Add Inspiration', async ({ page }) => {
  // Check if we've focused on any of the main action buttons
  const focusedText = await page.evaluate(() => {
    const el = document.activeElement
    return el?.textContent || ''
  })
  
  const hasReachedActionButton = 
    focusedText.includes('Select') || 
    focusedText.includes('Add') || 
    focusedText.includes('Upload')
  
  expect(hasReachedActionButton).toBe(true)
})

Then('the Albums tab should be focused', async ({ page }) => {
  const albumsTab = page.getByRole('tab', { name: /Albums/i })
  const isFocused = await albumsTab.evaluate((el: Element) => el === document.activeElement)
  expect(isFocused).toBe(true)
})

Then('the first card should be focused', async ({ page }) => {
  const card = page.locator('[data-testid^="inspiration-card-"]').first()
  const isFocused = await card.evaluate((el: Element) => el === document.activeElement)
  expect(isFocused).toBe(true)
})

Then('a modal or detail view should open', async ({ page }) => {
  // Either a modal appears or we navigate to a detail page
  const modalVisible = await page.locator('[role="dialog"], [role="alertdialog"]')
    .isVisible()
    .catch(() => false)
  
  const urlChanged = !page.url().includes('/inspiration')
  
  expect(modalVisible || urlChanged).toBe(true)
})

Then('either a dialog appears or the card is selected', async ({ page }) => {
  // Space can either open a dialog or select the card in multi-select mode
  const modalVisible = await page.locator('[role="dialog"], [role="alertdialog"]')
    .isVisible()
    .catch(() => false)
  
  const card = page.locator('[data-testid^="inspiration-card-"]').first()
  const isSelected = await card.getAttribute('aria-pressed') === 'true'
  
  expect(modalVisible || isSelected).toBe(true)
})

Then('no modal should open', async ({ page }) => {
  const modal = page.locator('[role="dialog"], [role="alertdialog"]')
  await expect(modal.first()).not.toBeVisible()
})

Then('the search input should be focused', async ({ page }) => {
  const searchInput = page.locator('input[placeholder="Search..."]')
  const isFocused = await searchInput.evaluate((el: Element) => el === document.activeElement)
  expect(isFocused).toBe(true)
})

Then('the search input should contain {string}', async ({ page }, text: string) => {
  const searchInput = page.locator('input[placeholder="Search..."]')
  await expect(searchInput).toHaveValue(text)
})
