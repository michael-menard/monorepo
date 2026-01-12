import type { Page } from '@playwright/test'

export interface TestUserCredentials {
  email: string
  password: string
}

export interface LoginOptions extends Partial<TestUserCredentials> {
  /**
   * Optional path to redirect to after successful login.
   * If provided, the helper will navigate to `/login?redirect=<redirectTo>`.
   */
  redirectTo?: string
}

/**
 * Resolve Playwright E2E test user credentials from environment variables.
 *
 * This helper intentionally does not log or print the credentials. The
 * expectation is that CI or local envs provide:
 * - PLAYWRIGHT_E2E_USER_EMAIL
 * - PLAYWRIGHT_E2E_USER_PASSWORD
 *
 * Fallbacks (for backwards compatibility) are:
 * - E2E_TEST_USER_EMAIL
 * - E2E_TEST_USER_PASSWORD
 */
export function getTestUserCredentials(overrides: Partial<TestUserCredentials> = {}): TestUserCredentials {
  const envEmail =
    process.env.PLAYWRIGHT_E2E_USER_EMAIL || process.env.E2E_TEST_USER_EMAIL || undefined
  const envPassword =
    process.env.PLAYWRIGHT_E2E_USER_PASSWORD || process.env.E2E_TEST_USER_PASSWORD || undefined

  const email = overrides.email ?? envEmail
  const password = overrides.password ?? envPassword

  if (!email || !password) {
    throw new Error(
      'Missing Playwright E2E test user credentials. Set PLAYWRIGHT_E2E_USER_EMAIL and PLAYWRIGHT_E2E_USER_PASSWORD in the test environment.',
    )
  }

  return { email, password }
}

/**
 * Log in as the configured E2E test user using the real /login flow.
 *
 * This helper drives the actual login page UI instead of mocking auth
 * in localStorage. It is intended for "real" end-to-end tests that
 * exercise Cognito/AuthProvider + router integration.
 */
export async function loginAsTestUser(page: Page, options: LoginOptions = {}): Promise<void> {
  const { redirectTo, ...credentialOverrides } = options
  const { email, password } = getTestUserCredentials(credentialOverrides)

  const searchParams = new URLSearchParams()
  if (redirectTo) {
    searchParams.set('redirect', redirectTo)
  }

  const loginUrl = `/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

  await page.goto(loginUrl)
  await page.waitForLoadState('networkidle')

  // Fill login form using accessible selectors that match the LoginPage implementation
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.getByPlaceholder('Enter your password').fill(password)

  const submitButton = page.locator('button[type="submit"]')

  await Promise.all([
    // Wait for navigation away from /login (either dashboard, wishlist, or redirect target)
    page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 }).catch(() => {
      // Swallow here; we assert below if we are still on /login
    }),
    submitButton.click(),
  ])

  const currentUrl = new URL(page.url())

  // If we are still on /login after submission, treat this as a failure so tests fail fast.
  if (currentUrl.pathname.includes('/login')) {
    throw new Error('Login did not complete successfully; still on /login after submitting credentials.')
  }
}
