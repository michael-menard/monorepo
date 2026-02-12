/**
 * Sign In Step Definitions
 *
 * Tests for the user sign-in flow using seeded Cognito test users.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────

Given('I am on the login page', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  // Wait for email field to be visible
  await page.locator('#email').waitFor({ state: 'visible', timeout: 10000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Form Input
// ─────────────────────────────────────────────────────────────────────────────

When('I enter email {string}', async ({ page }, email: string) => {
  const emailInput = page.getByLabel('Email Address')
  await emailInput.waitFor({ state: 'visible' })
  await emailInput.fill(email)
  // Verify fill worked
  const value = await emailInput.inputValue()
  console.log(`Email filled: ${value}`)
})

When('I enter password {string}', async ({ page }, password: string) => {
  const passwordInput = page.getByLabel('Password', { exact: true })
  await passwordInput.waitFor({ state: 'visible' })
  await passwordInput.fill(password)
  // Verify fill worked
  const value = await passwordInput.inputValue()
  console.log(`Password filled: ${value ? '***' : '(empty)'}`)
})

When('I click the sign in button', async ({ page }) => {
  // Click and wait for navigation or network response
  const [response] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes('cognito') || resp.url().includes('auth'),
      { timeout: 10000 }
    ).catch(() => null),
    page.locator('button[type="submit"]').click(),
  ])

  if (response) {
    console.log(`Auth response: ${response.status()} ${response.url()}`)
  } else {
    console.log('No auth response detected')
  }

  // Wait a moment for any redirect
  await page.waitForTimeout(2000)
  console.log(`Current URL after login: ${page.url()}`)
})

// ─────────────────────────────────────────────────────────────────────────────
// Success Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('I should be redirected to the dashboard', async ({ page }) => {
  // After login, user should be redirected to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  expect(page.url()).toContain('/dashboard')
})

Then('I should see the user is authenticated', async ({ page }) => {
  // Check for signs of authentication - either user menu, logout button, or dashboard content
  const authIndicators = [
    page.getByRole('button', { name: /sign out|logout|account/i }),
    page.locator('[data-testid="user-menu"]'),
    page.locator('[data-testid="authenticated"]'),
  ]

  let isAuthenticated = false
  for (const indicator of authIndicators) {
    if (await indicator.isVisible().catch(() => false)) {
      isAuthenticated = true
      break
    }
  }

  // If no explicit indicator, check we're not on login/register page
  if (!isAuthenticated) {
    const url = page.url()
    expect(url).not.toContain('/login')
    expect(url).not.toContain('/register')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Validation Error Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see email validation error', async ({ page }) => {
  await page.waitForTimeout(500) // Wait for validation
  const emailError = page
    .locator('#email-error')
    .or(page.getByText(/valid email|email.*required/i))
  await expect(emailError.first()).toBeVisible({ timeout: 5000 })
})

Then('I should see password validation error', async ({ page }) => {
  await page.waitForTimeout(500)
  const passwordError = page
    .locator('#password-error')
    .or(page.getByText(/password.*required|enter.*password/i))
  await expect(passwordError.first()).toBeVisible({ timeout: 5000 })
})

Then('I should see an authentication error', async ({ page }) => {
  // Wait for auth error message
  await page.waitForTimeout(2000) // Give Cognito time to respond
  const authError = page
    .locator('[data-testid="login-error"]')
    .or(page.getByText(/incorrect|invalid|not found|failed|wrong/i))
  await expect(authError.first()).toBeVisible({ timeout: 10000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// UI Element Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see an email input field', async ({ page }) => {
  await expect(page.locator('#email')).toBeVisible()
})

Then('I should see a password input field', async ({ page }) => {
  await expect(page.locator('#password')).toBeVisible()
})

// Note: "I should see a {string} button" and "I should see a {string} link" are in common.steps.ts

Then('I should see a link to register', async ({ page }) => {
  const registerLink = page.getByRole('link', { name: /sign up|register|create account/i })
  await expect(registerLink).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Navigation Assertions
// ─────────────────────────────────────────────────────────────────────────────

When('I click the register link', async ({ page }) => {
  const registerLink = page.getByRole('link', { name: /sign up|register|create account/i })
  await registerLink.click()
})

// Note: "I should be on the registration page" is in common.steps.ts

// ============================================================================
// Additional Sign In Steps (INST-1111)
// ============================================================================

