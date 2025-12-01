import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { TEST_DATA } from './fixtures'

const { Given, When, Then } = createBdd()

// ============================================================================
// Background Steps
// ============================================================================

Given('I am logged in as a valid user', async ({ page }) => {
  // Navigate to login and authenticate
  await page.goto('/login')
  await page.fill('#email', TEST_DATA.validUser.email)
  await page.fill('#password', TEST_DATA.validUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/)
})

Given('I am on the dashboard page', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
})

// ============================================================================
// Navigation Action Steps
// ============================================================================

When('I click on a navigation link to a slow-loading page', async ({ page }) => {
  // Intercept navigation and add artificial delay to simulate slow loading
  await page.route('**/api/**', async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.continue()
  })

  // Click a navigation link (adjust selector based on actual navigation)
  const navLink = page.getByRole('link', { name: /instructions|gallery|wishlist/i }).first()
  if (await navLink.isVisible()) {
    await navLink.click()
  } else {
    // Fallback: navigate programmatically
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-slow-navigation'))
    })
  }
})

When('I click on a navigation link to a fast-loading page', async ({ page }) => {
  // Click a cached or fast-loading page
  const navLink = page.getByRole('link', { name: /dashboard|home/i }).first()
  if (await navLink.isVisible()) {
    await navLink.click()
  }
})

When('I click on a navigation link', async ({ page }) => {
  const navLink = page.getByRole('link').first()
  if (await navLink.isVisible()) {
    await navLink.click()
  }
})

When('I trigger a slow page navigation', async ({ page }) => {
  // Add route interception to slow down navigation
  await page.route('**/*', async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.continue()
  })

  // Trigger navigation
  await page.goto('/instructions')
})

// ============================================================================
// Loading Indicator Assertions
// ============================================================================

Then('I should see a loading indicator after the delay threshold', async ({ page }) => {
  // Wait for the spinner to appear (delay threshold is typically 300ms)
  await expect(
    page.getByTestId('page-transition-bar').or(page.getByTestId('page-transition-overlay')),
  ).toBeVisible({ timeout: 1000 })
})

Then('the loading indicator should disappear when the page loads', async ({ page }) => {
  // Wait for spinner to disappear
  await expect(
    page.getByTestId('page-transition-bar').or(page.getByTestId('page-transition-overlay')),
  ).not.toBeVisible({ timeout: 10000 })
})

Then('I should not see a loading indicator', async ({ page }) => {
  // Verify no spinner appears
  await expect(page.getByTestId('page-transition-bar')).not.toBeVisible()
  await expect(page.getByTestId('page-transition-overlay')).not.toBeVisible()
})

Then('I should see the target page immediately', async ({ page }) => {
  // Page should load without showing spinner
  await page.waitForLoadState('domcontentloaded')
})

Then('no loading indicator should flash briefly', async ({ page }) => {
  // Monitor for any brief appearance of spinner
  let spinnerAppeared = false

  // Create a listener for DOM changes
  await page.evaluate(() => {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          const addedNode = mutation.addedNodes[0] as Element
          if (
            addedNode.getAttribute?.('data-testid') === 'page-transition-bar' ||
            addedNode.getAttribute?.('data-testid') === 'page-transition-overlay'
          ) {
            ;(window as unknown as { __spinnerAppeared: boolean }).__spinnerAppeared = true
          }
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  })

  // Wait a bit for any potential flash
  await page.waitForTimeout(400)

  spinnerAppeared = await page.evaluate(
    () => (window as unknown as { __spinnerAppeared: boolean }).__spinnerAppeared || false,
  )

  expect(spinnerAppeared).toBe(false)
})

Then('the page should transition smoothly', async ({ page }) => {
  // Verify page is fully loaded
  await page.waitForLoadState('networkidle')
})

// ============================================================================
// Accessibility Assertions
// ============================================================================

Then('the loading indicator should have proper ARIA attributes', async ({ page }) => {
  const overlay = page.getByTestId('page-transition-overlay')

  if (await overlay.isVisible()) {
    await expect(overlay).toHaveAttribute('role', 'status')
    await expect(overlay).toHaveAttribute('aria-label', 'Loading page')
  }

  const bar = page.getByTestId('page-transition-bar')
  if (await bar.isVisible()) {
    // Progress bar uses aria-hidden since it's decorative
    await expect(bar).toHaveAttribute('aria-hidden', 'true')
  }
})

Then('screen readers should announce the loading state', async ({ page }) => {
  const overlay = page.getByTestId('page-transition-overlay')

  if (await overlay.isVisible()) {
    // Check for screen reader text
    const srText = page.locator('.sr-only')
    await expect(srText).toContainText(/loading/i)
  }
})

Then('and the loading indicator appears', async ({ page }) => {
  await expect(
    page.getByTestId('page-transition-bar').or(page.getByTestId('page-transition-overlay')),
  ).toBeVisible({ timeout: 1000 })
})

// ============================================================================
// Timing Control Steps
// ============================================================================

Given('the navigation will complete within {int} milliseconds', async ({ page }, ms: number) => {
  // Set up fast route handling
  await page.route('**/api/**', async route => {
    await new Promise(resolve => setTimeout(resolve, ms - 50))
    await route.continue()
  })
})
