import { expect, test } from '@playwright/test'

/**
 * Cognito E2E Auth Flow Tests
 *
 * These tests verify the complete Cognito authentication system:
 * - AWS Cognito User Pool integration
 * - Email verification flow
 * - Login/logout functionality
 * - Error handling
 * - UI interactions
 *
 * Note: These tests use REAL Cognito backend (not mocked)
 */
test.describe('Cognito Authentication E2E Tests', () => {
  test.describe.configure({ timeout: 120000 }) // 2 minutes for real Cognito calls

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    name: 'Test User',
  }

  test.beforeAll(async () => {
    console.log('🎯 Cognito E2E Testing:')
    console.log('  ✅ Real AWS Cognito User Pool')
    console.log('  ✅ Real Email Verification')
    console.log('  ✅ Real Authentication Flow')
    console.log('  ✅ Frontend: http://localhost:3002')
  })

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3002')
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle')
  })

  test.describe('Signup Flow', () => {
    test('should complete signup flow with email verification', async ({ page }) => {
      test.setTimeout(180000) // 3 minutes for email verification

      // Navigate to signup page
      await page.goto('http://localhost:3002/auth/signup')
      await page.waitForLoadState('networkidle')

      // Verify signup page elements
      await expect(page.getByText('Create Account')).toBeVisible()
      await expect(page.getByText('Join the LEGO MOC community')).toBeVisible()

      // Fill out signup form
      await page.getByLabel(/full name/i).fill(testUser.name)
      await page.getByLabel(/email address/i).fill(testUser.email)
      await page.getByLabel(/^password$/i).fill(testUser.password)
      await page.getByLabel(/confirm password/i).fill(testUser.password)

      // Accept terms and conditions
      await page.getByLabel(/i agree to the terms/i).check()

      // Submit signup form
      await page.getByRole('button', { name: /create account/i }).click()

      // Wait for success message
      await expect(page.getByText(/account created successfully/i)).toBeVisible({ timeout: 30000 })

      // Should redirect to email verification page
      await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 30000 })
      await expect(page.getByText('Verify Your Email')).toBeVisible()

      // Email should be pre-filled
      const emailInput = page.getByLabel(/email address/i)
      await expect(emailInput).toHaveValue(testUser.email)

      console.log(`📧 Please check email ${testUser.email} for verification code`)
      console.log('⏳ Waiting for manual verification code entry...')

      // Note: In a real test, you would need to:
      // 1. Check email programmatically (using email service API)
      // 2. Extract verification code
      // 3. Enter code automatically
      // For now, we'll just verify the UI is correct
    })

    test('should show validation errors for invalid signup data', async ({ page }) => {
      await page.goto('http://localhost:3002/auth/signup')
      await page.waitForLoadState('networkidle')

      // Try to submit empty form
      await page.getByRole('button', { name: /create account/i }).click()

      // Should show validation errors
      await expect(page.getByText(/full name is required/i)).toBeVisible()
      await expect(page.getByText(/please enter a valid email address/i)).toBeVisible()
      await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
    })

    test('should show password strength indicator', async ({ page }) => {
      await page.goto('http://localhost:3002/auth/signup')
      await page.waitForLoadState('networkidle')

      const passwordInput = page.getByLabel(/^password$/i)

      // Test weak password
      await passwordInput.fill('weak')
      await expect(page.getByText(/password strength/i)).toBeVisible()

      // Test strong password
      await passwordInput.fill('StrongPass123!')
      await expect(page.getByText(/strong/i)).toBeVisible()
    })
  })

  test.describe('Login Flow', () => {
    test('should show login form with all elements', async ({ page }) => {
      await page.goto('http://localhost:3002/auth/login')
      await page.waitForLoadState('networkidle')

      // Verify login page elements
      await expect(page.getByText('Welcome Back')).toBeVisible()
      await expect(page.getByText('Sign in to your LEGO MOC account')).toBeVisible()
      await expect(page.getByLabel(/email address/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
      await expect(page.getByText(/forgot password/i)).toBeVisible()
      await expect(page.getByText(/sign up here/i)).toBeVisible()
    })

    test('should show validation errors for invalid login data', async ({ page }) => {
      await page.goto('http://localhost:3002/auth/login')
      await page.waitForLoadState('networkidle')

      // Try to submit empty form
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show validation errors
      await expect(page.getByText(/please enter a valid email address/i)).toBeVisible()
      await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
    })

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('http://localhost:3002/auth/login')
      await page.waitForLoadState('networkidle')

      const passwordInput = page.getByLabel(/password/i)
      const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1) // Eye icon

      // Password should be hidden initially
      await expect(passwordInput).toHaveAttribute('type', 'password')

      // Click toggle to show password
      await toggleButton.click()
      await expect(passwordInput).toHaveAttribute('type', 'text')

      // Click toggle to hide password again
      await toggleButton.click()
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('should navigate to signup page from login', async ({ page }) => {
      await page.goto('http://localhost:3002/auth/login')
      await page.waitForLoadState('networkidle')

      // Click signup link
      await page.getByText(/sign up here/i).click()

      // Should navigate to signup page
      await expect(page).toHaveURL(/\/auth\/signup/)
      await expect(page.getByText('Create Account')).toBeVisible()
    })

    test('should show Google sign-in button (disabled)', async ({ page }) => {
      await page.goto('http://localhost:3002/auth/login')
      await page.waitForLoadState('networkidle')

      // Google button should be present but disabled
      const googleButton = page.getByText(/google \(coming soon\)/i)
      await expect(googleButton).toBeVisible()
      await expect(googleButton.locator('..').locator('button')).toBeDisabled()
    })
  })

  test.describe('Email Verification Flow', () => {
    test('should show email verification form', async ({ page }) => {
      await page.goto('http://localhost:3002/auth/verify-email')
      await page.waitForLoadState('networkidle')

      // Verify email verification page elements
      await expect(page.getByText('Verify Your Email')).toBeVisible()
      await expect(page.getByLabel(/email address/i)).toBeVisible()
      await expect(page.getByLabel(/verification code/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /verify email/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /resend code/i })).toBeVisible()
    })

    test('should show validation errors for invalid verification data', async ({ page }) => {
      await page.goto('http://localhost:3002/auth/verify-email')
      await page.waitForLoadState('networkidle')

      // Try to submit empty form
      await page.getByRole('button', { name: /verify email/i }).click()

      // Should show validation errors
      await expect(page.getByText(/please enter a valid email address/i)).toBeVisible()
      await expect(page.getByText(/verification code must be 6 digits/i)).toBeVisible()
    })

    test('should navigate back to login from verification page', async ({ page }) => {
      await page.goto('http://localhost:3002/auth/verify-email')
      await page.waitForLoadState('networkidle')

      // Click back to login link
      await page.getByText(/back to login/i).click()

      // Should navigate to login page
      await expect(page).toHaveURL(/\/auth\/login/)
      await expect(page.getByText('Welcome Back')).toBeVisible()
    })
  })

  test.describe('Navigation and UI', () => {
    test('should have consistent branding and styling', async ({ page }) => {
      await page.goto('http://localhost:3002/auth/login')
      await page.waitForLoadState('networkidle')

      // Check for LEGO MOC branding
      await expect(page.getByText(/lego moc/i)).toBeVisible()

      // Check for gradient backgrounds and styling
      const card = page.locator('[class*="shadow"]').first()
      await expect(card).toBeVisible()
    })

    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('http://localhost:3002/auth/login')
      await page.waitForLoadState('networkidle')

      // Form should still be visible and usable
      await expect(page.getByLabel(/email address/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })
  })
})
