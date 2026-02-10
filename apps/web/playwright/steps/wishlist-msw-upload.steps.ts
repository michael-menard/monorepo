/**
 * Wishlist MSW Upload Step Definitions
 * Tests MSW browser-mode integration for image uploads
 */

import path from 'path'

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// Track intercepted requests for assertions
let interceptedPresign = false
let interceptedS3Upload = false

// ============================================================================
// MSW Service Worker Steps
// ============================================================================

Given('the app is loaded with MSW mocking enabled', async ({ page }) => {
  // Navigate to the app - MSW will auto-start via VITE_ENABLE_MSW=true
  await page.goto('/')

  // Wait for the app to be ready
  await page.waitForLoadState('networkidle')

  // Verify MSW is active by checking for service worker
  const swCount = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    return registrations.length
  })
  expect(swCount).toBeGreaterThan(0)
})

Then('the MSW service worker should be registered', async ({ page }) => {
  const swRegistrations = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    return registrations.map(r => ({
      scope: r.scope,
      active: !!r.active,
    }))
  })

  expect(swRegistrations.length).toBeGreaterThan(0)
  expect(swRegistrations[0].active).toBe(true)
})

Then('API requests should be intercepted by MSW', async ({ page }) => {
  // Make a health check request and verify it's handled by MSW
  const response = await page.evaluate(async () => {
    const res = await fetch('/api/health')
    return {
      status: res.status,
      body: await res.json(),
    }
  })

  expect(response.status).toBe(200)
  expect(response.body.service).toBe('main-app-mock-backend')
})

// ============================================================================
// Add Item Page Steps
// ============================================================================

Given('I am on the add wishlist item page', async ({ page }) => {
  await page.goto('/wishlist/add')
  await page.waitForLoadState('networkidle')

  // Reset request tracking
  interceptedPresign = false
  interceptedS3Upload = false

  // Set up request listeners to track MSW interceptions
  page.on('request', request => {
    const url = request.url()
    if (
      url.includes('/api/wishlist/images/presign') ||
      url.includes('/api/v2/wishlist/images/presign')
    ) {
      interceptedPresign = true
    }
    if (url.includes('s3.amazonaws.com') || url.includes('.s3.')) {
      interceptedS3Upload = true
    }
  })
})

// ============================================================================
// Form Interaction Steps
// ============================================================================

When('I fill in the item title {string}', async ({ page }, title: string) => {
  // Find the title input and fill it
  const titleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i))
  await titleInput.fill(title)

  // Also fill store which is required
  const storeInput = page.getByLabel(/store/i)
  if (await storeInput.isVisible().catch(() => false)) {
    await storeInput.click()
    await page.getByRole('option', { name: /lego/i }).first().click()
  }
})

When('I select an image file for upload', async ({ page }) => {
  // Use a test image file
  const testImagePath = path.resolve(__dirname, '../fixtures/files/test-thumbnail.jpg')

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(testImagePath)

  // Wait for file input to register
  await page.waitForTimeout(500)
})

When('I submit the form', async ({ page }) => {
  const submitButton = page.getByRole('button', { name: /submit|save|add to wishlist/i })
  await submitButton.click()

  // Wait for network activity to settle
  await page.waitForTimeout(1000)
})

// ============================================================================
// Assertion Steps
// ============================================================================

Then('the presign request should be intercepted by MSW', async () => {
  expect(interceptedPresign).toBe(true)
})

Then('the S3 upload should be intercepted by MSW', async () => {
  expect(interceptedS3Upload).toBe(true)
})

Then('I should see a success confirmation', async ({ page }) => {
  // Look for success indicators
  const success = page
    .getByText(/success|added|created/i)
    .or(page.getByRole('alert').filter({ hasText: /success/i }))
    .or(page.getByText(/item added to wishlist/i))
  await expect(success.first()).toBeVisible({ timeout: 10000 })
})

// ============================================================================
// Error Injection Steps
// ============================================================================

Given('the presign endpoint will return a 500 error', async ({ page }) => {
  // Use Playwright route to add error header before MSW processes it
  await page.route('**/api/wishlist/images/presign', async route => {
    const headers = {
      ...route.request().headers(),
      'x-mock-error': '500',
    }
    await route.continue({ headers })
  })

  await page.route('**/api/v2/wishlist/images/presign', async route => {
    const headers = {
      ...route.request().headers(),
      'x-mock-error': '500',
    }
    await route.continue({ headers })
  })
})

Given('the S3 upload will return a 403 error', async ({ page }) => {
  await page.route('**/*.s3.amazonaws.com/**', async route => {
    const headers = {
      ...route.request().headers(),
      'x-mock-error': '403',
    }
    await route.continue({ headers })
  })

  await page.route('**/*.s3.*/**', async route => {
    const headers = {
      ...route.request().headers(),
      'x-mock-error': '403',
    }
    await route.continue({ headers })
  })
})

Then('I should see an upload error message', async ({ page }) => {
  // Look for error indicators
  const error = page
    .getByText(/error|failed|unable/i)
    .or(page.getByRole('alert').filter({ hasText: /error|failed/i }))
    .or(page.getByText(/upload.*failed/i))
  await expect(error.first()).toBeVisible({ timeout: 10000 })
})
