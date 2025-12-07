/**
 * Step definitions for Login page tests
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// Background
Given('I am on the login page', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
})

// UI Elements - common "I should see the page title" step is in common.steps.ts

Then('I should see an email input field', async ({ page }) => {
  const emailInput = page.getByRole('textbox', { name: /email/i })
  await expect(emailInput).toBeVisible()
})

Then('I should see a password input field', async ({ page }) => {
  const passwordInput = page.getByPlaceholder(/password/i)
  await expect(passwordInput).toBeVisible()
})

// Common "I should see a {string} button" step is in common.steps.ts
// Common "I should see a {string} link" step is in common.steps.ts

Then('I should see a {string} checkbox', async ({ page }, label: string) => {
  const checkbox = page.getByRole('checkbox', { name: new RegExp(label, 'i') })
  await expect(checkbox).toBeVisible()
})

// Form Input
When('I enter email {string}', async ({ page }, email: string) => {
  const emailInput = page.getByRole('textbox', { name: /email/i })
  await emailInput.fill(email)
})

When('I enter password {string}', async ({ page }, password: string) => {
  const passwordInput = page.getByPlaceholder(/password/i)
  await passwordInput.fill(password)
})

When('I click the sign in button', async ({ page }) => {
  // Use button[type="submit"] to get the form submit button (same approach that works for signup)
  const signInButton = page.locator('button[type="submit"]')

  // Debug: Log button state before click
  const isDisabled = await signInButton.isDisabled()
  console.log(`Sign In button disabled state: ${isDisabled}`)

  // Debug: Check if form exists and has the onSubmit handler
  const formExists = await page.locator('form').count()
  console.log(`Forms on page: ${formExists}`)

  // Debug: Check if inputs have values before submission
  const emailValue = await page.locator('#email').inputValue()
  const passwordValue = await page.locator('#password').inputValue()
  console.log(`Email value: "${emailValue}"`)
  console.log(`Password value: "${passwordValue}"`)

  // Directly click the button
  await signInButton.click()

  // Give React time to process the form submission
  await page.waitForTimeout(1000)

  // Debug: Check for any console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`Console error: ${msg.text()}`)
    }
  })
})

// Validation Errors
Then('I should see email validation error', async ({ page }) => {
  const errorMessage = page.locator('#email-error')
  await expect(errorMessage).toBeVisible({ timeout: 5000 })
})

Then('I should see password validation error', async ({ page }) => {
  const errorMessage = page.locator('#password-error')
  await expect(errorMessage).toBeVisible({ timeout: 5000 })
})

Then('I should see email validation error {string}', async ({ page }, expectedError: string) => {
  const errorMessage = page.locator('#email-error')
  await expect(errorMessage).toBeVisible({ timeout: 5000 })
  await expect(errorMessage).toContainText(expectedError)
})

Then('I should see password validation error {string}', async ({ page }, expectedError: string) => {
  const errorMessage = page.locator('#password-error')
  await expect(errorMessage).toBeVisible({ timeout: 5000 })
  await expect(errorMessage).toContainText(expectedError)
})

// Button Loading State
Then('I should see the button in loading state', async ({ page }) => {
  // The button should show "Signing in..." when loading
  const loadingText = page.getByText('Signing in...')

  // This might fail - that's what we're investigating
  try {
    await expect(loadingText).toBeVisible({ timeout: 3000 })
    console.log('✅ Button showed loading state')
  } catch {
    // Check what the button actually says - use exact match
    const button = page.getByRole('button', { name: 'Sign In', exact: true })
    const buttonText = await button.textContent()
    console.log(`❌ Button did NOT show loading state. Current text: "${buttonText}"`)

    // Check if there's an error displayed
    const loginError = page.getByTestId('login-error')
    if (await loginError.isVisible()) {
      const errorText = await loginError.textContent()
      console.log(`Login error displayed: "${errorText}"`)
    }

    // Check if form validation errors are visible
    const emailError = page.locator('#email-error')
    const passwordError = page.locator('#password-error')
    if (await emailError.isVisible()) {
      console.log(`Email validation error: "${await emailError.textContent()}"`)
    }
    if (await passwordError.isVisible()) {
      console.log(`Password validation error: "${await passwordError.textContent()}"`)
    }

    // Still fail the test - this is the bug we're investigating
    throw new Error(`Button did not show loading state. Button text: "${buttonText}"`)
  }
})

// Navigation
When('I click the signup link', async ({ page }) => {
  const signupLink = page.getByRole('link', { name: /sign up/i })
  await signupLink.click()
})

When('I click the forgot password link', async ({ page }) => {
  const forgotLink = page.getByRole('link', { name: /forgot password/i })
  await forgotLink.click()
})

// Common "I should be redirected to the registration page" step is in common.steps.ts

Then('I should be redirected to the forgot password page', async ({ page }) => {
  await page.waitForURL(/\/forgot-password/, { timeout: 5000 })
  expect(page.url()).toContain('/forgot-password')
})
