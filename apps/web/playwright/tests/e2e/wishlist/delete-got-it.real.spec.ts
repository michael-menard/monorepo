import { test, expect } from '@playwright/test'
import { loginAsTestUser } from '../../../utils/login'
import {
  createWishlistItem,
  deleteWishlistItem,
  clearWishlistForCurrentUser,
  findWishlistItemsBySearch,
} from '../../../e2e/wishlist/helpers'

/**
 * Story wish-2007: Delete / Got It flows with real wishlist API.
 */

test.describe('Wishlist delete & Got It - real E2E', () => {
  const createdItemIds: string[] = []

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await clearWishlistForCurrentUser(page)
  })

  test.afterEach(async ({ page }) => {
    for (const id of createdItemIds) {
      try {
        await deleteWishlistItem(page, id)
      } catch {
        // ignore
      }
    }
    createdItemIds.length = 0
  })

  test('user can delete a wishlist item from the gallery and it is removed in the backend', async ({
    page,
  }) => {
    const title = `E2E Delete Flow ${Date.now()}`
    const item = await createWishlistItem(page, {
      title,
      store: 'LEGO',
      price: '49.99',
      currency: 'USD',
      priority: 2,
    })
    createdItemIds.push(item.id)

    await page.goto('/wishlist')
    await expect(page.getByRole('heading', { name: 'Wishlist' })).toBeVisible()

    // Open delete confirmation for this specific item using its card test id
    const cardTitle = page.getByTestId(`wishlist-card-${item.id}-title`)
    await expect(cardTitle).toBeVisible()

    const card = cardTitle.locator('..').locator('..').locator('..')
    const removeButton = card.getByRole('button', { name: 'Remove' })
    await removeButton.click()

    const dialog = page.getByRole('dialog', { name: /remove from wishlist/i })
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Remove' }).click()

    // The card should disappear from the gallery
    await expect(page.getByTestId(`wishlist-card-${item.id}-title`)).toHaveCount(0)

    // And the item should no longer exist in the backend
    const remaining = await findWishlistItemsBySearch(page, title)
    expect(remaining.some(i => i.id === item.id)).toBe(false)
  })

  test('user can mark an item as Got It from the gallery and it is removed from wishlist', async ({
    page,
  }) => {
    const title = `E2E Got It Flow ${Date.now()}`
    const item = await createWishlistItem(page, {
      title,
      store: 'LEGO',
      price: '99.99',
      currency: 'USD',
      pieceCount: 1200,
      priority: 4,
    })
    createdItemIds.push(item.id)

    await page.goto('/wishlist')
    await expect(page.getByRole('heading', { name: 'Wishlist' })).toBeVisible()

    const cardTitle = page.getByTestId(`wishlist-card-${item.id}-title`)
    await expect(cardTitle).toBeVisible()

    const card = cardTitle.locator('..').locator('..').locator('..')
    const gotItButton = card.getByRole('button', { name: 'Got it!' })
    await gotItButton.click()

    const dialog = page.getByRole('dialog', { name: /got it!/i })
    await expect(dialog).toBeVisible()

    // Price paid field should be pre-filled from wishlist item price
    const priceInput = dialog.getByLabel('Price paid')
    await expect(priceInput).not.toHaveValue('')

    // Submit the form with default values
    await dialog.getByRole('button', { name: /add to collection/i }).click()

    // After Got It completes, the item should eventually disappear from wishlist
    await expect(page.getByTestId(`wishlist-card-${item.id}-title`)).toHaveCount(0)

    const remaining = await findWishlistItemsBySearch(page, title)
    expect(remaining.some(i => i.id === item.id)).toBe(false)
  })
})
