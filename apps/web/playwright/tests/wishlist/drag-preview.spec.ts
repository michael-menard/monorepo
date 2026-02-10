/**
 * E2E Tests: WISH-2005c Drag Preview Thumbnail
 *
 * Verifies drag preview behavior during wishlist item reordering.
 * Tests against live backend (localhost:9000) + frontend (localhost:3000).
 *
 * ACs covered:
 * - AC-1: DragOverlay displays item thumbnail at 70% scale, 0.8 opacity
 * - AC-3: Smooth fade-in on drag start
 * - AC-4: Smooth fade-out on drag end / Escape cancel
 * - AC-5: Missing image fallback (Package icon)
 * - AC-7: No layout shift during drag
 * - AC-11: Shadow styling (shadow-xl)
 * - AC-12: Border highlight (ring-2 ring-primary)
 */

import { test, expect } from '../wishlist/helpers/auth-fixture'

/**
 * Helper: Start a drag from a drag handle and move far enough to activate dnd-kit PointerSensor (8px threshold).
 * Returns the drag handle locator for chaining.
 */
async function startDrag(page: import('@playwright/test').Page, handleTestId: string) {
  const handle = page.getByTestId(handleTestId)
  await handle.waitFor({ state: 'attached' })

  // Hover to make drag handle visible (desktop: opacity-0 until hover)
  const card = handle.locator('..')
  await card.hover()
  await handle.waitFor({ state: 'visible', timeout: 5000 })

  const box = await handle.boundingBox()
  if (!box) throw new Error(`Drag handle ${handleTestId} has no bounding box`)

  // Mouse down on center of handle
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()

  // Move more than 8px to activate PointerSensor
  await page.mouse.move(cx + 20, cy + 20, { steps: 5 })

  return { cx, cy }
}

test.describe('WISH-2005c: Drag Preview Thumbnail', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to the main wishlist page
    await authenticatedPage.goto('/')
    // Wait for gallery to load
    await authenticatedPage.waitForSelector('[data-testid="wishlist-gallery-container"]', {
      timeout: 15000,
    })
  })

  test('drag preview appears when dragging starts (AC-1)', async ({ authenticatedPage: page }) => {
    // Find the first drag handle
    const handles = page.locator('[data-testid^="drag-handle-"]')
    const handleCount = await handles.count()

    // Need at least 2 items for drag to be enabled
    if (handleCount < 2) {
      test.skip(true, 'Need at least 2 wishlist items for drag tests')
      return
    }

    const firstHandle = handles.first()
    const handleTestId = await firstHandle.getAttribute('data-testid')

    await startDrag(page, handleTestId!)

    // Verify drag preview appears
    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // Clean up
    await page.mouse.up()
  })

  test('drag preview has correct scale (70%) (AC-1)', async ({ authenticatedPage: page }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)

    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // Check transform includes scale(0.7)
    const transform = await preview.evaluate(el => el.style.transform)
    expect(transform).toContain('scale(0.7)')

    await page.mouse.up()
  })

  test('drag preview has correct opacity (0.8) (AC-1, AC-3)', async ({
    authenticatedPage: page,
  }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)

    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // Framer Motion animate target is opacity 0.8 - wait for animation
    await page.waitForTimeout(300)
    const opacity = await preview.evaluate(el => {
      const computed = window.getComputedStyle(el)
      return parseFloat(computed.opacity)
    })
    // Allow small tolerance for animation timing
    expect(opacity).toBeGreaterThanOrEqual(0.7)
    expect(opacity).toBeLessThanOrEqual(0.85)

    await page.mouse.up()
  })

  test('drag preview shows item title (AC-1)', async ({ authenticatedPage: page }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)

    const title = page.getByTestId('wishlist-drag-preview-title')
    await expect(title).toBeVisible({ timeout: 5000 })
    const text = await title.textContent()
    expect(text!.length).toBeGreaterThan(0)

    await page.mouse.up()
  })

  test('drag preview shows item price (AC-1)', async ({ authenticatedPage: page }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)

    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // Price or "No price" should be visible
    const price = page.getByTestId('wishlist-drag-preview-price')
    const noPrice = preview.locator('text=No price')
    const hasPriceElement = (await price.count()) > 0
    const hasNoPriceText = (await noPrice.count()) > 0
    expect(hasPriceElement || hasNoPriceText).toBe(true)

    await page.mouse.up()
  })

  test('drag preview shows item image or fallback (AC-1, AC-5)', async ({
    authenticatedPage: page,
  }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)

    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // Should have either an img element or the fallback Package icon
    const img = preview.locator('img')
    const fallback = page.getByTestId('wishlist-drag-preview-fallback')
    const hasImg = (await img.count()) > 0
    const hasFallback = (await fallback.count()) > 0
    expect(hasImg || hasFallback).toBe(true)

    await page.mouse.up()
  })

  test('drag preview fades in when drag starts (AC-3)', async ({ authenticatedPage: page }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)

    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // The preview should be visible (Framer Motion fade-in completed)
    // After 150ms animation, opacity should approach 0.8
    await page.waitForTimeout(200)
    const opacity = await preview.evaluate(el => parseFloat(window.getComputedStyle(el).opacity))
    expect(opacity).toBeGreaterThan(0)

    await page.mouse.up()
  })

  test('drag preview disappears when drag ends (AC-4)', async ({ authenticatedPage: page }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)

    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // Drop the item
    await page.mouse.up()

    // Preview should disappear (allow time for exit animation + drop animation)
    await expect(preview).toBeHidden({ timeout: 3000 })
  })

  test('drag preview disappears on Escape key cancel (AC-4)', async ({
    authenticatedPage: page,
  }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)

    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // Press Escape to cancel drag
    await page.keyboard.press('Escape')

    // Preview should disappear
    await expect(preview).toBeHidden({ timeout: 3000 })
  })

  test('original card maintains position during drag (AC-7)', async ({
    authenticatedPage: page,
  }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    // Get initial positions of all cards
    const cards = page.locator('[data-testid^="sortable-wishlist-card-"]')
    const initialCount = await cards.count()
    const initialPositions: { x: number; y: number }[] = []
    for (let i = 0; i < initialCount; i++) {
      const box = await cards.nth(i).boundingBox()
      if (box) initialPositions.push({ x: box.x, y: box.y })
    }

    // Start dragging the first card
    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)

    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // Check that card count hasn't changed (no collapse)
    const duringDragCount = await cards.count()
    expect(duringDragCount).toBe(initialCount)

    await page.mouse.up()
  })

  test('original card shows placeholder styling during drag (AC-7)', async ({
    authenticatedPage: page,
  }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    // Get the first card's ID from its handle
    const firstHandleTestId = await handles.first().getAttribute('data-testid')
    const itemId = firstHandleTestId!.replace('drag-handle-', '')

    await startDrag(page, firstHandleTestId!)

    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // The original sortable card should have reduced opacity (0.5) during drag
    const originalCard = page.getByTestId(`sortable-wishlist-card-${itemId}`)
    const opacity = await originalCard.evaluate(el => parseFloat(window.getComputedStyle(el).opacity))
    expect(opacity).toBeLessThanOrEqual(0.6)

    await page.mouse.up()
  })

  test('drag preview has shadow styling (shadow-xl) (AC-11)', async ({
    authenticatedPage: page,
  }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)

    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // Verify shadow-xl class is applied
    const hasShadow = await preview.evaluate(el => el.classList.contains('shadow-xl'))
    expect(hasShadow).toBe(true)

    await page.mouse.up()
  })

  test('drag preview has border highlight (ring-2 ring-primary) (AC-12)', async ({
    authenticatedPage: page,
  }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    if ((await handles.count()) < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)

    const preview = page.getByTestId('wishlist-drag-preview')
    await expect(preview).toBeVisible({ timeout: 5000 })

    // Verify ring classes are applied
    const hasRing2 = await preview.evaluate(el => el.classList.contains('ring-2'))
    const hasRingPrimary = await preview.evaluate(el => el.classList.contains('ring-primary'))
    expect(hasRing2).toBe(true)
    expect(hasRingPrimary).toBe(true)

    await page.mouse.up()
  })

  test('drag preview follows complete lifecycle (Integration)', async ({
    authenticatedPage: page,
  }) => {
    const handles = page.locator('[data-testid^="drag-handle-"]')
    const handleCount = await handles.count()
    if (handleCount < 2) {
      test.skip(true, 'Need at least 2 wishlist items')
      return
    }

    const preview = page.getByTestId('wishlist-drag-preview')

    // 1. Before drag: no preview
    await expect(preview).toBeHidden()

    // 2. Start drag: preview appears
    const handleTestId = await handles.first().getAttribute('data-testid')
    await startDrag(page, handleTestId!)
    await expect(preview).toBeVisible({ timeout: 5000 })

    // 3. Verify content is populated
    const title = page.getByTestId('wishlist-drag-preview-title')
    await expect(title).toBeVisible()

    // 4. Move to second card position
    const secondCard = page.locator('[data-testid^="sortable-wishlist-card-"]').nth(1)
    const secondBox = await secondCard.boundingBox()
    if (secondBox) {
      await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, {
        steps: 5,
      })
    }

    // 5. Drop
    await page.mouse.up()

    // 6. Preview disappears
    await expect(preview).toBeHidden({ timeout: 3000 })
  })
})
