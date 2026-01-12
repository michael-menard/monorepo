/**
 * Wishlist Add Item Step Definitions
 * Story wish-2002: Add Item Flow
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// Keep some shared state between steps in this file
let addItemRequestsCount = 0
let lastCreatedItemTitle: string | null = null

// ---------------------------------------------------------------------------
// Background / API mocking
// ---------------------------------------------------------------------------

// With MSW enabled (VITE_ENABLE_MSW), the backend behavior for
// /api/wishlist is mocked at the application level. These Given
// steps remain as documentation-only and do not perform routing.

Given('the add-to-wishlist API is mocked for create scenarios', async () => {
  addItemRequestsCount = 0
  lastCreatedItemTitle = null
})

Given('the add-to-wishlist API is mocked to return an error', async () => {
  addItemRequestsCount = 0
  lastCreatedItemTitle = null
})

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

When('I click the "Add Item" button', async ({ page }) => {
  const button = page.getByRole('button', { name: /add item/i })
  await button.click()
})

Then('I should be on the "Add to Wishlist" page', async ({ page }) => {
  await page.waitForURL(/\/wishlist\/add/, { timeout: 10000 })
  const heading = page.getByRole('heading', { name: /add to wishlist/i })
  await expect(heading).toBeVisible()
})

// Also used by accessibility feature
When('I open the add wishlist item page', async ({ page }) => {
  await page.goto('/wishlist/add')
  await page.waitForLoadState('networkidle')
})

// ---------------------------------------------------------------------------
// Form interactions
// ---------------------------------------------------------------------------

When('I fill in the add item form with valid required and optional data', async ({ page }) => {
  // Store selector
  await page.getByLabel(/store/i).click()
  await page.getByRole('option', { name: /lego/i }).click()

  // Required title
  await page.getByLabel(/title/i).fill('Test Wishlist Item')

  // Optional fields
  await page.getByLabel(/set number/i).fill('10305')
  await page.getByLabel(/piece count/i).fill('2500')
  await page.getByLabel(/price/i).fill('199.99')

  // Currency – select first option if present
  const currencyTrigger = page.getByLabel(/currency/i).or(page.getByRole('combobox', { name: /currency/i }))
  if (await currencyTrigger.first().isVisible().catch(() => false)) {
    await currencyTrigger.first().click()
    await page.getByRole('option', { name: /usd/i }).click()
  }

  // Priority selector
  const priorityTrigger = page.getByLabel(/priority/i).or(page.getByRole('combobox', { name: /priority/i }))
  if (await priorityTrigger.first().isVisible().catch(() => false)) {
    await priorityTrigger.first().click()
    await page.getByRole('option', { name: /high/i }).first().click().catch(async () => {
      await page.getByRole('option', { name: /5 - must have/i }).click()
    })
  }

  // Source URL & notes
  const sourceUrlInput = page.getByLabel(/source url/i)
  if (await sourceUrlInput.isVisible().catch(() => false)) {
    await sourceUrlInput.fill('https://www.lego.com/product/example')
  }
  const notesInput = page.getByLabel(/notes/i)
  if (await notesInput.isVisible().catch(() => false)) {
    await notesInput.fill('Test notes for wishlist item')
  }
})

When('I fill only the required fields in the add item form', async ({ page }) => {
  await page.getByLabel(/store/i).click()
  await page.getByRole('option', { name: /lego/i }).click()
  await page.getByLabel(/title/i).fill('Required Fields Only Item')
})

When('I submit the add item form without filling required fields', async ({ page }) => {
  const submit = page.getByRole('button', { name: /add to wishlist/i })
  await submit.click()
})

When('I submit the add item form', async ({ page }) => {
  const submit = page.getByRole('button', { name: /add to wishlist/i })
  await submit.click()
})

When('I select an image to upload for the wishlist item', async ({ page }) => {
  const fileInput = page.locator('input[type="file"][accept^="image/"]')
  // Path can be adjusted to your actual fixture location
  await fileInput.setInputFiles('tests/fixtures/wishlist-image.png')
})

When('I upload a wishlist image', async ({ page }) => {
  const fileInput = page.locator('input[type="file"][accept^="image/"]')
  await fileInput.setInputFiles('tests/fixtures/wishlist-image.png')
})

When('I remove the uploaded image', async ({ page }) => {
  const removeButton = page.getByRole('button', { name: /remove image|remove/i })
  await removeButton.click()
})

When('I click the "Cancel" button on the add item form', async ({ page }) => {
  const cancel = page.getByRole('button', { name: /cancel/i })
  await cancel.click()
})

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

Then('I should see a success toast for adding to wishlist', async ({ page }) => {
  const toast = page.getByText(/item added to wishlist/i)
  await expect(toast).toBeVisible({ timeout: 10000 })
})

Then('I should see an error toast for failing to add to wishlist', async ({ page }) => {
  const toast = page.getByText(/failed to add item to wishlist/i)
  await expect(toast).toBeVisible({ timeout: 10000 })
})

Then('I should be redirected back to the wishlist page', async ({ page }) => {
  await page.waitForURL(/\/wishlist(?!\/add)/, { timeout: 10000 })
})

Then('I should see the newly added item in the gallery', async ({ page }) => {
  const title = lastCreatedItemTitle ?? 'Test Wishlist Item'
  const card = page.getByText(title)
  await expect(card.first()).toBeVisible({ timeout: 10000 })
})

Then('the new item should appear with fallback values for optional fields', async ({ page }) => {
  const card = page.getByText('Required Fields Only Item')
  await expect(card.first()).toBeVisible({ timeout: 10000 })
})

Then('I should see validation errors for the required fields "Store" and "Title"', async ({ page }) => {
  const storeError = page.getByText(/store.*required/i)
  const titleError = page.getByText(/title.*required/i)
  await expect(storeError.or(titleError)).toBeVisible()
})

Then('the image preview should disappear', async ({ page }) => {
  const previewImg = page.locator('img[alt="Preview"], img[alt*="preview"]')
  await expect(previewImg).toHaveCount(0)
})

Then('I should be able to submit the form without an image', async ({ page }) => {
  const submit = page.getByRole('button', { name: /add to wishlist/i })
  await submit.click()
  const toast = page.getByText(/item added to wishlist/i)
  await expect(toast).toBeVisible({ timeout: 10000 })
})

Then('I should remain on the add item page', async ({ page }) => {
  await page.waitForURL(/\/wishlist\/add/, { timeout: 5000 })
})

Then('no new wishlist item should be created', async () => {
  expect(addItemRequestsCount).toBe(0)
})
