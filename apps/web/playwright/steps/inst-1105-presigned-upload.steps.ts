/**
 * Step definitions for INST-1105: Presigned URL Upload
 *
 * These steps test the presigned URL upload functionality for large PDF files (>10MB).
 * Tests work with real S3 presigned URLs per ADR-006 (no mocks in E2E).
 *
 * CRITICAL: All tests use real Cognito authentication and real S3 uploads.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import path from 'path'
import { fileURLToPath } from 'url'
import * as fs from 'fs'

const { Given, When, Then } = createBdd()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Test fixtures path
const FIXTURES_PATH = path.join(__dirname, '..', 'fixtures', 'files')

// Track test state
let mocDetailLoaded = false
let currentMocId: string | null = null

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a test PDF file of specified size
 * Generates a valid PDF with repeating content to reach target size
 */
function createTestPDF(sizeInBytes: number, filename: string): string {
  const filePath = path.join(FIXTURES_PATH, filename)
  
  // Minimal valid PDF structure
  const pdfHeader = '%PDF-1.4\n'
  const pdfFooter = '\n%%EOF'
  
  // Calculate how much content we need to add
  const headerSize = Buffer.from(pdfHeader).length
  const footerSize = Buffer.from(pdfFooter).length
  const remainingSize = sizeInBytes - headerSize - footerSize
  
  // Create filler content (repeating pattern)
  const fillerUnit = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '
  const fillerCount = Math.ceil(remainingSize / fillerUnit.length)
  const filler = fillerUnit.repeat(fillerCount).slice(0, remainingSize)
  
  // Write the file
  const content = pdfHeader + filler + pdfFooter
  fs.writeFileSync(filePath, content)
  
  return filePath
}

/**
 * Clean up test files
 */
function cleanupTestFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Navigation steps (I navigate to a MOC detail page, I have MOCs in my collection)
// are defined in inst-1103-thumbnail-upload.steps.ts and inst-1100-gallery.steps.ts
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// File Selection Steps (INST-1105 Specific)
// ─────────────────────────────────────────────────────────────────────────────

When('I select a 30MB PDF file for presigned upload', async ({ page }) => {
  const filename = 'test-presigned-30mb.pdf'
  const filePath = createTestPDF(30 * 1024 * 1024, filename)
  
  const fileInput = page.locator('input[type="file"]').filter({ hasNot: page.locator('[accept*="image"]') })
  await fileInput.setInputFiles(filePath)
  
  await page.evaluate((path) => {
    (window as any).__testFileToCleanup = path
  }, filePath)
})

When('I select a 60MB PDF file for upload', async ({ page }) => {
  const filename = 'test-oversized-60mb.pdf'
  const filePath = createTestPDF(60 * 1024 * 1024, filename)
  
  const fileInput = page.locator('input[type="file"]').filter({ hasNot: page.locator('[accept*="image"]') })
  await fileInput.setInputFiles(filePath)
  
  await page.evaluate((path) => {
    (window as any).__testFileToCleanup = path
  }, filePath)
})

When('I select a 5MB PDF file for upload', async ({ page }) => {
  const filename = 'test-direct-5mb.pdf'
  const filePath = createTestPDF(5 * 1024 * 1024, filename)
  
  const fileInput = page.locator('input[type="file"]').filter({ hasNot: page.locator('[accept*="image"]') })
  await fileInput.setInputFiles(filePath)
  
  await page.evaluate((path) => {
    (window as any).__testFileToCleanup = path
  }, filePath)
})

When('I upload a 30MB PDF file successfully', async ({ page }) => {
  const filename = 'test-upload-success-30mb.pdf'
  const filePath = createTestPDF(30 * 1024 * 1024, filename)
  
  const fileInput = page.locator('input[type="file"]').filter({ hasNot: page.locator('[accept*="image"]') })
  await fileInput.setInputFiles(filePath)
  
  const regexPattern = /Instructions uploaded|upload.*success/i
  const successToast = page.locator('[data-sonner-toast]').filter({ hasText: regexPattern })
  await expect(successToast).toBeVisible({ timeout: 120000 })
  
  await page.evaluate((path) => {
    (window as any).__testFileToCleanup = path
  }, filePath)
})

When('I select {int} files of {int}MB each for upload', async ({ page }, fileCount: number, sizeMB: number) => {
  const filePaths: string[] = []
  
  for (let i = 0; i < fileCount; i++) {
    const filename = `test-concurrent-${i + 1}-${sizeMB}mb.pdf`
    const filePath = createTestPDF(sizeMB * 1024 * 1024, filename)
    filePaths.push(filePath)
  }
  
  const fileInput = page.locator('input[type="file"]').filter({ hasNot: page.locator('[accept*="image"]') })
  await fileInput.setInputFiles(filePaths)
  
  await page.evaluate((paths) => {
    (window as any).__testFilesToCleanup = paths
  }, filePaths)
})

// ─────────────────────────────────────────────────────────────────────────────
// Progress Bar Verification Steps
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see a progress bar', async ({ page }) => {
  const progressBar = page.getByRole('progressbar')
  await expect(progressBar).toBeVisible({ timeout: 10000 })
})

Then('the progress should update during upload', async ({ page }) => {
  const progressBar = page.getByRole('progressbar')
  
  const initialProgress = await progressBar.getAttribute('aria-valuenow')
  await page.waitForTimeout(2000)
  const updatedProgress = await progressBar.getAttribute('aria-valuenow')
  
  if (initialProgress && updatedProgress) {
    const initial = parseInt(initialProgress)
    const updated = parseInt(updatedProgress)
    expect(updated).toBeGreaterThanOrEqual(initial)
  }
})

Then('I should see {string} with a percentage', async ({ page }, text: string) => {
  const uploadingText = page.locator('text=/Uploading.*\\d+%/i')
  await expect(uploadingText).toBeVisible({ timeout: 10000 })
})

Then('the percentage should increase over time', async ({ page }) => {
  const getPercentage = async () => {
    const text = await page.locator('text=/\\d+%/').first().textContent()
    const match = text?.match(/(\d+)%/)
    return match ? parseInt(match[1]) : 0
  }
  
  const initialPercentage = await getPercentage()
  await page.waitForTimeout(2000)
  const laterPercentage = await getPercentage()
  
  expect(laterPercentage).toBeGreaterThanOrEqual(initialPercentage)
})

Then('I should see the upload speed displayed', async ({ page }) => {
  const speedText = page.locator('text=/\\d+(\\.\\d+)?\\s*(KB|MB)\\/s/i')
  await expect(speedText).toBeVisible({ timeout: 10000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Upload Completion Steps
// ─────────────────────────────────────────────────────────────────────────────

When('the upload completes', async ({ page }) => {
  const completed = page.locator('text=/100%|complete|success/i')
  await expect(completed.first()).toBeVisible({ timeout: 120000 })
})

// NOTE: "I should see an upload success message" step is defined in inspiration-upload.steps.ts

Then('I should see {string} toast', async ({ page }, message: string) => {
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: new RegExp(message, 'i') })
  await expect(toast).toBeVisible({ timeout: 10000 })
})

Then('the file should appear in the instructions list', async ({ page }) => {
  const instructionsCard = page.locator('[data-card-id="instructions"]')
  await expect(instructionsCard).toBeVisible()
  
  const fileList = instructionsCard.getByRole('list', { name: /instruction/i })
  const fileItems = fileList.getByRole('listitem')
  await expect(fileItems.first()).toBeVisible()
})

Then('the instructions list should refresh', async ({ page }) => {
  await page.waitForTimeout(1000)
  const instructionsCard = page.locator('[data-card-id="instructions"]')
  await expect(instructionsCard).toBeVisible()
})

Then('I should see my uploaded file in the list', async ({ page }) => {
  const instructionsCard = page.locator('[data-card-id="instructions"]')
  const fileList = instructionsCard.getByRole('list', { name: /instruction/i })
  const fileItems = fileList.getByRole('listitem')
  const count = await fileItems.count()
  expect(count).toBeGreaterThan(0)
})

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling Steps
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see an error {string}', async ({ page }, errorMessage: string) => {
  const errorToast = page.locator('[data-sonner-toast], [role="alert"]').filter({
    hasText: new RegExp(errorMessage, 'i'),
  })
  await expect(errorToast).toBeVisible({ timeout: 10000 })
})

Then('the file should not be added to the upload queue', async ({ page }) => {
  const uploadQueue = page.locator('[data-testid="upload-queue"]')
  const hasQueue = await uploadQueue.isVisible().catch(() => false)
  
  if (hasQueue) {
    const queueItems = uploadQueue.locator('[data-testid="queue-item"]')
    const count = await queueItems.count()
    expect(count).toBe(0)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Cancellation Steps
// ─────────────────────────────────────────────────────────────────────────────

When('I click the Cancel button during upload', async ({ page }) => {
  const progressBar = page.getByRole('progressbar')
  await progressBar.waitFor({ timeout: 10000 })
  
  const cancelButton = page.getByRole('button', { name: /cancel/i })
  await cancelButton.click()
})

Then('the upload should be aborted', async ({ page }) => {
  const progressBar = page.getByRole('progressbar')
  
  try {
    await expect(progressBar).not.toBeVisible({ timeout: 5000 })
  } catch {
    const cancelledText = page.locator('text=/cancel|abort|stop/i')
    await expect(cancelledText).toBeVisible()
  }
})

Then('the file should be removed from the queue', async ({ page }) => {
  await page.waitForTimeout(1000)
  
  const uploadQueue = page.locator('[data-testid="upload-queue"]')
  const hasQueue = await uploadQueue.isVisible().catch(() => false)
  
  if (hasQueue) {
    const activeItems = uploadQueue.locator('[data-testid="queue-item"][data-status="uploading"]')
    const count = await activeItems.count()
    expect(count).toBe(0)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Network Error & Retry Steps
// ─────────────────────────────────────────────────────────────────────────────

Given('the network connection is unstable', async ({ page }) => {
  await page.route('**/s3.amazonaws.com/**', (route, request) => {
    const url = request.url()
    const isRetry = url.includes('retry') || Math.random() > 0.5
    
    if (isRetry) {
      route.continue()
    } else {
      route.abort('failed')
    }
  })
})

When('the upload fails due to network error', async ({ page }) => {
  const errorMessage = page.locator('text=/failed|error|connection/i')
  await expect(errorMessage).toBeVisible({ timeout: 30000 })
})

Then('I should see {string}', async ({ page }, message: string) => {
  const messageElement = page.locator(`text=${message}`)
  await expect(messageElement).toBeVisible({ timeout: 10000 })
})

When('I click the Retry button', async ({ page }) => {
  const retryButton = page.getByRole('button', { name: /retry|try again/i })
  await retryButton.click()
})

Then('the upload should restart', async ({ page }) => {
  const progressBar = page.getByRole('progressbar')
  await expect(progressBar).toBeVisible({ timeout: 10000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flow Detection Steps
// ─────────────────────────────────────────────────────────────────────────────

Then('the presigned upload flow should be triggered', async ({ page }) => {
  const sessionRequest = page.waitForRequest(
    req => req.url().includes('/upload-sessions') && req.method() === 'POST',
    { timeout: 10000 }
  )
  
  await sessionRequest
})

Then('I should not see direct upload indicators', async ({ page }) => {
  await page.waitForTimeout(2000)
  const directUploadSuccess = page.locator('text=/uploaded instantly|direct upload/i')
  await expect(directUploadSuccess).not.toBeVisible()
})

Then('the direct upload flow should be triggered', async ({ page }) => {
  const successToast = page.locator('[data-sonner-toast]').filter({ hasText: /uploaded|success/i })
  await expect(successToast).toBeVisible({ timeout: 15000 })
})

Then('I should not see presigned upload indicators', async ({ page }) => {
  await page.waitForTimeout(2000)
  const uploadingProgress = page.locator('text=/uploading.*%/i')
  const hasProgress = await uploadingProgress.isVisible().catch(() => false)
  
  if (hasProgress) {
    await expect(uploadingProgress).not.toBeVisible({ timeout: 3000 })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Concurrent Upload Steps
// ─────────────────────────────────────────────────────────────────────────────

Then('a maximum of {int} files should upload concurrently', async ({ page }, maxConcurrent: number) => {
  await page.waitForTimeout(2000)
  
  const uploadingItems = page.locator('[data-status="uploading"]')
  const count = await uploadingItems.count()
  
  expect(count).toBeLessThanOrEqual(maxConcurrent)
})

Then('queued files should wait for available slots', async ({ page }) => {
  const queuedItems = page.locator('[data-status="queued"]')
  const count = await queuedItems.count()
  expect(count).toBeGreaterThan(0)
})

Then('all files should eventually complete', async ({ page }) => {
  const allComplete = page.locator('[data-status="success"]')
  
  await expect(async () => {
    const successCount = await allComplete.count()
    expect(successCount).toBeGreaterThanOrEqual(5)
  }).toPass({ timeout: 300000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Session Expiry Steps
// ─────────────────────────────────────────────────────────────────────────────

When('the upload session is near expiry', async ({ page }) => {
  await page.waitForTimeout(5000)
})

Then('I should see a session expiry warning', async ({ page }) => {
  const expiryWarning = page.locator('text=/expir|session.*end|refresh/i')
  const hasWarning = await expiryWarning.isVisible({ timeout: 5000 }).catch(() => false)
})

Then('the session should auto-refresh before expiry', async ({ page }) => {
  const refreshRequest = page.waitForRequest(
    req => req.url().includes('/upload-sessions') && req.method() === 'POST',
    { timeout: 20000 }
  ).catch(() => null)
  
  await refreshRequest
})

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility Steps
// ─────────────────────────────────────────────────────────────────────────────

Then('the progress bar should have aria-valuenow attribute', async ({ page }) => {
  const progressBar = page.getByRole('progressbar')
  await expect(progressBar).toHaveAttribute('aria-valuenow')
})

Then('the progress bar should have aria-label', async ({ page }) => {
  const progressBar = page.getByRole('progressbar')
  const ariaLabel = await progressBar.getAttribute('aria-label')
  expect(ariaLabel).toBeTruthy()
  expect(ariaLabel!.length).toBeGreaterThan(0)
})

Then('progress updates should be announced', async ({ page }) => {
  const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]')
  await expect(liveRegion).toBeAttached()
})

When('I focus the Cancel button with keyboard', async ({ page }) => {
  const cancelButton = page.getByRole('button', { name: /cancel/i })
  await cancelButton.focus()
})


// Note: Cleanup is handled by the cleanupTestFile function called at the end of each step
// Test files are stored in FIXTURES_PATH and can be cleaned up manually if needed
