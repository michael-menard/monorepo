/**
 * Wishlist Optimistic UI Step Definitions
 * Story WISH-2032: Optimistic UI for Form Submission
 *
 * These steps test the optimistic UI behavior for wishlist item creation:
 * - Immediate success toast and navigation
 * - Error rollback with form data preservation
 * - Retry functionality
 * - Optimistic cache updates
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ============================================================================
// Navigation Assertions
// ============================================================================

Then(
  'I should be redirected to the gallery page within {int} seconds',
  async ({ page }, seconds: number) => {
    await page.waitForURL(/\/$/, { timeout: seconds * 1000 })
  },
)

Then('the URL should be {string}', async ({ page }, expectedUrl: string) => {
  expect(page.url()).toContain(expectedUrl)
})

// ============================================================================
// Toast Assertions - Success Toast with Specific Content
// ============================================================================

Then(
  'I should see a success toast with title {string}',
  async ({ page }, expectedTitle: string) => {
    const toast = page.getByText(expectedTitle)
    await expect(toast).toBeVisible({ timeout: 5000 })
  },
)

Then(
  'I should see a success toast with description {string}',
  async ({ page }, expectedDescription: string) => {
    const description = page.getByText(new RegExp(expectedDescription, 'i'))
    await expect(description).toBeVisible({ timeout: 5000 })
  },
)

// ============================================================================
// Toast Assertions - Error Toast with Title and Retry
// ============================================================================

Then('I should see an error toast with title {string}', async ({ page }, expectedTitle: string) => {
  const toast = page.getByText(expectedTitle)
  await expect(toast).toBeVisible({ timeout: 10000 })
})

Then('I should see a {string} button in the error toast', async ({ page }, buttonText: string) => {
  // Error toast uses a custom component with a Retry button
  const retryButton = page.getByRole('button', { name: new RegExp(buttonText, 'i') })
  await expect(retryButton).toBeVisible({ timeout: 5000 })
})

// ============================================================================
// Button Interaction in Error Toast
// ============================================================================

When('I click the {string} button in the error toast', async ({ page }, buttonText: string) => {
  const retryButton = page.getByRole('button', { name: new RegExp(buttonText, 'i') })
  await retryButton.click()
})

// ============================================================================
// Button State Assertions
// ============================================================================

When('I click the submit button', async ({ page }) => {
  const submitButton = page.getByRole('button', { name: /add to wishlist/i })
  await submitButton.click()
})

Then('the submit button should be disabled immediately', async ({ page }) => {
  const submitButton = page.getByRole('button', { name: /add to wishlist/i })
  // Button should be disabled very quickly after click
  await expect(submitButton).toBeDisabled({ timeout: 1000 })
})

// ============================================================================
// Form Field Assertions - Value Preservation
// ============================================================================

Given('I fill in the title with {string}', async ({ page }, title: string) => {
  await page.getByLabel(/title/i).fill(title)
})

Given('I fill in the set number with {string}', async ({ page }, setNumber: string) => {
  // Set number is an optional field
  await page.getByLabel(/set number/i).fill(setNumber)
})

Then('the title field should contain {string}', async ({ page }, expectedValue: string) => {
  const titleInput = page.getByLabel(/title/i)
  await expect(titleInput).toHaveValue(expectedValue)
})

Then('the set number field should contain {string}', async ({ page }, expectedValue: string) => {
  const setNumberInput = page.getByLabel(/set number/i)
  await expect(setNumberInput).toHaveValue(expectedValue)
})

// ============================================================================
// Wait Steps for API Timing
// ============================================================================

When('I wait {int} seconds for the API error', async ({ page }, seconds: number) => {
  // Wait for the API error to be processed and UI to rollback
  await page.waitForTimeout(seconds * 1000)
})

// ============================================================================
// Gallery Card Visibility - Eventually
// ============================================================================

Then(
  'I should eventually see a wishlist card with title {string}',
  async ({ page }, title: string) => {
    // Wait for the card to appear in the gallery (optimistic update)
    // Use a longer timeout since this involves optimistic cache update
    const card = page.getByText(title)
    await expect(card).toBeVisible({ timeout: 15000 })
  },
)
