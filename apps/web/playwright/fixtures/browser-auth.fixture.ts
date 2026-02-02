/**
 * Browser Authentication Fixture
 *
 * Sets up browser-based authentication for E2E tests by logging in via the UI.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../fixtures/browser-auth.fixture'
 *
 * test('authenticated test', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/wishlist')
 *   // User is already authenticated
 * })
 * ```
 */

import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Test User Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TEST_USER = {
  email: 'stan.marsh@southpark.test',
  password: '0Xcoffee?',
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser Auth Setup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set up authentication by logging in via the UI
 * Returns the access token for API authorization
 */
async function setupBrowserAuthViaUI(page: Page): Promise<string | null> {
  // Console error listener is set up in the fixture, before this function is called

  // Navigate to login page
  await page.goto('/login', { waitUntil: 'networkidle' })
  console.log('Navigated to login page, URL:', page.url())

  // Wait for React to hydrate
  await page.waitForTimeout(2000)

  // Wait for login form
  await page.waitForSelector('form', { timeout: 15000 })

  // Fill in credentials
  await page.fill('input[type="email"], input[name="email"], input[id="email"]', TEST_USER.email)
  await page.fill('input[type="password"], input[name="password"], input[id="password"]', TEST_USER.password)
  console.log('Filled login credentials')

  // Submit the form
  await page.click('button[type="submit"]')
  console.log('Submitted login form')

  // Wait for successful login (redirect away from /login)
  try {
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30000 })
    console.log('Login successful, redirected to:', page.url())
  } catch (error) {
    console.error('Login failed, current URL:', page.url())
    throw new Error('UI login failed - check test user credentials')
  }

  // Wait for app to fully stabilize and auth state to persist
  await page.waitForTimeout(3000)

  // Verify we're still authenticated by checking we're not on login page
  const currentUrl = page.url()
  if (currentUrl.includes('/login')) {
    throw new Error('Auth state lost after login')
  }
  console.log('Auth verified, current URL:', currentUrl)

  // Extract the access token from Amplify's localStorage storage
  // Cognito stores tokens in localStorage with keys like CognitoIdentityServiceProvider.<clientId>.<username>.accessToken
  const accessToken = await page.evaluate(() => {
    // Look for Cognito tokens in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('accessToken')) {
        return localStorage.getItem(key)
      }
    }
    return null
  })

  if (accessToken) {
    console.log('Access token extracted from localStorage')
  } else {
    console.warn('Could not extract access token from localStorage')
  }

  return accessToken
}

/**
 * Set up request interception to add Authorization header to API requests
 */
async function setupApiAuthInterception(page: Page, accessToken: string): Promise<void> {
  // Intercept API requests and add Authorization header
  // Using a more specific pattern to avoid intercepting module loading
  await page.route('**/api/**', async route => {
    const request = route.request()
    console.log(`[API Route] ${request.method()} ${request.url()}`)
    const headers = {
      ...request.headers(),
      Authorization: `Bearer ${accessToken}`,
    }
    await route.continue({ headers })
  })
  console.log('API auth interception set up for /api/** routes')
}

// ─────────────────────────────────────────────────────────────────────────────
// Playwright Fixture
// ─────────────────────────────────────────────────────────────────────────────

type BrowserAuthFixtures = {
  /** Page with authentication already set up */
  authenticatedPage: Page
}

/**
 * Extended test with browser authentication
 */
export const test = base.extend<BrowserAuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Log ALL console messages for debugging
    page.on('console', msg => {
      const text = msg.text()
      // Skip React hydration warnings, log errors and important info
      if (msg.type() === 'error' && !text.includes('hydration') && !text.includes('descendant')) {
        console.log(`[CONSOLE error] ${text}`)
      }
    })

    // Log page errors
    page.on('pageerror', error => {
      console.error('[PAGE ERROR]', error.message)
    })

    // Log failed requests
    page.on('requestfailed', request => {
      console.log(`[FAIL] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`)
    })

    console.log('Setting up browser auth via UI login...')
    const accessToken = await setupBrowserAuthViaUI(page)

    // Set up API auth interception if we have a token
    if (accessToken) {
      await setupApiAuthInterception(page, accessToken)
    } else {
      console.warn('No access token available - API calls may fail with 401')
    }

    console.log('Browser auth setup complete')
    await use(page)
  },
})

export { expect }
