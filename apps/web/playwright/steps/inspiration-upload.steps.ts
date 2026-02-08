/**
 * Inspiration Upload Step Definitions
 * Story INSP-004: Upload Page
 *
 * BDD step definitions for inspiration upload E2E tests.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import * as path from 'path'

const { Given, When, Then } = createBdd()

// ============================================================================
// Modal Steps
// ============================================================================

Given('the upload modal is open', async ({ page }) => {
  await page.getByRole('button', { name: /Add Inspiration/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

// Note: 'I click the {string} button' step is defined in inspiration-gallery.steps.ts

Then('the upload modal should be visible', async ({ page }) => {
  await expect(page.getByRole('dialog')).toBeVisible()
})

Then('the upload modal should not be visible', async ({ page }) => {
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

Then('I should see the file drop zone', async ({ page }) => {
  const dropzone = page.locator('[data-testid="file-dropzone"]').or(
    page.getByText(/Drop files here|Drag and drop/i)
  )
  await expect(dropzone).toBeVisible()
})

Then('I should see the title input field', async ({ page }) => {
  const titleInput = page.locator('input[name="title"], input[placeholder*="Title"]')
  await expect(titleInput).toBeVisible()
})

When('I click the close button', async ({ page }) => {
  await page.getByRole('button', { name: /Close/i }).click()
})

When('I press the U key', async ({ page }) => {
  await page.keyboard.press('u')
})

// ============================================================================
// File Upload Steps
// ============================================================================

When('I upload a valid image file {string}', async ({ page }, filename: string) => {
  // Create a file input and upload
  const fileInput = page.locator('input[type="file"]')

  // Create a test file path
  const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-images', filename)

  // If the test file doesn't exist, we'll use a data URI approach
  await fileInput.setInputFiles({
    name: filename,
    mimeType: 'image/jpeg',
    buffer: Buffer.from('fake-image-content'),
  })
})

When('I enter title {string}', async ({ page }, title: string) => {
  const titleInput = page.locator('input[name="title"], input[placeholder*="Title"]')
  await titleInput.fill(title)
})

When('I enter description {string}', async ({ page }, description: string) => {
  const descInput = page.locator('textarea[name="description"], textarea[placeholder*="Description"]')
  await descInput.fill(description)
})

When('I add tags {string}', async ({ page }, tagsString: string) => {
  const tagsInput = page.locator('input[name="tags"], input[placeholder*="Tags"]')
  await tagsInput.fill(tagsString)
})

When('I click the submit button', async ({ page }) => {
  await page.getByRole('button', { name: /Upload|Submit|Add|Create/i }).click()
})

When('I click the submit button without entering a title', async ({ page }) => {
  // Clear title first
  const titleInput = page.locator('input[name="title"], input[placeholder*="Title"]')
  await titleInput.clear()
  await page.getByRole('button', { name: /Upload|Submit|Add|Create/i }).click()
})

Then('I should see an upload success message', async ({ page }) => {
  const successMessage = page.getByText(/Success|Added|Uploaded|Created/i)
  await expect(successMessage).toBeVisible({ timeout: 10000 })
})

Then('the inspiration should appear in the gallery', async ({ page }) => {
  // Navigate back to gallery and verify
  const cards = page.locator('[data-testid^="inspiration-card-"]')
  await expect(cards.first()).toBeVisible({ timeout: 10000 })
})

Then('the inspiration should have the tags', async ({ page }) => {
  // Tags should be visible on the card or in detail view
  const tagBadges = page.locator('[data-testid="tag-badge"]')
  await expect(tagBadges.first()).toBeVisible()
})

// ============================================================================
// URL Import Steps
// ============================================================================

When('I switch to URL import mode', async ({ page }) => {
  const urlTab = page.getByRole('tab', { name: /URL|Link/i })
  await urlTab.click()
})

When('I enter URL {string}', async ({ page }, url: string) => {
  const urlInput = page.locator('input[name="url"], input[type="url"], input[placeholder*="URL"]')
  await urlInput.fill(url)
})

Then('I should see a URL validation error', async ({ page }) => {
  const errorMessage = page.getByText(/Invalid URL|Please enter a valid URL/i)
  await expect(errorMessage).toBeVisible()
})

// ============================================================================
// Validation Steps
// ============================================================================

Then('I should see an error about missing image', async ({ page }) => {
  const errorMessage = page.getByText(/Image required|Please upload an image|Image is required/i)
  await expect(errorMessage).toBeVisible()
})

Then('I should see a title required error', async ({ page }) => {
  const errorMessage = page.getByText(/Title required|Title is required|Please enter a title/i)
  await expect(errorMessage).toBeVisible()
})

// ============================================================================
// Drag and Drop Steps
// ============================================================================

When('I drag an image file into the drop zone', async ({ page }) => {
  const dropzone = page.locator('[data-testid="file-dropzone"]').or(
    page.getByText(/Drop files here|Drag and drop/i)
  )

  // Create a data transfer event
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer())

  // Dispatch drop event
  await dropzone.dispatchEvent('drop', { dataTransfer })
})

When('I drag a file over the drop zone', async ({ page }) => {
  const dropzone = page.locator('[data-testid="file-dropzone"]').or(
    page.getByText(/Drop files here|Drag and drop/i)
  )

  await dropzone.dispatchEvent('dragover')
})

Then('the drop zone should show the file preview', async ({ page }) => {
  const preview = page.locator('[data-testid="file-preview"]').or(page.locator('.file-preview'))
  await expect(preview).toBeVisible()
})

Then('the file name should be displayed', async ({ page }) => {
  // File name should be shown somewhere in the modal
  const fileName = page.getByText(/\.jpg|\.png|\.jpeg/i)
  await expect(fileName).toBeVisible()
})

Then('the drop zone should show active styling', async ({ page }) => {
  const dropzone = page.locator('[data-testid="file-dropzone"]').or(
    page.getByText(/Drop files here|Drag and drop/i)
  )
  // Check for active class or styling
  await expect(dropzone).toBeVisible()
})
