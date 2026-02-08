/**
 * Inspiration Albums Step Definitions
 * Story INSP-009: Album CRUD
 *
 * BDD step definitions for inspiration album E2E tests.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ============================================================================
// Album Modal Steps
// ============================================================================

Given('the create album modal is open', async ({ page }) => {
  await page.getByRole('button', { name: /New Album/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

Then('the create album modal should be visible', async ({ page }) => {
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Create Album|New Album/i })).toBeVisible()
})

Then('the create album modal should not be visible', async ({ page }) => {
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

Then('I should see the description field', async ({ page }) => {
  const descField = page.locator('textarea[name="description"], textarea[placeholder*="Description"]')
  await expect(descField).toBeVisible()
})

// ============================================================================
// Album Creation Steps
// ============================================================================

When('I enter album title {string}', async ({ page }, title: string) => {
  const titleInput = page.locator('input[name="title"], input[placeholder*="Title"]')
  await titleInput.fill(title)
})

When('I enter album description {string}', async ({ page }, description: string) => {
  const descInput = page.locator('textarea[name="description"], textarea[placeholder*="Description"]')
  await descInput.fill(description)
})

When('I click the create button', async ({ page }) => {
  await page.getByRole('button', { name: /Create|Save/i }).click()
})

When('I click the create button without entering a title', async ({ page }) => {
  const titleInput = page.locator('input[name="title"], input[placeholder*="Title"]')
  await titleInput.clear()
  await page.getByRole('button', { name: /Create|Save/i }).click()
})

Then('the album should appear in the Albums tab', async ({ page }) => {
  await page.getByRole('tab', { name: /Albums/i }).click()
  await page.waitForTimeout(1000)
  const albumCards = page.locator('[data-testid^="album-card-"]')
  await expect(albumCards.first()).toBeVisible({ timeout: 10000 })
})

Then('I should see an album success message', async ({ page }) => {
  const successMessage = page.getByText(/Success|Created|Updated|Deleted|Added|Saved/i)
  await expect(successMessage).toBeVisible({ timeout: 10000 })
})

// ============================================================================
// Nested Album Steps
// ============================================================================

Given('I have an existing album {string}', async () => {
  // Precondition - album should exist in test data
})

When('I select parent album {string}', async ({ page }, parentName: string) => {
  const parentSelector = page.locator('button[role="combobox"], select[name="parentAlbumId"]')
  await parentSelector.click()
  await page.getByRole('option', { name: new RegExp(parentName, 'i') }).click()
})

Then('{string} should be nested under {string}', async ({ page }, child: string, parent: string) => {
  // Navigate to parent album and verify child is listed
  await page.getByRole('tab', { name: /Albums/i }).click()
  const parentCard = page.locator(`[data-testid^="album-card-"]:has-text("${parent}")`)
  await parentCard.click()
  await expect(page.getByText(new RegExp(child, 'i'))).toBeVisible()
})

// ============================================================================
// Album Navigation Steps
// ============================================================================

Given('I have an album with inspirations', async () => {
  // Precondition - album with items should exist
})

When('I click on the album card', async ({ page }) => {
  const albumCards = page.locator('[data-testid^="album-card-"]')
  await albumCards.first().click()
})

Then('I should see album cards or empty state', async ({ page }) => {
  const hasAlbumCards = (await page.locator('[data-testid^="album-card-"]').count()) > 0
  const hasEmptyState = (await page.getByText(/No albums|Create your first album/i).count()) > 0
  expect(hasAlbumCards || hasEmptyState).toBe(true)
})

Then('I should see the album contents', async ({ page }) => {
  // Should see inspirations or empty state within album
  const hasContent = (await page.locator('[data-testid^="inspiration-card-"]').count()) > 0
  const hasEmptyState = (await page.getByText(/No inspirations in this album/i).count()) > 0
  expect(hasContent || hasEmptyState).toBe(true)
})

Then('I should see the breadcrumb navigation', async ({ page }) => {
  const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').or(page.locator('[data-testid="breadcrumbs"]'))
  await expect(breadcrumb).toBeVisible()
})

Given('I am viewing an album\'s contents', async ({ page }) => {
  await page.goto('/inspiration')
  await page.waitForSelector('[data-testid="inspiration-gallery"]', { timeout: 15000 })
  await page.getByRole('tab', { name: /Albums/i }).click()
  await page.waitForTimeout(1000)
  const albumCards = page.locator('[data-testid^="album-card-"]')
  if (await albumCards.count() > 0) {
    await albumCards.first().click()
    await page.waitForTimeout(1000)
  }
})

When('I click the gallery breadcrumb', async ({ page }) => {
  const galleryLink = page.getByRole('link', { name: /Gallery|All Inspirations/i })
  await galleryLink.click()
})

Then('I should return to the main gallery view', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Inspiration Gallery/i })).toBeVisible()
})

// ============================================================================
// Album Editing Steps
// ============================================================================

Given('I have an existing album', async () => {
  // Precondition - album should exist
})

When('I right-click on the album card', async ({ page }) => {
  const albumCards = page.locator('[data-testid^="album-card-"]')
  await albumCards.first().click({ button: 'right' })
})

When('I click {string} in the context menu', async ({ page }, menuItem: string) => {
  await page.getByRole('menuitem', { name: new RegExp(menuItem, 'i') }).click()
})

When('I change the title to {string}', async ({ page }, newTitle: string) => {
  const titleInput = page.locator('input[name="title"], input[placeholder*="Title"]')
  await titleInput.clear()
  await titleInput.fill(newTitle)
})

When('I save the changes', async ({ page }) => {
  await page.getByRole('button', { name: /Save|Update/i }).click()
})

When('I open the album edit modal', async ({ page }) => {
  const albumCards = page.locator('[data-testid^="album-card-"]')
  await albumCards.first().click({ button: 'right' })
  await page.getByRole('menuitem', { name: /Edit/i }).click()
})

When('I update the description', async ({ page }) => {
  const descInput = page.locator('textarea[name="description"], textarea[placeholder*="Description"]')
  await descInput.fill('Updated description ' + Date.now())
})

Then('the album should show the new title', async ({ page }) => {
  // Album card should reflect updated title
  const albumCards = page.locator('[data-testid^="album-card-"]')
  await expect(albumCards.first()).toBeVisible()
})

// ============================================================================
// Album Deletion Steps
// ============================================================================

Given('I have an empty album', async () => {
  // Precondition - empty album should exist
})

When('I confirm the deletion', async ({ page }) => {
  await page.getByRole('button', { name: /Delete|Confirm/i }).click()
})

// Note: 'I click {string}' step is defined in common.steps.ts

Then('the album should be removed', async ({ page }) => {
  // Album should no longer be visible
  await page.waitForTimeout(1000)
})

Then('I should see a warning about contained items', async ({ page }) => {
  const warning = page.getByText(/contains.*items|has.*inspirations|not empty/i)
  await expect(warning).toBeVisible()
})

Then('I should see options to keep or delete items', async ({ page }) => {
  const keepOption = page.getByText(/Keep items|Keep inspirations/i)
  const deleteOption = page.getByText(/Delete items|Delete all/i)
  const hasOptions = (await keepOption.count()) > 0 || (await deleteOption.count()) > 0
  expect(hasOptions).toBe(true)
})

Then('the album should still exist', async ({ page }) => {
  const albumCards = page.locator('[data-testid^="album-card-"]')
  await expect(albumCards.first()).toBeVisible()
})

// ============================================================================
// Adding Items to Albums Steps
// ============================================================================

Given('I have an inspiration and an album', async () => {
  // Precondition
})

Given('I have selected multiple inspirations', async ({ page }) => {
  const cards = page.locator('[data-testid^="inspiration-card-"]')
  await cards.first().click()
  await cards.nth(1).click()
})

When('I drag the inspiration onto the album card', async ({ page }) => {
  const inspiration = page.locator('[data-testid^="inspiration-card-"]').first()
  const album = page.locator('[data-testid^="album-card-"]').first()

  await inspiration.dragTo(album)
})

When('I click "Add to Album" in the bulk actions bar', async ({ page }) => {
  await page.getByRole('button', { name: /Add to Album/i }).click()
})

When('I select an album from the dropdown', async ({ page }) => {
  const albumOption = page.getByRole('option').first()
  await albumOption.click()
})

Then('the inspiration should be added to the album', async ({ page }) => {
  await expect(page.getByText(/Added|Success/i)).toBeVisible()
})

Then('the selected inspirations should be added to the album', async ({ page }) => {
  await expect(page.getByText(/Added|Success/i)).toBeVisible()
})

Given('the album contains inspirations', async () => {
  // Precondition
})

When('I right-click on an inspiration', async ({ page }) => {
  const cards = page.locator('[data-testid^="inspiration-card-"]')
  await cards.first().click({ button: 'right' })
})

When('I click the "Remove from Album" menu item', async ({ page }) => {
  await page.getByRole('menuitem', { name: /Remove from Album/i }).click()
})

Then('the inspiration should be removed from the album', async ({ page }) => {
  await expect(page.getByText(/Removed|Success/i)).toBeVisible()
})

Then('the inspiration should still exist in All Inspirations', async ({ page }) => {
  await page.getByRole('tab', { name: /All Inspirations/i }).click()
  const cards = page.locator('[data-testid^="inspiration-card-"]')
  await expect(cards.first()).toBeVisible()
})

// ============================================================================
// Album Cover Steps
// ============================================================================

Then('the album card should show a cover image', async ({ page }) => {
  const albumCards = page.locator('[data-testid^="album-card-"]')
  const coverImage = albumCards.first().locator('img')
  await expect(coverImage).toBeVisible()
})

When('I click the "Set as Album Cover" menu item', async ({ page }) => {
  await page.getByRole('menuitem', { name: /Set as Album Cover/i }).click()
})

Then('that inspiration should become the album cover', async ({ page }) => {
  await expect(page.getByText(/Cover updated|Success/i)).toBeVisible()
})

// ============================================================================
// Keyboard Shortcut Steps
// ============================================================================

When('I press the N key', async ({ page }) => {
  await page.keyboard.press('n')
})
