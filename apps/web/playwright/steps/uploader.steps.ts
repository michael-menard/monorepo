/* eslint-disable no-empty-pattern */
/**
 * Step definitions for Instructions Uploader tests
 * Story 3.1.26: E2E + A11y + Performance
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { UploaderPage } from './pages/uploader.page'

const { Given, When, Then } = createBdd()

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Fixture paths
const FIXTURES_DIR = path.join(__dirname, '../fixtures/uploader')
const PDF_FIXTURE = path.join(FIXTURES_DIR, 'sample-instructions.pdf')
const CSV_FIXTURE = path.join(FIXTURES_DIR, 'sample-parts-list.csv')
const IMAGE_FIXTURE = path.join(FIXTURES_DIR, 'sample-thumbnail.jpg')
const GALLERY_FIXTURES = [
  path.join(FIXTURES_DIR, 'gallery-1.jpg'),
  path.join(FIXTURES_DIR, 'gallery-2.jpg'),
]

// Page object instance (created per test)
let uploaderPage: UploaderPage

// Background - Navigation
Given('I am on the instructions upload page', async ({ page }) => {
  uploaderPage = new UploaderPage(page)
  await uploaderPage.goto()
})

// UI Elements
Then('I should see a title input field', async () => {
  await expect(uploaderPage.titleInput).toBeVisible()
})

Then('I should see a description textarea', async () => {
  await expect(uploaderPage.descriptionTextarea).toBeVisible()
})

Then('I should see an {string} upload button', async ({}, buttonName: string) => {
  const button = uploaderPage.page.getByRole('button', { name: new RegExp(buttonName, 'i') })
  await expect(button).toBeVisible()
})

Then('I should see a {string} upload button', async ({}, buttonName: string) => {
  const button = uploaderPage.page.getByRole('button', { name: new RegExp(buttonName, 'i') })
  await expect(button).toBeVisible()
})

// Form Input
When('I fill in the title {string}', async ({}, title: string) => {
  await uploaderPage.fillTitle(title)
})

When('I fill in the description {string}', async ({}, description: string) => {
  await uploaderPage.fillDescription(description)
})

When('I expand the MOC Details section', async () => {
  await uploaderPage.expandDetails()
})

When('I fill in the author {string}', async ({}, author: string) => {
  await uploaderPage.fillAuthor(author)
})

When('I fill in the MOC ID {string}', async ({}, mocId: string) => {
  await uploaderPage.fillMocId(mocId)
})

When('I fill in the parts count {string}', async ({}, count: string) => {
  await uploaderPage.fillPartsCount(count)
})

When('I fill in the theme {string}', async ({}, theme: string) => {
  await uploaderPage.fillTheme(theme)
})

When('I fill in a complete valid form', async () => {
  await uploaderPage.fillCompleteForm({
    title: 'Test MOC Title',
    description: 'A complete description for testing purposes with enough characters',
    author: 'Test Author',
    mocId: 'MOC-99999',
    partsCount: '250',
    theme: 'Technic',
  })
})

// File Upload
When('I upload a PDF instruction file', async () => {
  await uploaderPage.uploadPdfInstruction(PDF_FIXTURE)
})

When('I upload a CSV parts list file', async () => {
  await uploaderPage.uploadPartsList(CSV_FIXTURE)
})

When('I upload a thumbnail image', async () => {
  await uploaderPage.uploadThumbnail(IMAGE_FIXTURE)
})

When('I upload gallery images', async () => {
  await uploaderPage.uploadGalleryImages(GALLERY_FIXTURES)
})

When('I upload an invalid file type', async () => {
  // Upload a file with wrong extension/type
  const invalidFile = path.join(FIXTURES_DIR, 'invalid-file.exe')
  await uploaderPage.instructionsFileInput.setInputFiles(invalidFile)
})

Then('I should see the file in the upload list', async () => {
  const count = await uploaderPage.getUploadFileCount()
  expect(count).toBeGreaterThan(0)
})

Then('I should see the upload progress', async ({ page }) => {
  const progress = page.locator('[data-testid="upload-progress"]')
  await expect(progress).toBeVisible()
})

Then('I should see {int} files in the upload list', async ({}, expectedCount: number) => {
  const count = await uploaderPage.getUploadFileCount()
  expect(count).toBe(expectedCount)
})

When('the upload completes successfully', async () => {
  await uploaderPage.waitForUploadComplete()
})

// Validation Errors
Then('I should see a title validation error', async () => {
  await expect(uploaderPage.titleError).toBeVisible()
})

Then('I should see a description validation error', async () => {
  await expect(uploaderPage.descriptionError).toBeVisible()
})

Then('the {string} button should be disabled', async ({ page }, buttonName: string) => {
  const button = page.getByRole('button', { name: new RegExp(buttonName, 'i') })
  await expect(button).toBeDisabled()
})

Then('the {string} button should be enabled', async ({ page }, buttonName: string) => {
  const button = page.getByRole('button', { name: new RegExp(buttonName, 'i') })
  await expect(button).toBeEnabled()
})

// Navigation/Actions
When('I click the {string} button', async ({ page }, buttonName: string) => {
  const button = page.getByRole('button', { name: new RegExp(buttonName, 'i') })
  await button.click()
})

When('I reload the page', async ({ page }) => {
  await page.reload()
  await page.waitForLoadState('networkidle')
})

Then('I should be redirected to the new MOC page', async ({ page }) => {
  await page.waitForURL(/\/instructions\/[a-z0-9-]+/, { timeout: 10000 })
})

Then('I should be redirected to the login page', async ({ page }) => {
  await page.waitForURL(/\/login/, { timeout: 5000 })
})

Then('the redirect URL should contain the uploader path', async ({ page }) => {
  const url = page.url()
  expect(url).toContain('redirect')
  expect(url).toContain('instructions')
})

// Session State
Then('I should see the restored progress message', async () => {
  await expect(uploaderPage.restoredMessage).toBeVisible()
})

Then('the title field should contain {string}', async ({}, expectedValue: string) => {
  await expect(uploaderPage.titleInput).toHaveValue(expectedValue)
})

Given('I have a previous session to restore', async ({ page }) => {
  // Set up localStorage with a previous session
  await page.evaluate(() => {
    const session = {
      title: 'Previous Session Title',
      description: 'Previous description',
      files: [],
      step: 'details',
      uploadToken: null,
      updatedAt: Date.now(),
    }
    localStorage.setItem('uploader:/instructions/new', JSON.stringify(session))
  })
})

// Error Scenarios (will be connected to API mocks)
Given('the API will return a 409 conflict error', async ({ page }) => {
  // This will be implemented with route interception in Task 2
  await page.route('**/api/mocs/uploads/sessions/*/finalize', route => {
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'SLUG_CONFLICT',
        message: 'A MOC with this title already exists',
        suggestedSlug: 'my-awesome-moc-2',
      }),
    })
  })
})

Given('the API will return a 429 rate limit error', async ({ page }) => {
  await page.route('**/api/mocs/uploads/sessions/*/finalize', route => {
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: {
        'Retry-After': '60',
      },
      body: JSON.stringify({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfterSeconds: 60,
      }),
    })
  })
})

Given('the presigned URL will expire', async ({ page }) => {
  await page.route('**/s3.amazonaws.com/**', route => {
    route.fulfill({
      status: 403,
      contentType: 'application/xml',
      body: '<Error><Code>ExpiredToken</Code><Message>The provided token has expired.</Message></Error>',
    })
  })
})

Given('the user session will expire during upload', async ({ page }) => {
  await page.route('**/api/**', route => {
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'UNAUTHORIZED',
        message: 'Session expired',
      }),
    })
  })
})

Given('the API will return file validation errors', async ({ page }) => {
  await page.route('**/api/mocs/uploads/sessions/*/finalize', route => {
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'FILE_VALIDATION_FAILED',
        message: 'Some files failed validation',
        fileErrors: [
          {
            fileId: 'file-1',
            filename: 'test.exe',
            reason: 'type',
            message: 'File type not allowed',
          },
        ],
      }),
    })
  })
})

Then('I should see the conflict resolution modal', async () => {
  await expect(uploaderPage.conflictModal).toBeVisible()
})

Then('I should see a suggested alternative slug', async ({ page }) => {
  const suggestion = page.getByText(/suggested/i)
  await expect(suggestion).toBeVisible()
})

Then('I should see the rate limit banner', async () => {
  await expect(uploaderPage.rateLimitBanner).toBeVisible()
})

Then('I should see a countdown timer', async ({ page }) => {
  const countdown = page.getByText(/\d+:\d+|\d+ seconds/i)
  await expect(countdown).toBeVisible()
})

When('the countdown completes', async ({ page }) => {
  // Fast-forward the countdown (mock time)
  await page.evaluate(() => {
    // Simulate countdown completion
    const event = new CustomEvent('countdown-complete')
    window.dispatchEvent(event)
  })
  await page.waitForTimeout(100)
})

Then('I should see the session expired banner', async () => {
  await expect(uploaderPage.sessionExpiredBanner).toBeVisible()
})

Then('the uploads should be retried with new URLs', async ({ page }) => {
  // Verify retry was triggered
  const retryIndicator = page.locator('[data-testid="upload-retry"]')
  await expect(retryIndicator).toBeVisible()
})

Then('I should see file validation errors', async () => {
  await expect(uploaderPage.errorAlert).toBeVisible()
})

Then('the error should indicate which file failed', async ({ page }) => {
  const fileError = page.getByText(/test\.exe/i)
  await expect(fileError).toBeVisible()
})

Then('the error should show the reason for failure', async ({ page }) => {
  const reason = page.getByText(/not allowed|invalid/i)
  await expect(reason).toBeVisible()
})

When('I enter a new title in the conflict modal', async ({ page }) => {
  const input = page.locator('[data-testid="conflict-title-input"]')
  await input.fill('My Unique MOC Title')
})

When('I confirm the new title', async ({ page }) => {
  const confirmButton = page.getByRole('button', { name: /confirm|save|update/i })
  await confirmButton.click()
})

Then('the finalize should be retried with the new title', async () => {
  // Modal should close and finalize should be called again
  await expect(uploaderPage.conflictModal).not.toBeVisible()
})

When('I log back in', async ({ page }) => {
  // Re-authenticate
  await page.fill('#email', 'test@example.com')
  await page.fill('#password', 'TestPassword123!')
  await page.click('button[type="submit"]')
})

Then('I should be returned to the uploader', async ({ page }) => {
  await page.waitForURL(/\/instructions\/new/, { timeout: 10000 })
})

Then('my previous progress should be restored', async () => {
  await expect(uploaderPage.restoredMessage).toBeVisible()
})

When('the upload fails with an expired URL error', async () => {
  // This is handled by the presigned URL mock
  await uploaderPage.page.waitForSelector('[data-testid="upload-error"]')
})

When('the upload fails with an authentication error', async () => {
  await uploaderPage.page.waitForSelector('[data-testid="auth-error"]')
})

When('I trigger a conflict error', async () => {
  await uploaderPage.fillCompleteForm({
    title: 'Conflict Test',
    description: 'Testing conflict error flow',
    author: 'Test',
    mocId: 'MOC-1',
    partsCount: '100',
    theme: 'Test',
  })
  await uploaderPage.clickFinalize()
})
