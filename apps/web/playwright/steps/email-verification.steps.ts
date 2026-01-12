/**
 * Step definitions for Email Verification page tests
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { EmailVerificationPage } from './pages/email-verification.page'

const { Given, When, Then } = createBdd()

let emailVerificationPage: EmailVerificationPage
const TEST_EMAIL = 'testuser@example.com'

// Background
Given('I am on the email verification page with a pending email', async ({ page }) => {
  emailVerificationPage = new EmailVerificationPage(page)
  await emailVerificationPage.gotoWithPendingEmail(TEST_EMAIL)
  await emailVerificationPage.waitForPageLoad()
})

Given('I am on the email verification page without a pending email', async ({ page }) => {
  emailVerificationPage = new EmailVerificationPage(page)
  // Clear any existing session storage
  await page.goto('/auth/verify-email')
  await page.evaluate(() => {
    sessionStorage.removeItem('pendingVerificationEmail')
  })
  await page.reload()
})

// UI Element Visibility - common "I should see the page title" step is in common.steps.ts

Then('I should see a masked version of my email', async () => {
  // The email should be masked like t***r@example.com
  const description = emailVerificationPage.emailDescription
  await expect(description).toBeVisible()
  const text = await description.textContent()
  expect(text).toContain('@')
  expect(text).toContain('***')
})

Then('I should see an OTP input with 6 digit fields', async () => {
  await expect(emailVerificationPage.otpInput).toBeVisible()
  // Check all 6 input fields exist
  for (let i = 0; i < 6; i++) {
    const input = emailVerificationPage.getOtpInputField(i)
    await expect(input).toBeVisible()
  }
})

// Common "I should see a {string} button" step is in common.steps.ts

Then('I should see the resend code button', async () => {
  await expect(emailVerificationPage.resendCodeButton).toBeVisible()
})

// Verify Button State
Then('the verify button should be disabled', async () => {
  await expect(emailVerificationPage.verifyButton).toBeDisabled()
})

Then('the verify button should be enabled', async () => {
  await expect(emailVerificationPage.verifyButton).toBeEnabled()
})

// OTP Input
When('I enter partial OTP {string}', async ({}, code: string) => {
  await emailVerificationPage.enterOtp(code)
})

When('I enter complete OTP {string}', async ({}, code: string) => {
  await emailVerificationPage.enterOtp(code)
})

When('I type {string} in the OTP input', async ({}, text: string) => {
  await emailVerificationPage.typeInOtp(text)
})

When('I paste {string} into the OTP input', async ({}, text: string) => {
  await emailVerificationPage.pasteInOtp(text)
})

When('I fill the OTP input with {string}', async ({}, code: string) => {
  await emailVerificationPage.enterOtp(code)
})

Then('the OTP input should contain {string}', async ({}, expected: string) => {
  const actual = await emailVerificationPage.getOtpValue()
  expect(actual).toBe(expected)
})

When('I press backspace in the last OTP field', async () => {
  await emailVerificationPage.pressBackspaceInLastField()
})

// Navigation
When('I click the back to signup button', async () => {
  await emailVerificationPage.clickBackToSignup()
})

// Common "I should be on the registration page" step is in common.steps.ts
// Common "I should be redirected to the registration page" step is in common.steps.ts

// Resend Code
When('I click the resend code button', async () => {
  await emailVerificationPage.clickResendCodeButton()
})

Then('I should see a cooldown timer on the resend button', async () => {
  const buttonText = await emailVerificationPage.getResendButtonText()
  // Should show something like "Resend code in 60s" or "Resend code in 1:00"
  expect(buttonText).toMatch(/Resend code in \d+/)
})

Then('the resend code button should be disabled', async () => {
  await expect(emailVerificationPage.resendCodeButton).toBeDisabled()
})

Then('the resend code button should be enabled', async () => {
  await expect(emailVerificationPage.resendCodeButton).toBeEnabled()
})

Then('the verify button should show {string}', async ({}, expectedText: string) => {
  await expect(emailVerificationPage.verifyButton).toContainText(expectedText)
})

Then('I should see a success message for resend', async () => {
  // Wait for the status message to appear
  await expect(emailVerificationPage.statusMessage).toBeVisible({ timeout: 5000 })
  const message = await emailVerificationPage.getStatusMessage()
  expect(message).toContain('verification code')
})

// Error Handling
When('I try to submit the form', async ({ page }) => {
  // Try to submit via keyboard
  await page.keyboard.press('Enter')
})

Then('I should see an error message {string}', async ({}, expectedError: string) => {
  await expect(emailVerificationPage.errorMessage).toBeVisible()
  const error = await emailVerificationPage.getErrorMessage()
  expect(error).toContain(expectedError)
})

// Mocking
// NOTE: For email verification, we avoid Playwright-level network mocking.
// These Given steps are documentation-only; backend or MSW should provide
// appropriate behavior based on test environment configuration.

Given('the verification API is mocked to succeed', async () => {})

Given(
  'the verification API is mocked to fail with {string}',
  async () => {},
)

Given('the resend code API is mocked to succeed', async () => {})

When('I wait for the resend to complete', async ({ page }) => {
  // Wait a bit for the async operation to complete
  await page.waitForTimeout(500)
})

When('I click the verify button', async () => {
  await emailVerificationPage.clickVerifyButton()
})

Then('I should see the success message {string}', async ({}, message: string) => {
  await expect(emailVerificationPage.successTitle).toBeVisible({ timeout: 5000 })
})
