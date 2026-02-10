/**
 * Wishlist Background Image Compression Step Definitions
 * Story WISH-2049: Background Image Compression
 *
 * BDD step definitions for background compression E2E tests.
 * Tests verify that form remains interactive during background compression.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import path from 'path'
import { fileURLToPath } from 'url'

const { Given, When, Then } = createBdd()

// ============================================================================
// Test fixtures paths (ESM-compatible)
// ============================================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'uploader')
const LARGE_IMAGE_PATH = path.join(FIXTURES_DIR, 'large-test-image.jpg')

// ============================================================================
// Background Steps
// ============================================================================

Given('I am signed in', async ({ page }) => {
  const TEST_USER = {
    email: 'stan.marsh@southpark.test',
    password: '0Xcoffee?',
  }

  // Navigate to login page
  await page.goto('/login', { waitUntil: 'networkidle' })

  // Wait for React to hydrate
  await page.waitForTimeout(1000)

  // Wait for login form
  await page.waitForSelector('form', { timeout: 15000 })

  // Fill in credentials
  await page.fill('input[type="email"], input[name="email"], input[id="email"]', TEST_USER.email)
  await page.fill('input[type="password"], input[name="password"], input[id="password"]', TEST_USER.password)

  // Submit the form
  await page.click('button[type="submit"]')

  // Wait for successful login (redirect away from /login)
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30000 })

  // Wait for app to stabilize
  await page.waitForTimeout(2000)
})

Given('I am on the add wishlist item page', async ({ page }) => {
  await page.goto('/wishlist/add', { waitUntil: 'networkidle' })
  await page.waitForSelector('form', { timeout: 15000 })
})

// ============================================================================
// Image Selection Steps
// ============================================================================

When('I select a large image for upload', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(LARGE_IMAGE_PATH)

  // Brief wait for compression to start
  await page.waitForTimeout(500)
})

// ============================================================================
// Form Field Interaction Steps
// ============================================================================

Then('the form fields should remain enabled', async ({ page }) => {
  const titleInput = page.locator('#title')
  const storeSelect = page.locator('#store')
  const prioritySelect = page.locator('#priority')

  await expect(titleInput).toBeEnabled({ timeout: 5000 })
  await expect(storeSelect).toBeEnabled({ timeout: 5000 })
  await expect(prioritySelect).toBeEnabled({ timeout: 5000 })
})

Then('the title input should be enabled', async ({ page }) => {
  const titleInput = page.locator('#title')
  await expect(titleInput).toBeEnabled({ timeout: 5000 })
})

Then('the store select should be enabled', async ({ page }) => {
  const storeSelect = page.locator('#store')
  await expect(storeSelect).toBeEnabled({ timeout: 5000 })
})

Then('the priority select should be enabled', async ({ page }) => {
  const prioritySelect = page.locator('#priority')
  await expect(prioritySelect).toBeEnabled({ timeout: 5000 })
})

Then('I should be able to type {string} in the title field', async ({ page }, text: string) => {
  const titleInput = page.locator('#title')
  await titleInput.fill(text)
  await expect(titleInput).toHaveValue(text)
})

// ============================================================================
// Compression Progress & Toast Steps
// ============================================================================

Then('I should see a compression success toast', async ({ page }) => {
  const toast = page.getByText(/image compressed|compression complete/i)
  await expect(toast).toBeVisible({ timeout: 30000 })
})

Then('I should not see a compression success toast within 2 seconds', async ({ page }) => {
  const toast = page.getByText(/image compressed|compression complete/i)
  const isVisible = await toast.isVisible({ timeout: 2000 }).catch(() => false)
  expect(isVisible).toBe(false)
})

// ============================================================================
// Form Submission Steps
// ============================================================================

When('I fill in the title with {string}', async ({ page }, title: string) => {
  const titleInput = page.locator('#title')
  await titleInput.fill(title)
})

When('I select {string} as the store', async ({ page }, store: string) => {
  const storeSelect = page.locator('#store')
  await storeSelect.click()
  const option = page.getByRole('option', { name: new RegExp(store, 'i') })
  await option.click()
})

When('I click the submit button', async ({ page }) => {
  const submitButton = page.getByRole('button', { name: /add to wishlist/i })
  await submitButton.click()
})

Then('the item should be added successfully', async ({ page }) => {
  // Wait for success indication - toast or redirect
  const successToast = page.getByText(/item added|success/i)
  const redirected = page.waitForURL(/\/wishlist(?!\/add)/, { timeout: 10000 }).catch(() => null)

  // Either a success toast or redirect indicates success
  const toastVisible = await successToast.isVisible({ timeout: 10000 }).catch(() => false)
  const wasRedirected = await redirected

  expect(toastVisible || wasRedirected !== null).toBe(true)
})

// ============================================================================
// User Preference Steps
// ============================================================================

When('I check the skip compression checkbox', async ({ page }) => {
  const checkbox = page.locator('#skipCompression')
  await checkbox.click()
})
