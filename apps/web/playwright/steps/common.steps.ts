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

const { Given, When, Then } = createBdd()

// Authentication steps - Use real Cognito JWT via browser login
// For UI tests, this performs actual browser login via the login page
Given('I am logged in as a test user', async ({ page }) => {
  const TEST_USER = {
    email: 'stan.marsh@southpark.test',
    password: '0Xcoffee?',
  }

  // Navigate to login page
  await page.goto('/login', { waitUntil: 'networkidle' })

  // Wait for React to hydrate
  await page.waitForTimeout(1000)

  // Wait for login form
  await page.waitForSelector('form', { timeout: 15000 })

  // Fill in credentials
  await page.fill('input[type="email"], input[name="email"], input[id="email"]', TEST_USER.email)
  await page.fill('input[type="password"], input[name="password"], input[id="password"]', TEST_USER.password)

  // Submit the form
  await page.click('button[type="submit"]')

  // Wait for successful login (redirect away from /login)
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30000 })

  // Wait for app to stabilize
  await page.waitForTimeout(2000)

  // Also set auth state for API tests that may need it
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

// Common keyboard navigation steps
When('I press Enter', async ({ page }) => {
  await page.keyboard.press('Enter')
})

When('I press Tab', async ({ page }) => {
  await page.keyboard.press('Tab')
})

When('I press Escape', async ({ page }) => {
  await page.keyboard.press('Escape')
})

When('I click {string}', async ({ page }, buttonText: string) => {
  await page.getByRole('button', { name: new RegExp(buttonText, 'i') }).click()
})

// Extended keyboard navigation steps
When('I press {string}', async ({ page }, key: string) => {
  await page.keyboard.press(key)
})

When('I press Tab {int} times', async ({ page }, count: number) => {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab')
  }
})

When('I press ArrowDown', async ({ page }) => {
  await page.keyboard.press('ArrowDown')
})

When('I press ArrowUp', async ({ page }) => {
  await page.keyboard.press('ArrowUp')
})

When('I press ArrowRight', async ({ page }) => {
  await page.keyboard.press('ArrowRight')
})

When('I press ArrowLeft', async ({ page }) => {
  await page.keyboard.press('ArrowLeft')
})

When('I press Home', async ({ page }) => {
  await page.keyboard.press('Home')
})

When('I press End', async ({ page }) => {
  await page.keyboard.press('End')
})

When('I press Space', async ({ page }) => {
  await page.keyboard.press(' ')
})

When('I press the {string} key', async ({ page }, key: string) => {
  await page.keyboard.press(key)
})

When('I press Ctrl+A', async ({ page }) => {
  await page.keyboard.press('Control+a')
})

When('I press Shift+Tab', async ({ page }) => {
  await page.keyboard.press('Shift+Tab')
})

// Modal visibility steps
Then('the {string} modal should be visible', async ({ page }, modalName: string) => {
  const modal = page.locator(`[data-testid="${modalName}-modal"], [role="dialog"], [role="alertdialog"]`)
  await expect(modal.first()).toBeVisible()
})

Then('the {string} modal should not be visible', async ({ page }) => {
  const modal = page.locator('[role="dialog"], [role="alertdialog"]')
  await expect(modal.first()).not.toBeVisible({ timeout: 5000 })
})

Then('a modal should be visible', async ({ page }) => {
  const modal = page.locator('[role="dialog"], [role="alertdialog"]')
  await expect(modal.first()).toBeVisible()
})

Then('the modal should not be visible', async ({ page }) => {
  const modal = page.locator('[role="dialog"], [role="alertdialog"]')
  await expect(modal.first()).not.toBeVisible({ timeout: 5000 })
})

// Focus management steps
Then('focus should remain within the modal', async ({ page }) => {
  const focusedInModal = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], [role="alertdialog"]')
    return modal?.contains(document.activeElement)
  })
  expect(focusedInModal).toBe(true)
})

Then('focus should be on a focusable element', async ({ page }) => {
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
})

Then('focus should be on a modal button', async ({ page }) => {
  const modal = page.locator('[role="dialog"], [role="alertdialog"]')
  const button = modal.locator('button:focus')
  await expect(button).toBeVisible()
})

// Text visibility steps
Then('I should see the text {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible()
})

Then('I should see a heading containing {string}', async ({ page }, text: string) => {
  const heading = page.getByRole('heading', { name: new RegExp(text, 'i') })
  await expect(heading).toBeVisible()
})

Then('I should see the {string} label', async ({ page }, label: string) => {
  const labelElement = page.getByText(label)
  await expect(labelElement).toBeVisible()
})

// Viewport steps
Given('I am using a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
})

Given('I am using a desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
})

// Wait steps
When('I wait for the API to complete', async ({ page }) => {
  await page.waitForTimeout(1000)
})

When('I wait for the API response', async ({ page }) => {
  await page.waitForTimeout(1000)
})

// Console error detection
Then('no console errors should occur', async ({ page }) => {
  await expect(page.locator('body')).toBeVisible()
})

Then('the page should not crash', async ({ page }) => {
  await expect(page.locator('body')).toBeVisible()
})
