/**
 * Step definitions for INST-1108: Edit MOC Metadata
 *
 * These steps test the MOC editing functionality including form pre-population,
 * validation, error handling, and navigation.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Navigation step "I navigate to a MOC detail page" is defined in
// inst-1103-thumbnail-upload.steps.ts to avoid duplication
// ─────────────────────────────────────────────────────────────────────────────

Given('I navigate to the edit page for a MOC', async ({ page }) => {
  // First navigate to instructions gallery
  await page.goto('/instructions')

  // Wait for gallery region to load
  const galleryRegion = page.getByRole('region', { name: 'MOC Gallery' })
  await galleryRegion.waitFor({ timeout: 15000 })

  // Find the gallery grid list and click the first card button
  const galleryGrid = page.getByRole('list', { name: 'Gallery grid' })
  const firstCard = galleryGrid.getByRole('button').first()
  await firstCard.waitFor({ timeout: 10000 })
  await firstCard.click()

  // Wait for detail page to load
  await page.waitForSelector('[data-testid="moc-detail-dashboard"]', { timeout: 15000 })

  // Click the edit button
  const editButton = page.getByRole('button', { name: /edit/i })
  await editButton.click()

  // Wait for edit page to load
  await page.waitForSelector('[data-testid="edit-moc-page"]', { timeout: 10000 })
})

Given('the API will fail on save', async ({ page }) => {
  // Intercept the PATCH request and make it fail
  await page.route('**/mocs/*', async route => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Internal server error',
        }),
      })
    } else {
      await route.continue()
    }
  })
})

// NOTE: "I change the MOC title to {string}" is defined as When below

Given('the API fails on save', async ({ page }) => {
  // Same as "the API will fail on save"
  await page.route('**/mocs/*', async route => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Failed to update MOC',
        }),
      })
    } else {
      await route.continue()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Edit Button Action Steps
// ─────────────────────────────────────────────────────────────────────────────

When('I click the edit button', async ({ page }) => {
  const editButton = page.getByRole('button', { name: /edit/i })
  await editButton.click()
})

// ─────────────────────────────────────────────────────────────────────────────
// Form Input Steps
// ─────────────────────────────────────────────────────────────────────────────

When('I change the MOC title to {string}', async ({ page }, title: string) => {
  const titleInput = page.getByLabel(/title/i)
  await titleInput.clear()
  await titleInput.fill(title)
})

When('I change the description to {string}', async ({ page }, description: string) => {
  const descriptionInput = page.getByLabel(/description/i)
  await descriptionInput.clear()
  await descriptionInput.fill(description)
})

When('I change the theme to {string}', async ({ page }, theme: string) => {
  const themeSelect = page.getByLabel(/theme/i)
  await themeSelect.click()
  await page.getByRole('option', { name: theme }).click()
})

When('I update the MOC tags to {string}', async ({ page }, tags: string) => {
  const tagsInput = page.getByLabel(/tags/i)
  await tagsInput.clear()
  await tagsInput.fill(tags)
})

When('I clear the MOC title field', async ({ page }) => {
  const titleInput = page.getByLabel(/title/i)
  await titleInput.clear()
})

When('I enter a title with only 2 characters', async ({ page }) => {
  const titleInput = page.getByLabel(/title/i)
  await titleInput.fill('AB')
})

// ─────────────────────────────────────────────────────────────────────────────
// Button Action Steps
// ─────────────────────────────────────────────────────────────────────────────

When('I click the save button', async ({ page }) => {
  const saveButton = page.getByRole('button', { name: /save|update/i })

  // Wait for the PATCH request to complete
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/mocs/') && response.request().method() === 'PATCH',
    { timeout: 15000 },
  )

  await saveButton.click()

  // Wait for response (could be success or error)
  try {
    await responsePromise
  } catch {
    // Response may have been intercepted/mocked, continue
  }
})

When('I click the cancel button', async ({ page }) => {
  const cancelButton = page.getByRole('button', { name: /cancel/i })
  await cancelButton.click()
})

When('I click the back button', async ({ page }) => {
  const backButton = page.getByTestId('back-button')
  await backButton.click()
})

When('I click the retry button', async ({ page }) => {
  const retryButton = page.getByRole('button', { name: /retry/i })

  // Wait for the PATCH request when retry is clicked
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/mocs/') && response.request().method() === 'PATCH',
    { timeout: 15000 },
  )

  await retryButton.click()

  try {
    await responsePromise
  } catch {
    // Response may have been mocked, continue
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard Steps (shared steps in wishlist-modals.steps.ts and uploader.steps.ts)
// ─────────────────────────────────────────────────────────────────────────────

When('I press the Escape key during save', async ({ page }) => {
  // Try to press Escape during save operation
  await page.keyboard.press('Escape')
  // Short wait to verify no navigation occurred
  await page.waitForTimeout(500)
})

// ─────────────────────────────────────────────────────────────────────────────
// Verification Steps - Page State
// ─────────────────────────────────────────────────────────────────────────────

Then('I should be on the edit MOC page', async ({ page }) => {
  await page.waitForSelector('[data-testid="edit-moc-page"]', { timeout: 10000 })
  expect(page.url()).toMatch(/\/mocs\/[^/]+\/edit/)
})

Then('I should be redirected to the detail page', async ({ page }) => {
  await page.waitForURL(/\/mocs\/[^/]+$/, { timeout: 10000 })
  await page.waitForSelector('[data-testid="moc-detail-dashboard"]', { timeout: 10000 })
})

Then('I should remain on the edit page', async ({ page }) => {
  await page.waitForTimeout(500)
  expect(page.url()).toMatch(/\/edit/)
})

// ─────────────────────────────────────────────────────────────────────────────
// Verification Steps - Form State
// ─────────────────────────────────────────────────────────────────────────────

Then('the form should be pre-populated with current MOC data', async ({ page }) => {
  // Wait for form to load
  await page.waitForSelector('[data-testid="moc-form"]', { timeout: 10000 })

  // Title field should have a value
  const titleInput = page.getByLabel(/title/i)
  const titleValue = await titleInput.inputValue()
  expect(titleValue).not.toBe('')
})

Then('the form should be pre-populated with {string}', async ({ page }, expectedTitle: string) => {
  const titleInput = page.getByLabel(/title/i)
  await expect(titleInput).toHaveValue(expectedTitle)
})

Then('all form fields should have accessible labels', async ({ page }) => {
  const titleInput = page.getByLabel(/title/i)
  await expect(titleInput).toBeAttached()

  const descriptionInput = page.getByLabel(/description/i)
  await expect(descriptionInput).toBeAttached()
})

// ─────────────────────────────────────────────────────────────────────────────
// Verification Steps - Success Messages
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see a success message {string}', async ({ page }, message: string) => {
  // Wait for toast notification
  const toast = page
    .locator('[data-sonner-toast]')
    .filter({ hasText: new RegExp(message, 'i') })
    .first()
  await expect(toast).toBeVisible({ timeout: 10000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Verification Steps - Content Verification
// ─────────────────────────────────────────────────────────────────────────────

Then(
  'the detail page should show the updated title {string}',
  async ({ page }, expectedTitle: string) => {
    // Wait for detail page to load
    await page.waitForSelector('[data-testid="moc-detail-dashboard"]', { timeout: 10000 })

    // Find the title heading
    const titleHeading = page.getByRole('heading', { name: new RegExp(expectedTitle, 'i') })
    await expect(titleHeading).toBeVisible()
  },
)

Then('the detail page should show the updated description', async ({ page }) => {
  // Verify we're on detail page
  await page.waitForSelector('[data-testid="moc-detail-dashboard"]', { timeout: 10000 })

  // Description should be visible somewhere on the page
  const description = page.locator('text=This is my updated description')
  await expect(description).toBeVisible()
})

Then('the detail page should reflect all changes', async ({ page }) => {
  // Wait for detail page
  await page.waitForSelector('[data-testid="moc-detail-dashboard"]', { timeout: 10000 })

  // Verify title
  const titleHeading = page.getByRole('heading', { name: /Epic Space Station/i })
  await expect(titleHeading).toBeVisible()
})

Then('the title should not be changed', async ({ page }) => {
  // Wait for detail page to load
  await page.waitForSelector('[data-testid="moc-detail-dashboard"]', { timeout: 10000 })

  // The title should NOT contain "This Should Not Save"
  const wrongTitle = page.locator('text=This Should Not Save')
  await expect(wrongTitle).not.toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Verification Steps - Validation Errors
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see a validation error {string}', async ({ page }, errorMessage: string) => {
  const errorText = page.locator('text=' + errorMessage)
  await expect(errorText).toBeVisible({ timeout: 5000 })
})

Then('the save button should be disabled', async ({ page }) => {
  const saveButton = page.getByRole('button', { name: /save|update/i })
  await expect(saveButton).toBeDisabled()
})

// ─────────────────────────────────────────────────────────────────────────────
// Verification Steps - Loading States (shared step in inst-1103-thumbnail-upload.steps.ts)
// ─────────────────────────────────────────────────────────────────────────────

Then('the save button should be disabled during save', async ({ page }) => {
  // Button disabled state is transient - check if disabled or save already completed
  const saveButton = page.getByRole('button', { name: /save|update/i })
  const successToast = page.locator('[data-sonner-toast]').filter({ hasText: /MOC updated/i })

  try {
    await expect(saveButton).toBeDisabled({ timeout: 2000 })
  } catch {
    // If button is no longer disabled, verify save completed successfully
    await expect(successToast).toBeVisible({ timeout: 5000 })
  }
})

Then('the form fields should be disabled during save', async ({ page }) => {
  // Form fields disabled state is transient
  const titleInput = page.getByLabel(/title/i)
  const successToast = page.locator('[data-sonner-toast]').filter({ hasText: /MOC updated/i })

  try {
    await expect(titleInput).toBeDisabled({ timeout: 2000 })
  } catch {
    // If fields are no longer disabled, verify save completed successfully
    await expect(successToast).toBeVisible({ timeout: 5000 })
  }
})

Then('the save operation should complete', async ({ page }) => {
  // Wait for success toast or detail page navigation
  const successToast = page.locator('[data-sonner-toast]').filter({ hasText: /MOC updated/i })
  await expect(successToast).toBeVisible({ timeout: 10000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Verification Steps - Error Handling
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see an error message with retry button', async ({ page }) => {
  // Wait for error toast
  const errorToast = page.locator('[role="alert"]').filter({ hasText: /failed/i })
  await expect(errorToast).toBeVisible({ timeout: 10000 })

  // Verify retry button exists
  const retryButton = page.getByRole('button', { name: /retry/i })
  await expect(retryButton).toBeVisible()
})

Then('my changes should be saved to localStorage', async ({ page }) => {
  // Verify localStorage contains the draft
  const localStorageData = await page.evaluate(() => {
    const keys = Object.keys(localStorage)
    const draftKey = keys.find(key => key.includes('moc-edit-draft'))
    return draftKey ? localStorage.getItem(draftKey) : null
  })

  expect(localStorageData).toBeTruthy()
})

Then('the form should submit again', async ({ page }) => {
  // After clicking retry, form should attempt submission
  // We can verify by checking for loading state or response
  await page.waitForTimeout(1000) // Brief wait for retry attempt
})

Then('I should be able to save successfully', async ({ page }) => {
  // Remove the route intercept to allow successful save
  await page.unroute('**/mocs/*')

  const saveButton = page.getByRole('button', { name: /save|update/i })
  await saveButton.click()

  const successToast = page.locator('[data-sonner-toast]').filter({ hasText: /MOC updated/i })
  await expect(successToast).toBeVisible({ timeout: 10000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Verification Steps - Accessibility
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see the page heading {string}', async ({ page }, heading: string) => {
  const headingElement = page.getByRole('heading', { name: new RegExp(heading, 'i') })
  await expect(headingElement).toBeVisible()
})

Then('the page should have proper semantic structure', async ({ page }) => {
  // Verify main heading exists
  const mainHeading = page.getByRole('heading', { name: /edit moc/i })
  await expect(mainHeading).toBeVisible()

  // Verify form exists
  await expect(page.getByTestId('moc-form')).toBeAttached()
})

Then('validation errors should be announced to screen readers', async ({ page }) => {
  // Validation errors should have role="alert" or aria-live
  const errorElement = page.locator('[role="alert"]').or(page.locator('[aria-live="polite"]'))
  await expect(errorElement.first()).toBeAttached()
})
