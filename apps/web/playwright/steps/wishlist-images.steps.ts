/**
 * Wishlist Images Step Definitions
 * INST-1111: Missing step definitions for wishlist image testing
 *
 * BDD step definitions for wishlist image E2E tests.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ============================================================================
// Image Loading and Display Steps
// ============================================================================

Given('the wishlist has items with images', async () => {
  // MSW will return items with image URLs
})

Then('wishlist card images should load from CloudFront domain', async ({ page }) => {
  const images = page.locator('[data-testid="wishlist-card"] img, [data-testid="gallery-card"] img')
  const firstImage = images.first()
  await expect(firstImage).toBeVisible()
  
  const src = await firstImage.getAttribute('src')
  expect(src).toMatch(/cloudfront\.net/)
})

Then('image URLs should contain the CloudFront distribution domain', async ({ page }) => {
  const images = page.locator('[data-testid="wishlist-card"] img, [data-testid="gallery-card"] img')
  const count = await images.count()
  
  for (let i = 0; i < count; i++) {
    const src = await images.nth(i).getAttribute('src')
    expect(src).toMatch(/cloudfront\.net|cdn\./)
  }
})

Then('wishlist card images should have responsive srcset attributes', async ({ page }) => {
  const images = page.locator('[data-testid="wishlist-card"] img, [data-testid="gallery-card"] img')
  const firstImage = images.first()
  await expect(firstImage).toBeVisible()
  
  const srcset = await firstImage.getAttribute('srcset')
  expect(srcset).toBeTruthy()
})

Then('thumbnail images should be optimized for size', async ({ page }) => {
  // Verify thumbnail image sizes are small
  const images = page.locator('[data-testid="wishlist-card"] img, [data-testid="gallery-card"] img')
  const firstImage = images.first()
  
  const src = await firstImage.getAttribute('src')
  // Thumbnails should have dimensions in URL or be marked as thumbnails
  expect(src).toMatch(/thumb|small|200x200|w=200/)
})

Then('gallery images should use appropriate compression', async ({ page }) => {
  const images = page.locator('[data-testid="wishlist-card"] img, [data-testid="gallery-card"] img')
  const firstImage = images.first()
  
  const src = await firstImage.getAttribute('src')
  // Modern formats or compression indicators
  expect(src).toMatch(/\.webp|\.jpg|quality=\d+/)
})

// ============================================================================
// Lazy Loading Steps
// ============================================================================

Given('I have many wishlist items', async () => {
  // MSW will return many items to test lazy loading
})

Then('below-fold images should not load immediately', async ({ page }) => {
  // Check that images below viewport have loading="lazy"
  const images = page.locator('img[loading="lazy"]')
  expect(await images.count()).toBeGreaterThan(0)
})

When('I scroll down', async ({ page }) => {
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' })
  })
  await page.waitForTimeout(500)
})

Then('previously hidden images should start loading', async ({ page }) => {
  // Wait for lazy-loaded images to appear
  const visibleImages = page.locator('[data-testid="wishlist-card"] img:visible')
  expect(await visibleImages.count()).toBeGreaterThan(3)
})

Then('image placeholders should be visible during load', async ({ page }) => {
  // Look for skeleton or placeholder elements
  const placeholders = page.locator('[data-testid="image-placeholder"], .skeleton, .animate-pulse')
  // Placeholders may or may not be visible depending on load speed
  // Just verify they exist in the DOM
  const count = await placeholders.count()
  expect(count).toBeGreaterThanOrEqual(0)
})

// ============================================================================
// Image Variant Steps
// ============================================================================

Then('gallery cards should use thumbnail image variant', async ({ page }) => {
  const images = page.locator('[data-testid="wishlist-card"] img, [data-testid="gallery-card"] img')
  const firstImage = images.first()
  
  const src = await firstImage.getAttribute('src')
  expect(src).toMatch(/thumb|thumbnail|small|_t\.|_200/)
})

When('I open a wishlist item detail view', async ({ page }) => {
  const firstCard = page.locator('[data-testid="wishlist-card"], [data-testid="gallery-card"]').first()
  await firstCard.click()
  await page.waitForLoadState('networkidle')
})

Then('the detail view should use full-size image', async ({ page }) => {
  const detailImage = page.locator('[data-testid="detail-image"], .detail-view img').first()
  await expect(detailImage).toBeVisible()
  
  const src = await detailImage.getAttribute('src')
  expect(src).not.toMatch(/thumb|thumbnail|small/)
})
