import { expect, test } from '@playwright/test'
import { createAuthTestUtils } from './utils'
import { SOUTH_PARK_USERS } from './test-users'

/**
 * REAL E2E Auth Flow Tests - NO MOCKING
 *
 * These tests use REAL API calls to test the complete auth system end-to-end:
 * - Real auth service on port 9300
 * - Real database operations
 * - Real CSRF token handling
 * - Real session management
 * - Real error handling
 *
 * NO MOCKING ALLOWED - This is true E2E testing
 */
test.describe('Real E2E Auth Flow Tests (No Mocking)', () => {
  test.describe.configure({ timeout: 120000 }) // 2 minutes for real API calls

  test.beforeAll(async () => {
    console.log('🎯 REAL E2E Auth Testing (NO MOCKING):')
    console.log('  ✅ Real Auth Service: http://localhost:9300')
    console.log('  ✅ Real Database: MongoDB')
    console.log('  ✅ Real CSRF Protection')
    console.log('  ✅ Real Session Management')
    console.log('  ❌ NO MOCKING - True End-to-End Testing')
  })

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page)
    await authUtils.setup()

    // Enable strict mode to prevent accidental mocking
    await page.addInitScript(() => {
      window.process = { env: { E2E_STRICT_MODE: 'true' } }
    })
  })

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page)
    await authUtils.cleanup()
  })

  test.describe('Real Login Flow', () => {
    test('should login with real auth service and real database', async ({ page }) => {
      test.setTimeout(60000)

      const authUtils = createAuthTestUtils(page)
      const testUser = SOUTH_PARK_USERS.STAN // This user exists in the seeded database

      // Monitor real API calls (no mocking)
      const apiMonitor = await authUtils.monitorRealApiCalls()

      console.log('🔄 Testing real login with existing user...')
      console.log(`📧 Email: ${testUser.email}`)

      // Navigate to login page
      await authUtils.navigateToAuthPage('login')

      // Verify login form is present
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      // Perform REAL login (no mocking)
      await authUtils.login(testUser.email, testUser.password)

      // Wait for real authentication to complete
      await page.waitForTimeout(5000)

      // Verify real authentication success
      // Check if we're redirected (real auth service should redirect on success)
      const currentUrl = page.url()
      console.log(`🔍 Current URL after login: ${currentUrl}`)

      // Should not be on login page anymore if login was successful
      expect(currentUrl).not.toContain('/auth/login')

      // Verify real API calls were made
      expect(apiMonitor.authRequests.length).toBeGreaterThan(0)
      console.log(`✅ Real auth API calls made: ${apiMonitor.authRequests.length}`)

      // Check for any API errors
      if (apiMonitor.errors.length > 0) {
        console.log('❌ API Errors detected:', apiMonitor.errors)
      }

      console.log('✅ Real login test completed successfully')
    })

    test('should handle real login failure with invalid credentials', async ({ page }) => {
      test.setTimeout(45000)

      const authUtils = createAuthTestUtils(page)
      const apiMonitor = await authUtils.monitorRealApiCalls()

      console.log('🔄 Testing real login failure...')

      // Navigate to login page
      await authUtils.navigateToAuthPage('login')

      // Try to login with invalid credentials (real API call)
      await authUtils.login('invalid@example.com', 'wrongpassword')

      // Wait for real API response
      await page.waitForTimeout(3000)

      // Should still be on login page (real auth service should reject)
      expect(page.url()).toContain('/auth/login')

      // Look for real error message from auth service
      const errorMessage = page.locator('[data-testid="error-message"], .error, .alert-error')
      await expect(errorMessage).toBeVisible({ timeout: 5000 })

      // Verify real API calls were made
      expect(apiMonitor.authRequests.length).toBeGreaterThan(0)
      console.log(`✅ Real auth API calls made: ${apiMonitor.authRequests.length}`)

      console.log('✅ Real login failure test completed successfully')
    })
  })

  test.describe('Real CSRF Protection', () => {
    test('should fetch real CSRF token from auth service', async ({ page }) => {
      test.setTimeout(30000)

      const authUtils = createAuthTestUtils(page)
      const apiMonitor = await authUtils.monitorRealApiCalls()

      console.log('🔄 Testing real CSRF token fetching...')

      // Navigate to login page (should trigger real CSRF token fetch)
      await authUtils.navigateToAuthPage('login')

      // Wait for real CSRF token request
      await page.waitForTimeout(3000)

      // Verify real CSRF API call was made
      const csrfRequests = apiMonitor.authRequests.filter(
        req => req.url.includes('/csrf') || req.url.includes('/api/auth/csrf'),
      )

      expect(csrfRequests.length).toBeGreaterThan(0)
      console.log(`✅ Real CSRF token requests: ${csrfRequests.length}`)

      // Check that CSRF token is actually set in the page
      const csrfToken = await page.evaluate(() => {
        // Check for CSRF token in meta tag, cookie, or localStorage
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        const cookieToken = document.cookie.split(';').find(c => c.includes('XSRF-TOKEN'))
        return metaToken || cookieToken || localStorage.getItem('csrf-token')
      })

      expect(csrfToken).toBeTruthy()
      console.log('✅ Real CSRF token found in page')

      console.log('✅ Real CSRF protection test completed successfully')
    })
  })

  test.describe('Real Session Management', () => {
    test('should maintain real session after login', async ({ page }) => {
      test.setTimeout(60000)

      const authUtils = createAuthTestUtils(page)
      const testUser = SOUTH_PARK_USERS.KYLE // Another seeded user
      const apiMonitor = await authUtils.monitorRealApiCalls()

      console.log('🔄 Testing real session management...')

      // Login with real auth service
      await authUtils.navigateToAuthPage('login')
      await authUtils.login(testUser.email, testUser.password)
      await page.waitForTimeout(3000)

      // Navigate to a different page
      await page.goto('/')
      await page.waitForTimeout(2000)

      // Check if session is maintained (real auth check)
      const authCheckRequests = apiMonitor.authRequests.filter(
        req => req.url.includes('/check-auth') || req.url.includes('/verify'),
      )

      expect(authCheckRequests.length).toBeGreaterThan(0)
      console.log(`✅ Real auth check requests: ${authCheckRequests.length}`)

      // Verify we're still authenticated (not redirected to login)
      expect(page.url()).not.toContain('/auth/login')

      console.log('✅ Real session management test completed successfully')
    })
  })

  test.describe('Real Error Handling', () => {
    test('should handle real network errors gracefully', async ({ page }) => {
      test.setTimeout(45000)

      const authUtils = createAuthTestUtils(page)
      const apiMonitor = await authUtils.monitorRealApiCalls()

      console.log('🔄 Testing real error handling...')

      // Navigate to login page
      await authUtils.navigateToAuthPage('login')

      // Try to submit form (this will make real API calls)
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')

      // Wait for real API response
      await page.waitForTimeout(5000)

      // Check if any real API errors occurred
      console.log(`📊 Total API requests: ${apiMonitor.authRequests.length}`)
      console.log(`📊 API errors: ${apiMonitor.errors.length}`)

      // Verify the app handles real errors gracefully (doesn't crash)
      const pageContent = await page.textContent('body')
      expect(pageContent).toBeTruthy()
      expect(pageContent).not.toContain('Application Error')
      expect(pageContent).not.toContain('500 Internal Server Error')

      console.log('✅ Real error handling test completed successfully')
    })
  })
})
