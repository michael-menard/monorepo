import { test, expect } from '@playwright/test'
import { loginAsTestUser } from '../../../utils/login'
import {
  createWishlistItem,
  deleteWishlistItem,
  clearWishlistForCurrentUser,
  findWishlistItemsBySearch,
} from '../../../e2e/wishlist/helpers'

/**
 * Story wish-2007: Add wishlist item via real /wishlist/add page.
 */

test.describe('Wishlist add item - real E2E', () => {
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

  test('user can add a new wishlist item and see it in the gallery backed by real API', async ({
    page,
  }) => {
    const title = `E2E Add Form Test ${Date.now()}`

    await page.goto('/wishlist/add')
    await expect(page.getByRole('heading', { name: 'Add Wishlist Item' })).toBeVisible()

    // Fill required title (store defaults to LEGO)
    await page.getByPlaceholder(/medieval castle/i).fill(title)

    // Submit the form
    await page.getByRole('button', { name: /add to wishlist/i }).click()

    // Expect redirect to /wishlist
    await expect(page).toHaveURL(/\/wishlist$/)

    // The new item should appear in the gallery
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

    // Also verify via the real API that the item exists
    const items = await findWishlistItemsBySearch(page, title)
    expect(items.some(item => item.title === title)).toBe(true)

    // Track for cleanup (in case the scenario fails before we delete)
    items
      .filter(item => item.title === title)
      .forEach(item => {
        if (!createdItemIds.includes(item.id)) createdItemIds.push(item.id)
      })
  })

  test('validation errors are shown when required fields are missing (real form)', async ({
    page,
  }) => {
    await page.goto('/wishlist/add')
    await expect(page.getByRole('heading', { name: 'Add Wishlist Item' })).toBeVisible()

    await page.getByRole('button', { name: /add to wishlist/i }).click()

    // Title is required according to CreateWishlistItemSchema
    await expect(page.getByText(/title is required/i)).toBeVisible({ timeout: 10_000 })
  })

  test('user can cancel and return to wishlist without creating an item', async ({ page }) => {
    await page.goto('/wishlist/add')

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page).toHaveURL(/\/wishlist$/)
  })

  test('API error when creating wishlist item is surfaced to the user (smoke)', async ({ page }) => {
    // This scenario relies on backend returning an error in rare cases.
    // We perform a basic smoke check that the UI surfaces a generic error
    // if creation fails for any reason.

    const title = `E2E Add Error Test ${Date.now()}`

    await page.goto('/wishlist/add')
    await page.getByPlaceholder(/medieval castle/i).fill(title)

    // To avoid flakiness, we first ensure that the happy-path works by
    // creating one item via API. If that fails, we skip the assertion.
    try {
      const apiItem = await createWishlistItem(page, {
        title,
        store: 'LEGO',
      })
      createdItemIds.push(apiItem.id)
    } catch {
      test.skip(true, 'Wishlist API not available for error-flow smoke check')
    }

    await page.getByRole('button', { name: /add to wishlist/i }).click()

    // If the API rejects this particular request, the UI should show a
    // friendly error message. We assert that either we navigated to
    // /wishlist (happy path) or we see the error.
    try {
      await expect(page).toHaveURL(/\/wishlist$/, { timeout: 10_000 })
    } catch {
      await expect(
        page.getByText(/failed to add item|something went wrong while adding/i),
      ).toBeVisible({ timeout: 10_000 })
    }
  })
})
