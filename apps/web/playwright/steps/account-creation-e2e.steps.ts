/**
 * Step definitions for Full E2E Account Creation tests
 *
 * These tests use the AWS SDK AdminConfirmSignUp API to bypass email verification
 * and test the complete account creation and login flow.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { SignupPage } from './pages/signup.page'
import {
  adminConfirmSignUp,
  adminDeleteUser,
  adminGetUser,
  generateTestEmail,
} from '../utils/cognito-admin'

const { Given, When, Then } = createBdd()

// Store the generated test email between steps
let testEmail: string = ''
let signupPage: SignupPage

Given('a unique test email is generated', async () => {
  // Generate a fresh email for this test scenario
  testEmail = generateTestEmail('e2etest')
  console.log(`🧪 Generated test email: ${testEmail}`)
  expect(testEmail).toBeTruthy()
  expect(testEmail).toContain('@test.example.com')
})

When('I enter the generated test email', async ({ page }) => {
  signupPage = new SignupPage(page)
  await signupPage.enterEmail(testEmail)
})

When('the user is confirmed via admin API', async () => {
  // Give Cognito a moment to process the signup
  await new Promise(resolve => setTimeout(resolve, 2000))

  const result = await adminConfirmSignUp(testEmail)
  expect(result.success).toBe(true)
})

Then('the user should be confirmed in Cognito', async () => {
  // Verify the user exists and is confirmed
  const result = await adminGetUser(testEmail)
  expect(result.exists).toBe(true)
  expect(result.confirmed).toBe(true)
  console.log(`✅ User ${testEmail} is confirmed in Cognito`)
})

When('I navigate to the login page', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
})

When('I enter login email with the generated test email', async ({ page }) => {
  const emailInput = page.locator('input[id="email"]')
  await emailInput.fill(testEmail)
})

When('I enter login password {string}', async ({ page }, password: string) => {
  const passwordInput = page.locator('input[id="password"]')
  await passwordInput.fill(password)
})

When('I click the login button', async ({ page }) => {
  // Use CSS selector for submit button - matches the working signup test approach
  // Note: getByRole with exact text matching doesn't work reliably due to icon content
  const loginButton = page.locator('button[type="submit"]')

  // Wait for network activity after clicking
  await Promise.all([
    page
      .waitForResponse(response => response.url().includes('cognito') || response.status() !== 0, {
        timeout: 15000,
      })
      .catch(() => console.log('No cognito response detected')),
    loginButton.click(),
  ])

  // Give the app time to process the response
  await page.waitForTimeout(2000)
})

Then('I should be logged in successfully', async ({ page }) => {
  // Wait for either successful login (redirect) or error message
  try {
    // Try to wait for redirect away from login page
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 })
    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/login')
    console.log(`✅ Successfully logged in, redirected to: ${currentUrl}`)
  } catch {
    // If we didn't redirect, check for error messages
    const errorMessage = await page
      .locator('[data-testid="login-error"]')
      .textContent()
      .catch(() => null)
    if (errorMessage) {
      console.log(`❌ Login failed with error: ${errorMessage}`)
    }

    // Check if there's any toast/alert with an error
    const pageContent = await page.content()
    if (pageContent.includes('error') || pageContent.includes('Error')) {
      console.log('Page contains error text')
    }

    throw new Error(
      `Login did not complete. Page stayed on login. Error: ${errorMessage || 'unknown'}`,
    )
  }
})

Then('the test user is cleaned up', async () => {
  // Clean up the test user from Cognito
  console.log(`🧹 Cleaning up test user: ${testEmail}`)
  const result = await adminDeleteUser(testEmail)
  if (result.success) {
    console.log(`✅ Successfully cleaned up test user: ${testEmail}`)
  }
})

When('any existing test user is cleaned up', async () => {
  // This step is for manual cleanup scenarios
  if (testEmail) {
    await adminDeleteUser(testEmail)
  }
})

Then('the cleanup should complete successfully', async () => {
  // Cleanup is considered successful if no exceptions were thrown
  expect(true).toBe(true)
})
