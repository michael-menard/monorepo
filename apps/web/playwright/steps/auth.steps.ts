import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ============================================================================
// Background / Navigation Steps
// ============================================================================

Given('I am on the login page', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
})

// ============================================================================
// Assertion Steps - Page Elements
// ============================================================================

Then('I should see the login form', async ({ page }) => {
  await expect(page.getByRole('form')).toBeVisible()
})

Then('I should see the email input field', async ({ page }) => {
  await expect(page.getByTestId('email-input')).toBeVisible()
})

Then('I should see the password input field', async ({ page }) => {
  await expect(page.getByTestId('password-input')).toBeVisible()
})

Then('I should see the sign in button', async ({ page }) => {
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
})

// ============================================================================
// Action Steps - Form Interactions
// ============================================================================

When('I click the sign in button', async ({ page }) => {
  await page.getByRole('button', { name: /sign in/i }).click()
})

When('I click the sign up link', async ({ page }) => {
  await page.getByRole('link', { name: /sign up/i }).click()
})

When('I click the forgot password link', async ({ page }) => {
  await page.getByRole('link', { name: /forgot password/i }).click()
})

When('I enter {string} in the email field', async ({ page }, email: string) => {
  await page.getByTestId('email-input').fill(email)
})

When('I enter {string} in the password field', async ({ page }, password: string) => {
  await page.getByTestId('password-input').fill(password)
})

// ============================================================================
// Assertion Steps - Navigation
// ============================================================================

Then('I should be on the signup page', async ({ page }) => {
  await expect(page).toHaveURL(/\/signup/)
})

Then('I should be on the forgot password page', async ({ page }) => {
  await expect(page).toHaveURL(/\/forgot-password/)
})

Then('I should be on the dashboard', async ({ page }) => {
  await expect(page).toHaveURL(/\/dashboard/)
})

// ============================================================================
// Assertion Steps - Validation Errors
// ============================================================================

Then('I should see an email validation error', async ({ page }) => {
  await expect(page.getByText(/email is required/i)).toBeVisible()
})

Then('I should see an email format error', async ({ page }) => {
  await expect(page.getByText(/invalid email/i)).toBeVisible()
})

Then('I should see a password validation error', async ({ page }) => {
  await expect(page.getByText(/password is required/i)).toBeVisible()
})

Then('I should see an authentication error', async ({ page }) => {
  await expect(page.getByText(/invalid credentials|incorrect.*password/i)).toBeVisible()
})
