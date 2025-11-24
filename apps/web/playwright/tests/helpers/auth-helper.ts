import {Page} from '@playwright/test'
import {TEST_USERS} from '../auth/test-users'

/**
 * Authentication Helper for E2E Tests
 *
 * Provides reliable authentication methods for Playwright tests
 */

export interface AuthOptions {
  user?: typeof TEST_USERS.STANDARD
  timeout?: number
  skipIfAlreadyLoggedIn?: boolean
}

/**
 * Authenticate a user via the login form
 */
export async function authenticateUser(page: Page, options: AuthOptions = {}) {
  const { user = TEST_USERS.STANDARD, timeout = 10000, skipIfAlreadyLoggedIn = true } = options

  console.log(`🔐 Authenticating user: ${user.email}`)

  // Check if already logged in by trying to access profile
  if (skipIfAlreadyLoggedIn) {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    if (!page.url().includes('/login')) {
      console.log('✅ User already authenticated')
      return
    }
  }

  // Navigate to login page
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  // Wait for login form elements
  await page.waitForSelector('input[type="email"]', { timeout })
  await page.waitForSelector('input[type="password"]', { timeout })
  await page.waitForSelector('button[type="submit"]', { timeout })

  // Fill login form
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)

  // Submit form and wait for navigation
  await Promise.all([page.waitForNavigation({ timeout }), page.click('button[type="submit"]')])

  // Verify authentication was successful
  await page.waitForTimeout(2000)

  if (page.url().includes('/login')) {
    throw new Error(`Authentication failed for ${user.email}. Still on login page.`)
  }

  console.log(`✅ Successfully authenticated: ${user.email}`)
  console.log(`📍 Redirected to: ${page.url()}`)
}

/**
 * Navigate to profile page with authentication
 */
export async function navigateToProfile(page: Page, options: AuthOptions = {}) {
  // First authenticate
  await authenticateUser(page, options)

  // Then navigate to profile
  await page.goto('/profile')
  await page.waitForLoadState('networkidle')

  // Verify we're on the profile page
  if (page.url().includes('/login')) {
    throw new Error('Failed to access profile page - redirected to login')
  }

  console.log(`📍 Successfully navigated to profile: ${page.url()}`)
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
    return !page.url().includes('/login')
  } catch (error) {
    return false
  }
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Look for logout button or link
  const logoutSelectors = [
    'button:has-text("Logout")',
    'button:has-text("Sign Out")',
    'a:has-text("Logout")',
    'a:has-text("Sign Out")',
    '[data-testid="logout"]',
  ]

  for (const selector of logoutSelectors) {
    try {
      const element = page.locator(selector)
      if ((await element.count()) > 0) {
        await element.click()
        await page.waitForLoadState('networkidle')
        console.log('✅ Successfully logged out')
        return
      }
    } catch (error) {
      // Continue to next selector
    }
  }

  // If no logout button found, clear cookies/storage
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  console.log('✅ Logged out by clearing session data')
}

/**
 * Wait for profile page to load completely
 */
export async function waitForProfilePageLoad(page: Page, timeout = 10000) {
  // Wait for profile-specific elements
  const profileSelectors = [
    '[data-testid="profile-layout"]',
    '.profile-layout',
    '[data-testid="profile-avatar"]',
    '.profile-avatar',
    'img[alt*="avatar"]',
    'main',
    'aside',
  ]

  let profileLoaded = false
  const startTime = Date.now()

  while (!profileLoaded && Date.now() - startTime < timeout) {
    for (const selector of profileSelectors) {
      try {
        const element = page.locator(selector)
        if ((await element.count()) > 0) {
          profileLoaded = true
          console.log(`✅ Profile page loaded (found: ${selector})`)
          break
        }
      } catch (error) {
        // Continue checking
      }
    }

    if (!profileLoaded) {
      await page.waitForTimeout(500)
    }
  }

  if (!profileLoaded) {
    console.log('⚠️  Profile page elements not found within timeout')
  }

  return profileLoaded
}

/**
 * Debug authentication state
 */
export async function debugAuthState(page: Page) {
  console.log('🔍 Debugging authentication state:')
  console.log(`   Current URL: ${page.url()}`)
  console.log(`   Page title: ${await page.title()}`)

  // Check for auth-related cookies
  const cookies = await page.context().cookies()
  const authCookies = cookies.filter(
    cookie =>
      cookie.name.toLowerCase().includes('auth') ||
      cookie.name.toLowerCase().includes('session') ||
      cookie.name.toLowerCase().includes('token'),
  )

  console.log(`   Auth cookies: ${authCookies.length}`)
  authCookies.forEach(cookie => {
    console.log(`     ${cookie.name}: ${cookie.value.substring(0, 20)}...`)
  })

  // Check localStorage
  const localStorage = await page.evaluate(() => {
    const items: Record<string, string> = {}
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key) {
        items[key] = window.localStorage.getItem(key) || ''
      }
    }
    return items
  })

  const authLocalStorage = Object.keys(localStorage).filter(
    key =>
      key.toLowerCase().includes('auth') ||
      key.toLowerCase().includes('user') ||
      key.toLowerCase().includes('token'),
  )

  console.log(`   Auth localStorage items: ${authLocalStorage.length}`)
  authLocalStorage.forEach(key => {
    console.log(`     ${key}: ${localStorage[key].substring(0, 20)}...`)
  })
}
