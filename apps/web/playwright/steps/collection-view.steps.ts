/**
 * Collection View Step Definitions
 * Story SETS-MVP-002: Collection View
 *
 * BDD step definitions for collection E2E tests.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ============================================================================
// Setup Steps
// ============================================================================

Given('I have {int} owned items in my collection', async ({ page }, count: number) => {
  // Set up collection state with owned items
  await page.route('**/api/wishlist*', route => {
    const url = new URL(route.request().url())
    const status = url.searchParams.get('status')
    
    if (status === 'owned') {
      const items = Array.from({ length: count }, (_, i) => ({
        id: `owned-${i + 1}`,
        userId: 'test-user',
        title: `Set ${i + 1}`,
        setNumber: `7500${i + 1}`,
        store: 'LEGO',
        imageUrl: `https://example.com/set-${i + 1}.jpg`,
        imageVariants: null,
        price: '99.99',
        currency: 'USD',
        pieceCount: 1000 + i * 100,
        priority: 5,
        tags: ['test'],
        sortOrder: i + 1,
        status: 'owned',
        statusChangedAt: new Date().toISOString(),
        purchaseDate: new Date().toISOString(),
        purchasePrice: '99.99',
        purchaseStore: 'LEGO',
        buildStatus: 'in_progress',
        notes: null,
        releaseDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items,
          pagination: {
            page: 1,
            limit: 100,
            total: count,
            totalPages: 1,
            hasMore: false,
          },
        }),
      })
    } else {
      route.continue()
    }
  })
})

Given('I have {int} owned items', async ({ page }, count: number) => {
  // Alias for consistency
  await Given('I have {int} owned items in my collection', { page }, count)
})

Given('I have {int} owned items from {string} store', async ({ page }, count: number, store: string) => {
  await page.route('**/api/wishlist*', route => {
    const url = new URL(route.request().url())
    const status = url.searchParams.get('status')
    const filterStore = url.searchParams.get('store')
    
    if (status === 'owned') {
      const allItems = Array.from({ length: count }, (_, i) => ({
        id: `owned-${store}-${i + 1}`,
        userId: 'test-user',
        title: `${store} Set ${i + 1}`,
        setNumber: `${store[0]}${1000 + i}`,
        store,
        imageUrl: `https://example.com/${store}-${i + 1}.jpg`,
        imageVariants: null,
        price: '99.99',
        currency: 'USD',
        pieceCount: 1000,
        priority: 5,
        tags: ['test'],
        sortOrder: i + 1,
        status: 'owned',
        statusChangedAt: new Date().toISOString(),
        purchaseDate: new Date().toISOString(),
        purchasePrice: '99.99',
        purchaseStore: store,
        buildStatus: 'in_progress',
        notes: null,
        releaseDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      const filteredItems = filterStore ? allItems.filter(item => item.store === filterStore) : allItems

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: filteredItems,
          pagination: {
            page: 1,
            limit: 100,
            total: filteredItems.length,
            totalPages: 1,
            hasMore: false,
          },
        }),
      })
    } else {
      route.continue()
    }
  })
})

Given('I have owned items:', async ({ page }, dataTable) => {
  const items = dataTable.hashes().map((row: any, i: number) => ({
    id: `owned-${i + 1}`,
    userId: 'test-user',
    title: row.title,
    setNumber: row.setNumber,
    store: row.store,
    imageUrl: `https://example.com/${row.setNumber}.jpg`,
    imageVariants: null,
    price: '99.99',
    currency: 'USD',
    pieceCount: 1000,
    priority: 5,
    tags: ['test'],
    sortOrder: i + 1,
    status: 'owned',
    statusChangedAt: new Date().toISOString(),
    purchaseDate: new Date().toISOString(),
    purchasePrice: '99.99',
    purchaseStore: row.store,
    buildStatus: 'in_progress',
    notes: null,
    releaseDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  await page.route('**/api/wishlist*', route => {
    const url = new URL(route.request().url())
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search') || url.searchParams.get('q')
    
    if (status === 'owned') {
      let filteredItems = items
      
      if (search) {
        filteredItems = items.filter(item => 
          item.title.toLowerCase().includes(search.toLowerCase())
        )
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: filteredItems,
          pagination: {
            page: 1,
            limit: 100,
            total: filteredItems.length,
            totalPages: 1,
            hasMore: false,
          },
        }),
      })
    } else {
      route.continue()
    }
  })
})

// ============================================================================
// Navigation Steps
// ============================================================================

When('I navigate to {string}', async ({ page }, path: string) => {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
})

When('I am on the {string} page', async ({ page }, path: string) => {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
})

When('I click the {string} button', async ({ page }, buttonText: string) => {
  const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') })
    .or(page.getByRole('link', { name: new RegExp(buttonText, 'i') }))
  await button.click()
  await page.waitForLoadState('networkidle')
})

When('I click on the {string} link in the sidebar', async ({ page }, linkText: string) => {
  const link = page.getByRole('link', { name: new RegExp(linkText, 'i') })
  await link.click()
  await page.waitForLoadState('networkidle')
})

When('I filter by store {string}', async ({ page }, store: string) => {
  // Implement store filtering - depends on UI implementation
  const storeFilter = page.getByRole('combobox', { name: /store/i })
    .or(page.locator('[data-testid="store-filter"]'))
  await storeFilter.selectOption(store)
  await page.waitForLoadState('networkidle')
})

When('I search for {string}', async ({ page }, searchTerm: string) => {
  const searchInput = page.getByPlaceholder(/search/i)
  await searchInput.fill(searchTerm)
  await page.waitForLoadState('networkidle')
})

// ============================================================================
// Assertion Steps
// ============================================================================

Then('I should see the page heading {string}', async ({ page }, heading: string) => {
  const headingElement = page.getByRole('heading', { name: new RegExp(heading, 'i') })
  await expect(headingElement).toBeVisible()
})

Then('I should see {int} collection cards', async ({ page }, count: number) => {
  const cards = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]')
  await expect(cards).toHaveCount(count)
})

Then('the cards should be displayed in a grid layout', async ({ page }) => {
  const grid = page.locator('[data-testid="gallery-grid"]')
    .or(page.locator('.grid'))
  await expect(grid).toBeVisible()
})

Then('I should see the empty state message {string}', async ({ page }, message: string) => {
  const emptyState = page.getByText(new RegExp(message, 'i'))
  await expect(emptyState).toBeVisible()
})

Then('I should see a call-to-action button {string}', async ({ page }, buttonText: string) => {
  const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') })
    .or(page.getByRole('link', { name: new RegExp(buttonText, 'i') }))
  await expect(button).toBeVisible()
})

Then('I should be redirected to {string}', async ({ page }, path: string) => {
  await page.waitForURL(`**${path}`)
  expect(page.url()).toContain(path)
})

Then('I should see the item {string}', async ({ page }, itemTitle: string) => {
  const item = page.getByText(itemTitle)
  await expect(item).toBeVisible()
})

Then('I should see the navigation menu', async ({ page }) => {
  const nav = page.getByRole('navigation')
    .or(page.locator('[role="navigation"]'))
  await expect(nav.first()).toBeVisible()
})

Then('I should be on the {string} page', async ({ page }, path: string) => {
  await page.waitForURL(`**${path}`)
  expect(page.url()).toContain(path)
})
