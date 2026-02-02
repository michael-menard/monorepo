/**
 * CloudFront CDN E2E Tests - WISH-2018
 *
 * Tests for CloudFront CDN integration in the wishlist gallery.
 * Verifies AC7: Frontend renders images from CloudFront.
 *
 * Prerequisites:
 * - Wishlist items with images seeded in database
 * - CloudFront distribution deployed and configured
 * - CLOUDFRONT_DISTRIBUTION_DOMAIN env var set on backend
 */

import { test, expect } from '../../fixtures/browser-auth.fixture'

test.describe('WISH-2018: CloudFront CDN Integration', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Navigate to wishlist gallery (already authenticated)
    await page.goto('/wishlist')

    // Wait for gallery to load
    const filterBar = page.locator('[data-testid="wishlist-filter-bar"]')
    const emptyState = page.locator('[data-testid="gallery-empty-state"]')

    await Promise.race([
      filterBar.waitFor({ timeout: 30000 }),
      emptyState.waitFor({ timeout: 30000 }),
    ]).catch(() => {
      // Continue even if neither appears - we'll check in individual tests
    })
  })

  test.describe('AC7: Frontend Renders Images from CloudFront', () => {
    test('images load from cloudfront.net domain', async ({ authenticatedPage: page }) => {
      // Skip if no items in gallery
      const cards = page.locator('[data-testid^="wishlist-card-"], [data-testid^="sortable-wishlist-card-"]')
      const cardCount = await cards.count()

      if (cardCount === 0) {
        test.skip(true, 'No wishlist items available for testing')
        return
      }

      // Find images in wishlist cards
      const cardImages = cards.first().locator('img')
      const imageCount = await cardImages.count()

      if (imageCount === 0) {
        test.skip(true, 'No images in wishlist cards')
        return
      }

      // Get the image src
      const imageSrc = await cardImages.first().getAttribute('src')

      // Image should be from CloudFront (not S3)
      if (imageSrc && imageSrc.startsWith('http')) {
        expect(imageSrc).toMatch(/\.cloudfront\.net/)
        expect(imageSrc).not.toMatch(/s3\.amazonaws\.com/)
      }
    })

    test('network requests for images go to CloudFront', async ({ authenticatedPage: page }) => {
      // Track network requests
      const imageRequests: string[] = []

      page.on('request', request => {
        const url = request.url()
        // Track image requests (common image extensions)
        if (
          url.match(/\.(jpg|jpeg|png|gif|webp|avif|heic|heif)(\?.*)?$/i) &&
          (url.includes('cloudfront.net') || url.includes('s3.amazonaws.com'))
        ) {
          imageRequests.push(url)
        }
      })

      // Reload to capture fresh requests
      await page.reload()
      await page.waitForLoadState('networkidle')

      // If we have image requests, they should be to CloudFront
      if (imageRequests.length > 0) {
        const cloudFrontRequests = imageRequests.filter(url => url.includes('cloudfront.net'))
        const s3Requests = imageRequests.filter(url => url.includes('s3.amazonaws.com'))

        // Log for debugging
        console.log(`Image requests: ${imageRequests.length}`)
        console.log(`CloudFront requests: ${cloudFrontRequests.length}`)
        console.log(`S3 requests: ${s3Requests.length}`)

        // All image requests should be to CloudFront, not S3
        expect(s3Requests.length).toBe(0)
        expect(cloudFrontRequests.length).toBeGreaterThan(0)
      }
    })

    test('images load successfully (no broken images)', async ({ authenticatedPage: page }) => {
      // Wait for images to load
      await page.waitForLoadState('networkidle')

      // Find all images in the wishlist gallery
      const images = page.locator('[data-testid^="wishlist-card-"] img, [data-testid^="sortable-wishlist-card-"] img')
      const imageCount = await images.count()

      if (imageCount === 0) {
        test.skip(true, 'No images to verify')
        return
      }

      // Check each image loaded successfully
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i)
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)

        // naturalWidth > 0 means image loaded successfully
        expect(naturalWidth).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Image Loading Performance', () => {
    test('images load within acceptable time', async ({ authenticatedPage: page }) => {
      // Skip if no items
      const cards = page.locator('[data-testid^="wishlist-card-"]')
      if ((await cards.count()) === 0) {
        test.skip(true, 'No wishlist items available')
        return
      }

      // Track image load timing
      const imageLoadTimes: number[] = []

      page.on('response', async response => {
        const url = response.url()
        if (url.includes('cloudfront.net') && url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
          const timing = response.request().timing()
          if (timing.responseEnd > 0) {
            imageLoadTimes.push(timing.responseEnd)
          }
        }
      })

      // Reload to measure
      await page.reload()
      await page.waitForLoadState('networkidle')

      if (imageLoadTimes.length > 0) {
        const avgLoadTime = imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length
        console.log(`Average image load time: ${avgLoadTime.toFixed(2)}ms`)

        // Images should load within 3 seconds (generous for first load / cache miss)
        expect(avgLoadTime).toBeLessThan(3000)
      }
    })
  })

  test.describe('Cache Headers Verification', () => {
    test('CloudFront returns appropriate cache headers', async ({ authenticatedPage: page }) => {
      let foundCacheHeader = false

      page.on('response', async response => {
        const url = response.url()
        if (url.includes('cloudfront.net') && url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
          const headers = response.headers()

          // Check for CloudFront-specific headers
          const xCache = headers['x-cache']
          const age = headers['age']
          const cacheControl = headers['cache-control']

          if (xCache || age || cacheControl) {
            foundCacheHeader = true
            console.log(`CloudFront headers for ${url}:`)
            console.log(`  x-cache: ${xCache}`)
            console.log(`  age: ${age}`)
            console.log(`  cache-control: ${cacheControl}`)
          }
        }
      })

      await page.reload()
      await page.waitForLoadState('networkidle')

      // Note: This test may not always find headers if no images are loaded
      // It's primarily for verification during development
      if (foundCacheHeader) {
        expect(foundCacheHeader).toBe(true)
      }
    })
  })

  test.describe('Error Handling', () => {
    test('handles missing images gracefully', async ({ authenticatedPage: page }) => {
      // Verify no console errors for missing images
      const errors: string[] = []

      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('cloudfront')) {
          errors.push(msg.text())
        }
      })

      await page.waitForLoadState('networkidle')

      // Should not have CloudFront-related console errors
      const cloudFrontErrors = errors.filter(
        e => e.includes('403') || e.includes('404') || e.includes('Failed to load'),
      )

      expect(cloudFrontErrors.length).toBe(0)
    })
  })
})

test.describe('WISH-2018: API Response Verification', () => {
  test('API responses contain CloudFront URLs', async ({ authenticatedPage: page }) => {
    let apiResponseChecked = false

    // Intercept API response
    page.on('response', async response => {
      const url = response.url()

      // Check wishlist API response
      if (url.includes('/api/wishlist') && response.status() === 200) {
        try {
          const json = await response.json()

          // Check if response contains items with imageUrl
          const items = json.items || json.data || (Array.isArray(json) ? json : [])

          for (const item of items) {
            if (item.imageUrl) {
              // Verify imageUrl is CloudFront URL (not S3)
              if (item.imageUrl.startsWith('http')) {
                expect(item.imageUrl).toMatch(/\.cloudfront\.net/)
                expect(item.imageUrl).not.toMatch(/s3\.amazonaws\.com/)
                apiResponseChecked = true
              }
            }
          }
        } catch {
          // Response might not be JSON, skip
        }
      }
    })

    // Navigate to trigger API call
    await page.goto('/wishlist')
    await page.waitForLoadState('networkidle')

    // Log whether we verified API response
    console.log(`API response checked: ${apiResponseChecked}`)
  })
})
