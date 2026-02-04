/**
 * Common shared step definitions used across multiple feature files
 *
 * IMPORTANT: All authentication MUST use real Cognito JWTs.
 * See utils/api-auth.ts for the authentication utilities.
 * See fixtures/browser-auth.fixture.ts for UI tests with auth.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { TEST_USERS, authState } from '../utils/api-auth'

const { Given, Then } = createBdd()

// Authentication steps - Use real Cognito JWT
// NOTE: For UI tests, prefer using the browser-auth.fixture.ts with `authenticatedPage`
// These steps are for API tests that need to authenticate programmatically
Given('I am logged in as a test user', async () => {
  // Authenticate with real Cognito - gets actual JWT token
  await authState.setUser(TEST_USERS.primary)
})

Given('I am logged in as the primary test user', async () => {
  await authState.setUser(TEST_USERS.primary)
})

Given('I am logged in as the secondary test user', async () => {
  await authState.setUser(TEST_USERS.secondary)
})

// Common UI Element visibility steps
Then('I should see the page title {string}', async ({ page }, title: string) => {
  const heading = page.getByRole('heading', { name: title })
  await expect(heading).toBeVisible()
})

Then('I should see a {string} button', async ({ page }, buttonText: string) => {
  // Use exact: true to avoid matching buttons that contain the text
  const button = page.getByRole('button', { name: buttonText, exact: true })
  await expect(button).toBeVisible()
})

Then('I should see a {string} link', async ({ page }, linkText: string) => {
  const link = page.getByRole('link', { name: new RegExp(linkText, 'i') })
  await expect(link).toBeVisible()
})

// Common navigation steps
Then('I should be redirected to the registration page', async ({ page }) => {
  await page.waitForURL(/\/register/, { timeout: 5000 })
  expect(page.url()).toContain('/register')
})

Then('I should be on the registration page', async ({ page }) => {
  await page.waitForURL(/\/register/)
  expect(page.url()).toContain('/register')
})
