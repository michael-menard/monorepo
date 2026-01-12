import { test, expect } from '@playwright/test'
import { loginAsTestUser } from '../../../utils/login'
import {
  createWishlistItem,
  deleteWishlistItem,
  clearWishlistForCurrentUser,
} from '../../../e2e/wishlist/helpers'

/**
 * Story wish-2007: Reorder wishlist items via drag-and-drop (if implemented).
 */

test.describe('Wishlist reorder - real E2E', () => {
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

  test('user can reorder wishlist items in grid view and order persists across reload', async ({
    page,
  }) => {
    const itemA = await createWishlistItem(page, {
      title: 'E2E Reorder One',
      store: 'LEGO',
      price: '10.00',
      currency: 'USD',
      priority: 1,
    })
    const itemB = await createWishlistItem(page, {
      title: 'E2E Reorder Two',
      store: 'LEGO',
      price: '20.00',
      currency: 'USD',
      priority: 2,
    })
    const itemC = await createWishlistItem(page, {
      title: 'E2E Reorder Three',
      store: 'LEGO',
      price: '30.00',
      currency: 'USD',
      priority: 3,
    })

    createdItemIds.push(itemA.id, itemB.id, itemC.id)

    await page.goto('/wishlist')
    await expect(page.getByRole('heading', { name: 'Wishlist' })).toBeVisible()

    // Ensure we are in grid view; if a view toggle exists, prefer grid
    const viewToggleButton = page.getByRole('button', { name: /grid view/i })
    if (await viewToggleButton.isVisible()) {
      await viewToggleButton.click()
    }

    // Drag the first item's handle below the third item to move it to the end
    const handles = page.getByRole('button', { name: 'Reorder wishlist item' })
    await expect(handles.nth(0)).toBeVisible()

    // We assume the initial visual order matches creation order: One, Two, Three
    await handles
      .nth(0)
      .dragTo(handles.nth(2), { force: true })

    // Capture the new visual order of E2E items
    const titlesLocator = page.locator(
      '[data-testid^="wishlist-card-"][data-testid$="-title"]',
    )
    const titlesAfterDrag = await titlesLocator.allTextContents()
    const relevantAfterDrag = titlesAfterDrag.filter(title => title.startsWith('E2E Reorder'))

    // Expect that "E2E Reorder One" moved to the end
    expect(relevantAfterDrag).toEqual([
      'E2E Reorder Two',
      'E2E Reorder Three',
      'E2E Reorder One',
    ])

    // Reload the page and ensure order persists (backend persisted sortOrder)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Wishlist' })).toBeVisible()

    const titlesAfterReload = await titlesLocator.allTextContents()
    const relevantAfterReload = titlesAfterReload.filter(title => title.startsWith('E2E Reorder'))

    expect(relevantAfterReload).toEqual([
      'E2E Reorder Two',
      'E2E Reorder Three',
      'E2E Reorder One',
    ])
  })
})
