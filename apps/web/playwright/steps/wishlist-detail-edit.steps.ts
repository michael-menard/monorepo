/**
 * Wishlist Detail & Edit Step Definitions
 * Story wish-2003: Detail & Edit Pages
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { mockWishlistItems } from '../../main-app/src/test/mocks/wishlist-mocks'

const { Given, When, Then } = createBdd()

// Mutable copy of wishlist items for this file. This is used only for
// expected values in assertions; MSW in the main app controls the
// actual network responses.
let detailItems = mockWishlistItems.map(item => ({ ...item }))

// ---------------------------------------------------------------------------
// Background / API behavior (via MSW)
// ---------------------------------------------------------------------------

Given('the wishlist item API is mocked for detail and update scenarios', async () => {
  // Reset local expectations; do not intercept network requests here.
  detailItems = mockWishlistItems.map(item => ({ ...item }))
})

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

When('I open the wishlist detail page for item {string}', async ({ page }, id: string) => {
  await page.goto(`/wishlist/${id}`)
  // Wait for either skeleton or main content
  await page.waitForSelector('h1, [data-testid="detail-skeleton"]', { timeout: 10000 })
})

When('I open the wishlist detail page for a nonexistent item id', async ({ page }) => {
  await page.goto('/wishlist/nonexistent-id')
  await page.waitForLoadState('networkidle')
})

// ---------------------------------------------------------------------------
// Assertions: detail view
// ---------------------------------------------------------------------------

Then('I should see the wishlist item title, store, and set number', async ({ page }) => {
  const { title, store, setNumber } = detailItems[0]

  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByText(store, { exact: true })).toBeVisible()
  if (setNumber) {
    await expect(page.getByText(new RegExp(`#?${setNumber}`, 'i'))).toBeVisible()
  }
})

Then('I should see the price and currency', async ({ page }) => {
  const item = detailItems[0]
  if (item.price != null) {
    const priceRegex = new RegExp(`${item.price.toFixed(2)}`.replace('.', '\\.'), 'i')
    await expect(page.getByText(priceRegex)).toBeVisible()
  }
})

Then('I should see the piece count', async ({ page }) => {
  const item = detailItems[0]
  if (item.pieceCount != null) {
    const piecesText = new RegExp(`${item.pieceCount.toLocaleString()}.*pieces`, 'i')
    await expect(page.getByText(piecesText)).toBeVisible()
  }
})

Then('I should see the priority label', async ({ page }) => {
  const priorityText = /priority|must have|high priority/i
  await expect(page.getByText(priorityText)).toBeVisible()
})

Then('I should see tags and notes if present', async ({ page }) => {
  const item = detailItems[0]
  if (item.tags.length > 0) {
    for (const tag of item.tags) {
      await expect(page.getByText(tag)).toBeVisible()
    }
  }
  if (item.notes) {
    await expect(page.getByText(item.notes)).toBeVisible()
  }
})

Then('I should see the primary image or a fallback image', async ({ page }) => {
  const image = page.locator('img[alt][src]')
  await expect(image.first()).toBeVisible()
})

Then('I should be on the wishlist detail page for "Millennium Falcon"', async ({ page }) => {
  await page.waitForURL(/\/wishlist\//, { timeout: 10000 })
  await expect(page.getByRole('heading', { name: /millennium falcon/i })).toBeVisible()
})

Then('the detail page should display the same title and store', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /millennium falcon/i })).toBeVisible()
  await expect(page.getByText(/lego/i)).toBeVisible()
})

Then('I should see a not found message for the wishlist item', async ({ page }) => {
  const notFound = page.getByText(/not found|cannot find this wishlist item/i)
  await expect(notFound).toBeVisible()
})

Then('I should see an action to return to the wishlist gallery', async ({ page }) => {
  const button = page.getByRole('button', { name: /back to wishlist|return to wishlist/i })
  await expect(button).toBeVisible()
})

// ---------------------------------------------------------------------------
// Edit flows
// ---------------------------------------------------------------------------

When('I click the "Edit" button on the detail page', async ({ page }) => {
  const edit = page.getByRole('button', { name: /edit/i })
  await edit.click()
})

Then('I should be on the edit wishlist item page', async ({ page }) => {
  await page.waitForURL(/\/wishlist\/.+\/edit/, { timeout: 10000 })
  const heading = page.getByRole('heading', { name: /edit wishlist item/i })
  await expect(heading).toBeVisible()
})

Then('the edit form should be pre-populated with the existing item data', async ({ page }) => {
  const item = detailItems[1] ?? detailItems[0]
  await expect(page.getByLabel(/title/i)).toHaveValue(item.title)
  await expect(page.getByLabel(/store/i)).toHaveText(new RegExp(item.store, 'i'))
})

When('I change the title and price', async ({ page }) => {
  const titleInput = page.getByLabel(/title/i)
  await titleInput.fill('Updated Wishlist Title')

  const priceInput = page.getByLabel(/price/i)
  if (await priceInput.isVisible().catch(() => false)) {
    await priceInput.fill('123.45')
  }
})

When('I clear the required title field', async ({ page }) => {
  const titleInput = page.getByLabel(/title/i)
  await titleInput.fill('')
})

When('I submit the edit form', async ({ page }) => {
  const saveButton = page.getByRole('button', { name: /save changes|save/i })
  await saveButton.click()
})

Then('I should see a success toast for updating the wishlist item', async ({ page }) => {
  const toast = page.getByText(/wishlist item updated|success/i)
  await expect(toast.first()).toBeVisible({ timeout: 10000 })
})

Then('the updated title and price should be visible', async ({ page }) => {
  await page.waitForURL(/\/wishlist\//, { timeout: 10000 })
  await expect(page.getByRole('heading', { name: /updated wishlist title/i })).toBeVisible()
  const priceText = page.getByText(/123\.45/) // rough check
  await expect(priceText.first()).toBeVisible()
})

Then('I should see a validation error for the title field', async ({ page }) => {
  const error = page.getByText(/title.*required/i)
  await expect(error).toBeVisible()
})

When('I remove the existing wishlist image', async ({ page }) => {
  const remove = page.getByRole('button', { name: /remove image|remove/i })
  await remove.click()
})

Then('the detail page should show the image fallback', async ({ page }) => {
  await page.waitForURL(/\/wishlist\//, { timeout: 10000 })
  const placeholder = page.locator('svg, [data-testid="image-fallback"]')
  await expect(placeholder.first()).toBeVisible()
})

When('I upload a new image', async ({ page }) => {
  const fileInput = page.locator('input[type="file"][accept^="image/"]')
  await fileInput.setInputFiles('tests/fixtures/wishlist-image.png')
})

Then('the detail page should show the new wishlist image', async ({ page }) => {
  await page.waitForURL(/\/wishlist\//, { timeout: 10000 })
  const img = page.locator('img[alt][src]')
  await expect(img.first()).toBeVisible()
})

When('I change the title field', async ({ page }) => {
  const titleInput = page.getByLabel(/title/i)
  await titleInput.fill('Should Not Persist Title')
})

When('I click the "Cancel" button on the edit form', async ({ page }) => {
  const cancel = page.getByRole('button', { name: /cancel/i })
  await cancel.click()
})

Then('the original title should still be visible', async ({ page }) => {
  const originalTitle = detailItems.find(i => i.id === 'wish-004')?.title ?? detailItems[0].title
  await expect(page.getByRole('heading', { name: new RegExp(originalTitle, 'i') })).toBeVisible()
})
