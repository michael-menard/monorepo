import { test, expect } from '@playwright/test'
import { loginAsTestUser } from '../../../utils/login'
import {
  createWishlistItem,
  deleteWishlistItem,
  clearWishlistForCurrentUser,
} from '../../../e2e/wishlist/helpers'

/**
 * Story wish-2007: Wishlist End-to-End Test Suite (Real Environment)
 *
 * Coverage in this file:
 * - Gallery view with real data
 * - Store filters, search, sort using real API
 * - Basic accessibility and performance sanity checks
 */

test.describe('Wishlist gallery - real E2E', () => {
  const createdItemIds: string[] = []

  test.beforeEach(async ({ page }) => {
    // Ensure we start from a clean wishlist for the dedicated test user.
    await loginAsTestUser(page)
    await clearWishlistForCurrentUser(page)
  })

  test.afterEach(async ({ page }) => {
    // Best-effort cleanup of any items that still exist.
    for (const id of createdItemIds) {
      try {
        await deleteWishlistItem(page, id)
      } catch {
        // Ignore cleanup failures
      }
    }
    createdItemIds.length = 0
  })

  test('displays wishlist gallery with items, filters, search and sort using real data', async ({
    page,
  }) => {
    // Arrange: create a small, realistic wishlist dataset via the real API
    const falcon = await createWishlistItem(page, {
      title: 'E2E Millennium Falcon',
      store: 'LEGO',
      setNumber: '75192',
      price: '849.99',
      currency: 'USD',
      pieceCount: 7541,
      tags: ['Star Wars', 'UCS'],
      priority: 5,
    })

    const barweerShip = await createWishlistItem(page, {
      title: 'E2E Imperial Star Destroyer (Barweer)',
      store: 'Barweer',
      setNumber: 'BW-ISD-01',
      price: '159.99',
      currency: 'USD',
      pieceCount: 4784,
      tags: ['Star Wars'],
      priority: 3,
    })

    const castle = await createWishlistItem(page, {
      title: 'E2E Medieval Castle',
      store: 'LEGO',
      setNumber: '10305',
      price: '199.99',
      currency: 'USD',
      pieceCount: 4514,
      tags: ['Castle'],
      priority: 4,
    })

    createdItemIds.push(falcon.id, barweerShip.id, castle.id)

    // Act: open the real wishlist gallery
    const start = Date.now()
    await page.goto('/wishlist')

    // Wait for heading and at least one gallery card
    await expect(page.getByRole('heading', { name: 'Wishlist' })).toBeVisible()

    const cards = page.locator('[data-testid^="wishlist-card-"][data-testid$="-title"]')
    await expect(cards.first()).toBeVisible()

    // Assert: basic accessibility semantics
    await expect(page.getByPlaceholder('Search wishlist...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Item' })).toBeVisible()

    // Assert: store filter tabs exist and work
    const legoTab = page.getByRole('tab', { name: /LEGO/ })
    const barweerTab = page.getByRole('tab', { name: /Barweer/ })
    await expect(legoTab).toBeVisible()
    await expect(barweerTab).toBeVisible()

    // Filter to LEGO only and ensure Barweer item disappears
    await legoTab.click()
    await expect(page.getByText('E2E Imperial Star Destroyer (Barweer)')).toHaveCount(0)
    await expect(page.getByText('E2E Millennium Falcon')).toBeVisible()

    // Filter to Barweer and ensure LEGO items disappear
    await barweerTab.click()
    await expect(page.getByText('E2E Imperial Star Destroyer (Barweer)')).toBeVisible()
    await expect(page.getByText('E2E Millennium Falcon')).toHaveCount(0)

    // Search for "Castle" and ensure only castle item remains
    const searchInput = page.getByPlaceholder('Search wishlist...')
    await searchInput.fill('Castle')
    await searchInput.press('Enter')

    await expect(page.getByText('E2E Medieval Castle')).toBeVisible()
    await expect(page.getByText('E2E Millennium Falcon')).toHaveCount(0)

    // Clear search by clearing input and pressing Enter
    await searchInput.fill('')
    await searchInput.press('Enter')

    // Sort by price low to high and verify ordering for our three items
    const sortCombobox = page.getByRole('combobox')
    await sortCombobox.click()
    await page.getByRole('option', { name: /Price: Low to High/i }).click()

    const orderedTitles = await cards.allTextContents()

    // We only care that the three E2E items appear in ascending price order
    const relevant = orderedTitles.filter(title => title.startsWith('E2E '))
    expect(relevant).toEqual([
      'E2E Imperial Star Destroyer (Barweer)', // 159.99
      'E2E Medieval Castle', // 199.99
      'E2E Millennium Falcon', // 849.99
    ])

    // Performance sanity: initial load for test dataset should be reasonably fast
    const loadDurationMs = Date.now() - start
    expect(loadDurationMs).toBeLessThan(5000)
  })
})
