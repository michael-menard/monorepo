/**
 * Common shared step definitions used across multiple feature files
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { setupAuthMock, setupUploadMocks } from '../utils'

const { Given, Then } = createBdd()

// Authentication steps
Given('I am logged in as a test user', async ({ page }) => {
  // Set up mock authentication state
  await setupAuthMock(page, {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
  })

  // Set up upload API mocks for uploader tests
  await setupUploadMocks(page)

  // Set auth cookies/localStorage as needed
  await page.evaluate(() => {
    // Mock auth state in localStorage (Amplify pattern)
    const authKey = 'CognitoIdentityServiceProvider.testClientId.testUser'
    localStorage.setItem(
      `${authKey}.idToken`,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxODAwMDAwMDAwfQ.mock-signature',
    )
    localStorage.setItem(`${authKey}.accessToken`, 'mock-access-token')
    localStorage.setItem('auth:user', JSON.stringify({
      userId: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      isAuthenticated: true,
    }))
  })
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
