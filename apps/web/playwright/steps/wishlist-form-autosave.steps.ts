/**
 * Wishlist Form Autosave Step Definitions
 * Story WISH-2015: Form Autosave via RTK Slice with localStorage Persistence
 *
 * Tests the form autosave functionality with localStorage persistence.
 * LIVE MODE ONLY - No MSW mocking for autosave persistence.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ============================================================================
// Navigation Steps
// ============================================================================

Given('I navigate to the add item page', async ({ page }) => {
  await page.goto('/add')
  await page.waitForLoadState('networkidle')
  // Wait for form to render
  await page.waitForSelector('form', { timeout: 10000 })
})

When('I navigate to the add item page', async ({ page }) => {
  await page.goto('/add')
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('form', { timeout: 10000 })
})

// ============================================================================
// Form Input Steps
// ============================================================================

When('I fill in the {string} field with {string}', async ({ page }, fieldLabel: string, value: string) => {
  // Handle different field types
  if (fieldLabel.toLowerCase() === 'store') {
    // Store is a select/combobox
    const storeSelector = page.getByLabel(/store/i).or(page.getByRole('combobox', { name: /store/i }))
    await storeSelector.click()
    // Wait for dropdown to open
    await page.waitForTimeout(300)
    await page.getByRole('option', { name: new RegExp(value, 'i') }).click()
  } else {
    // Text inputs (Title, Set Number, Price, Piece Count, Notes, etc.)
    const input = page.getByLabel(new RegExp(fieldLabel, 'i'))
    await input.fill(value)
  }
})

// ============================================================================
// Autosave Steps
// ============================================================================

When('I wait for the autosave debounce', async ({ page }) => {
  // Wait for debounce (500ms) + buffer (200ms) to ensure localStorage write completes
  await page.waitForTimeout(700)
})

When('I reload the page', async ({ page }) => {
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('form', { timeout: 10000 })
})

// ============================================================================
// Resume Draft Banner Steps
// ============================================================================

Then('I should see the resume draft banner', async ({ page }) => {
  const banner = page.getByTestId('resume-draft-banner')
  await expect(banner).toBeVisible({ timeout: 5000 })
})

Then('I should not see the resume draft banner', async ({ page }) => {
  const banner = page.getByTestId('resume-draft-banner')
  await expect(banner).not.toBeVisible({ timeout: 2000 })
})

When('I click the resume draft button', async ({ page }) => {
  const button = page.getByTestId('resume-draft-button')
  await button.click()
  // Wait for form to populate
  await page.waitForTimeout(500)
})

When('I click the start fresh button', async ({ page }) => {
  const button = page.getByTestId('start-fresh-button')
  await button.click()
  // Wait for draft to clear
  await page.waitForTimeout(300)
})

// ============================================================================
// Form Assertion Steps
// ============================================================================

Then('the {string} field should contain {string}', async ({ page }, fieldLabel: string, expectedValue: string) => {
  if (fieldLabel.toLowerCase() === 'store') {
    // For store selector, check the displayed value in the combobox
    const storeValue = page.getByLabel(/store/i).or(page.getByRole('combobox', { name: /store/i }))
    await expect(storeValue).toHaveText(new RegExp(expectedValue, 'i'))
  } else {
    // For text inputs, check the input value
    const input = page.getByLabel(new RegExp(fieldLabel, 'i'))
    await expect(input).toHaveValue(expectedValue)
  }
})

Then('all form fields should be empty', async ({ page }) => {
  // Check that key fields are empty/default
  const titleInput = page.getByLabel(/title/i)
  await expect(titleInput).toHaveValue('')
  
  // Store selector should be at default (may show placeholder)
  const storeSelector = page.getByLabel(/store/i).or(page.getByRole('combobox', { name: /store/i }))
  const storeText = await storeSelector.textContent()
  // Verify it's either empty or shows placeholder text
  expect(storeText?.toLowerCase()).toMatch(/select.*store|store|^$/i)
})

// ============================================================================
// Form Submission Steps
// ============================================================================

When('I complete and submit the form', async ({ page }) => {
  // Fill any remaining required fields if needed
  // Title and Store should already be filled from draft
  
  // Find and click submit button
  const submitButton = page.getByRole('button', { name: /add to wishlist|submit|save/i })
  await submitButton.click()
})

Then('the form should be submitted successfully', async ({ page }) => {
  // Wait for success indication - could be a toast, redirect, or success message
  // Check for toast first
  const toast = page.getByText(/success|added|created/i)
  const isToastVisible = await toast.isVisible().catch(() => false)
  
  if (isToastVisible) {
    await expect(toast).toBeVisible({ timeout: 5000 })
  } else {
    // Or check for redirect away from /add
    await page.waitForURL(url => !url.pathname.includes('/add'), { timeout: 10000 })
  }
})

// ============================================================================
// localStorage Manipulation Steps (Edge Cases)
// ============================================================================

Given('localStorage contains corrupted draft data', async ({ page }) => {
  // Navigate to the page first to establish context
  await page.goto('/add')
  
  // Get the user ID from auth state in localStorage
  const userId = await page.evaluate(() => {
    // Try to extract user ID from Cognito localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('idToken')) {
        const token = localStorage.getItem(key)
        if (token) {
          try {
            // Parse JWT to get sub (user ID)
            const payload = JSON.parse(atob(token.split('.')[1]))
            return payload.sub
          } catch {
            // Fall back to mock user ID
            return 'test-user-id'
          }
        }
      }
    }
    return 'test-user-id'
  })
  
  // Set corrupted draft data
  await page.evaluate((uid) => {
    const draftKey = `wishlist:draft:${uid}:add-item`
    localStorage.setItem(draftKey, 'invalid-json-data{{{')
  }, userId)
})

Given('localStorage contains a draft older than 7 days', async ({ page }) => {
  // Navigate to the page first
  await page.goto('/add')
  
  // Get the user ID
  const userId = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('idToken')) {
        const token = localStorage.getItem(key)
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            return payload.sub
          } catch {
            return 'test-user-id'
          }
        }
      }
    }
    return 'test-user-id'
  })
  
  // Set expired draft (8 days old)
  await page.evaluate((uid) => {
    const draftKey = `wishlist:draft:${uid}:add-item`
    const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000)
    const expiredDraft = {
      timestamp: eightDaysAgo,
      formData: {
        title: 'Expired Draft',
        store: 'LEGO',
      },
    }
    localStorage.setItem(draftKey, JSON.stringify(expiredDraft))
  }, userId)
})
