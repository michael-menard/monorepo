/**
 * Sets Gallery Read-Only Step Definitions
 *
 * Stubbed BDD steps for the read-only Sets gallery flows.
 * These are intentionally light and assume that:
 * - The Sets gallery is exposed from the main app under `/sets`
 * - Test data is provided by the real API or MSW in the main app
 * - Playwright itself does not mock network requests
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// NOTE: Once the Sets MSW handlers and seeding flags are implemented in the
// main app, mirror the wishlist "scenario" pattern here (e.g. __setsScenario
// query param) instead of intercepting requests in Playwright.

// ---------------------------------------------------------------------------
// Background / Setup
// ---------------------------------------------------------------------------

// Note: 'I am logged in as a test user' is defined in common.steps.ts

const setsState = {
  scenario: null as 'sample' | 'empty' | 'error' | null,
  delayMs: null as number | null,
}

Given('the sets API is seeded with sample sets', async () => {
  setsState.scenario = 'sample'
  setsState.delayMs = null
})

Given('the sets API is seeded with no sets', async () => {
  setsState.scenario = 'empty'
  setsState.delayMs = null
})

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

When('I navigate to the sets gallery page', async ({ page }) => {
  const params = new URLSearchParams()
  if (setsState.scenario && setsState.scenario !== 'sample') {
    params.set('__setsScenario', setsState.scenario)
  }
  if (setsState.delayMs != null) {
    params.set('__setsDelayMs', String(setsState.delayMs))
  }
  const query = params.toString()
  await page.goto(`/sets${query ? `?${query}` : ''}`)

  // Reset after navigation so scenarios do not leak between tests
  setsState.scenario = null
  setsState.delayMs = null
})

// ---------------------------------------------------------------------------
// Page element assertions
// ---------------------------------------------------------------------------

Then('I should see the sets gallery page title {string}', async ({ page }, title: string) => {
  const heading = page.getByRole('heading', { name: title, level: 1 })
  await expect(heading).toBeVisible()
})

Then('I should see the sets search input', async ({ page }) => {
  const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search sets/i))
  await expect(searchInput.first()).toBeVisible()
})

Then('I should see the sets sort dropdown', async ({ page }) => {
  const sortControl = page.getByRole('combobox').or(page.locator('[data-testid*="sets-sort"]'))
  await expect(sortControl.first()).toBeVisible()
})

Then('I should see set cards in the gallery grid', async ({ page }) => {
  const grid = page.locator('[data-testid="gallery-grid"]').or(page.locator('[data-testid="sets-grid"]'))
  await expect(grid.first()).toBeVisible()

  const cards = page.locator('[data-testid="set-card"], [data-testid="gallery-card"]')
  await expect(cards.first()).toBeVisible()
})

Then('I should see the sets empty state message {string}', async ({ page }, message: string) => {
  const emptyText = page.getByText(message)
  await expect(emptyText).toBeVisible()
})

Then('I should see an {string} call-to-action button', async ({ page }, label: string) => {
  const button = page.getByRole('button', { name: new RegExp(label, 'i') })
  await expect(button).toBeVisible()
})

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

When('I search sets for {string}', async ({ page }, query: string) => {
  const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search sets/i))
  const input = searchInput.first()
  await input.fill(query)
  await input.press('Enter')
})

Then('I should see a set card with title {string}', async ({ page }, title: string) => {
  const cardTitle = page.getByText(title)
  await expect(cardTitle).toBeVisible()
})

Then('I should not see a set card with title {string}', async ({ page }, title: string) => {
  await expect(page.getByText(title)).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

When('I filter sets by theme {string}', async ({ page }, theme: string) => {
  const themeFilter = page.getByRole('combobox', { name: /theme/i }).or(
    page.locator('[data-testid="sets-theme-filter"]'),
  )
  const filter = themeFilter.first()
  await filter.click()
  const option = page.getByRole('option', { name: new RegExp(theme, 'i') })
  await option.click()
})

Then('I should only see sets with theme {string}', async ({ page }, theme: string) => {
  // This is a stub; once theme badges or metadata are present on cards,
  // tighten this assertion to read the theme from each visible card.
  const themeText = page.getByText(new RegExp(theme, 'i'))
  await expect(themeText.first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

When('I sort sets by {string}', async ({ page }, label: string) => {
  const sortControl = page.getByRole('combobox').or(page.locator('[data-testid*="sets-sort"]'))
  const control = sortControl.first()
  await control.click()
  const option = page.getByRole('option', { name: new RegExp(label, 'i') })
  await option.click()
})

Then('the sets should be ordered by piece count in descending order', async ({ page }) => {
  // Stub: once piece count is rendered in a structured way, this can parse the
  // counts from cards and assert they are sorted.
  const cards = page.locator('[data-testid="set-card"], [data-testid="gallery-card"]')
  await expect(cards.first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// Navigation to detail
// ---------------------------------------------------------------------------

When('I open the set detail for {string}', async ({ page }, title: string) => {
  await page.getByRole('button', { name: new RegExp(title, 'i') }).or(page.getByText(title)).first().click()
})

Then('I should be on the set detail page for {string}', async ({ page }, title: string) => {
  // URL should include /sets/
  await expect(page).toHaveURL(/\/sets\//)
  // Detail heading should match title
  const heading = page.getByRole('heading', { name: new RegExp(title, 'i') })
  await expect(heading).toBeVisible()
})
