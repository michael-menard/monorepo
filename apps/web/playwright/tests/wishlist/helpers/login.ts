/**
 * Login helper for E2E tests
 *
 * Performs UI-based login for tests that require authentication.
 */

import type { Page } from '@playwright/test'

const TEST_USER = {
  email: 'stan.marsh@southpark.test',
  password: '0Xcoffee?',
}

/**
 * Log in via the UI
 * Should be called in beforeEach for authenticated tests
 */
export async function loginViaUI(page: Page): Promise<void> {
  // Navigate to login page
  await page.goto('/login')

  // Wait for the login form to load
  await page.waitForSelector('form', { timeout: 10000 })

  // Fill in credentials
  await page.fill('input[type="email"], input[name="email"]', TEST_USER.email)
  await page.fill('input[type="password"], input[name="password"]', TEST_USER.password)

  // Submit the form
  await page.click('button[type="submit"]')

  // Wait for navigation away from login page
  await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 30000 })
}

/**
 * Check if page is authenticated by checking for login redirect
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url()
  return !url.includes('/login')
}
