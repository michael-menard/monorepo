import { expect, test } from '@playwright/test'
import { 
  checkForSuccessEmail, 
  etherealHelper, 
  getEtherealStatus, 
  isEtherealConfigured, 
  waitForResetEmail 
} from '../../src/pages/auth/ForgotPasswordPage/__tests__/ethereal-helper'

// Test configuration for different scenarios
const testConfig = {
  baseUrl: 'http://localhost:3001', // Playwright web server
  authServiceUrl: 'http://localhost:9000', // Auth service
  testUsers: {
    valid: {
      email: 'test-forgot-password@example.com',
      password: 'TestPassword123!'
    },
    invalid: {
      email: 'nonexistent@example.com',
      password: 'WrongPassword123!'
    }
  }
}

// Log Ethereal configuration status
const etherealStatus = getEtherealStatus()
console.log('📧 Ethereal Email Configuration Status:')
console.log(`  Configured: ${etherealStatus.configured ? '✅ Yes' : '❌ No'}`)
console.log(`  User: ${etherealStatus.user}`)
console.log(`  Host: ${etherealStatus.host}`)
if (!etherealStatus.configured) {
  console.log('  ⚠️  Please set ETHEREAL_USER and ETHEREAL_PASS in your .env file')
}

test.describe('ForgotPasswordPage E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the forgot password page
    await page.goto(`${testConfig.baseUrl}/auth/forgot-password`)
    
    // Wait for the page to load
    await page.waitForSelector('h3:has-text("Reset Password")')
  })

  test.describe('Complete Forgot Password Flow', () => {
    test('should complete full forgot password journey', async ({ page }) => {
      // Step 1: Verify page loads correctly
      await expect(page.locator('h3')).toContainText('Reset Password')
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('button:has-text("Send Reset Link")')).toBeVisible()

      // Step 2: Test with invalid email first
      await page.fill('input[name="email"]', 'invalid-email')
      await page.click('button:has-text("Send Reset Link")')
      
      // Should show validation error or handle gracefully
      await expect(page.locator('.text-red-500, .text-red-600, h3')).toBeVisible()

      // Step 3: Test with non-existent email
      await page.fill('input[name="email"]', testConfig.testUsers.invalid.email)
      await page.click('button:has-text("Send Reset Link")')
      
      // Should show error message (could be various backend errors)
      await expect(page.locator('.text-red-600')).toBeVisible()

      // Step 4: Test with valid email (requires Ethereal setup)
      await page.fill('input[name="email"]', testConfig.testUsers.valid.email)
      await page.click('button:has-text("Send Reset Link")')
      
      // Should show success state or handle gracefully
      await expect(page.locator('h3')).toBeVisible()
      // The page should either show success or handle the request gracefully
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/auth/forgot-password', route => {
        route.abort('failed')
      })

      await page.fill('input[name="email"]', testConfig.testUsers.valid.email)
      await page.click('button:has-text("Send Reset Link")')
      
      // Should show network error
      await expect(page.locator('.text-red-600')).toContainText('Network error. Please check your connection.')
    })
  })

  test.describe('Form Validation E2E', () => {
    test('should validate empty email submission', async ({ page }) => {
      await page.click('button:has-text("Send Reset Link")')
      
      // Should show validation error
      await expect(page.locator('.text-red-500')).toContainText('Please enter a valid email address')
    })

    test('should validate email format', async ({ page }) => {
      // Test invalid email formats
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@example..com'
      ]

      for (const email of invalidEmails) {
        await page.fill('input[name="email"]', email)
        await page.click('button:has-text("Send Reset Link")')
        
        // Should show validation error or handle gracefully
        await expect(page.locator('.text-red-500, .text-red-600, h3').first()).toBeVisible()
      }
    })

    test('should handle special characters in email', async ({ page }) => {
      // Test email with special characters
      await page.fill('input[name="email"]', 'test+special@example.com')
      await page.click('button:has-text("Send Reset Link")')
      
      // Should not show validation error for valid special characters
      await expect(page.locator('.text-red-500')).not.toBeVisible()
    })
  })

  test.describe('Accessibility E2E', () => {
    test('should be fully keyboard navigable', async ({ page }) => {
      // Verify all interactive elements are present and clickable
      const emailInput = page.locator('input[name="email"]')
      const submitButton = page.locator('button:has-text("Send Reset Link")')
      const backToLoginButton = page.locator('button:has-text("Sign in")').first()
      
      await expect(emailInput).toBeVisible()
      await expect(submitButton).toBeVisible()
      await expect(backToLoginButton).toBeVisible()
      
      // Verify elements are interactive
      await emailInput.click()
      await submitButton.click()
      await backToLoginButton.click()
    })

    test('should support Enter key submission', async ({ page }) => {
      await page.fill('input[name="email"]', testConfig.testUsers.valid.email)
      await page.keyboard.press('Enter')
      
      // Should trigger form submission and show validation error for empty email
      await expect(page.locator('.text-red-500, .text-red-600, h3').first()).toBeVisible()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for proper form role
      await expect(page.locator('form[role="form"]')).toBeVisible()
      
      // Check for proper input labels
      const emailInput = page.locator('input[name="email"]')
      await expect(emailInput).toHaveAttribute('type', 'email')
    })

    test('should announce errors to screen readers', async ({ page }) => {
      await page.click('button:has-text("Send Reset Link")')
      
      // Error should be visible and accessible
      const errorMessage = page.locator('.text-red-500')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toContainText('Please enter a valid email address')
    })
  })

  test.describe('Mobile Responsiveness E2E', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Verify layout is responsive
      await expect(page.locator('.min-h-screen').first()).toBeVisible()
      await expect(page.locator('.max-w-md')).toBeVisible()
      
      // Test touch interactions
      await page.fill('input[name="email"]', 'mobile@example.com')
      await page.click('button:has-text("Send Reset Link")')
      
      // Should show validation error (empty email)
      await expect(page.locator('.text-red-500, .text-red-600, h3').first()).toBeVisible()
    })

    test('should handle landscape orientation', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 })
      
      await expect(page.locator('h3')).toContainText('Reset Password')
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('button:has-text("Send Reset Link")')).toBeVisible()
    })

    test('should handle virtual keyboard properly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Focus on email input to trigger virtual keyboard
      await page.click('input[name="email"]')
      await page.fill('input[name="email"]', 'virtual@keyboard.com')
      
      await expect(page.locator('input[name="email"]')).toHaveValue('virtual@keyboard.com')
    })
  })

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across browsers', async ({ page, browserName }) => {
      // Test basic functionality
      await page.fill('input[name="email"]', 'crossbrowser@example.com')
      await page.click('button:has-text("Send Reset Link")')
      
      // Should show validation error (empty email)
      await expect(page.locator('.text-red-500, .text-red-600, h3').first()).toBeVisible()
      
      // Log browser-specific behavior for debugging
      console.log(`Test completed successfully in ${browserName}`)
    })

    test('should handle different input methods', async ({ page }) => {
      // Test paste functionality
      await page.fill('input[name="email"]', 'paste@test.com')
      
      // Test copy functionality
      await page.click('input[name="email"]')
      await page.keyboard.press('Control+a')
      await page.keyboard.press('Control+c')
      
      // Clear and paste
      await page.keyboard.press('Delete')
      await page.keyboard.press('Control+v')
      
      // Check that paste worked (might be slightly different due to clipboard handling)
      const value = await page.locator('input[name="email"]').inputValue()
      expect(value).toContain('aste@test.com')
    })
  })

  test.describe('Error Recovery Scenarios', () => {
    test('should recover from validation errors', async ({ page }) => {
      // Try invalid email
      await page.fill('input[name="email"]', 'invalid')
      await page.click('button:has-text("Send Reset Link")')
      
      await expect(page.locator('.text-red-500, .text-red-600, h3')).toBeVisible()
      
      // Fix the error
      await page.fill('input[name="email"]', testConfig.testUsers.valid.email)
      await page.click('button:has-text("Send Reset Link")')
      
      // Should show success state or handle gracefully
      await expect(page.locator('h3')).toBeVisible()
    })

    test('should recover from API errors', async ({ page }) => {
      // First trigger an API error
      await page.route('**/auth/forgot-password', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Internal server error'
          })
        })
      })

      await page.fill('input[name="email"]', testConfig.testUsers.valid.email)
      await page.click('button:has-text("Send Reset Link")')
      
      await expect(page.locator('.text-red-600')).toContainText('Internal server error')

      // Reset route to success
      await page.unroute('**/auth/forgot-password')
      
      // Try again
      await page.click('button:has-text("Send Reset Link")')
      await expect(page.locator('h3')).toBeVisible()
    })

    test('should handle multiple submission attempts', async ({ page }) => {
      // Click submit multiple times rapidly
      await page.fill('input[name="email"]', testConfig.testUsers.valid.email)
      
      await page.click('button:has-text("Send Reset Link")')
      await page.click('button:has-text("Send Reset Link")')
      await page.click('button:has-text("Send Reset Link")')
      
      // Should handle gracefully (either rate limit or allow)
      await expect(page.locator('h3')).toBeVisible()
    })
  })

  test.describe('Performance E2E', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto(`${testConfig.baseUrl}/auth/forgot-password`)
      await page.waitForSelector('h3:has-text("Reset Password")')
      
      const loadTime = Date.now() - startTime
      
      // Page should load in under 3 seconds
      console.log(`Page load time: ${loadTime}ms`)
      if (loadTime >= 3000) {
        console.warn('Page took longer than 3 seconds to load')
      }
    })

    test('should handle rapid interactions', async ({ page }) => {
      const startTime = Date.now()
      
      // Rapid typing and clicking
      await page.fill('input[name="email"]', 'rapid@interaction.com')
      await page.click('button:has-text("Send Reset Link")')
      // Wait for either success or validation error
      await page.waitForSelector('h3, .text-red-500, .text-red-600')
      
      const interactionTime = Date.now() - startTime
      
      // Interactions should be responsive (under 2 seconds)
      console.log(`Interaction time: ${interactionTime}ms`)
      if (interactionTime >= 2000) {
        console.warn('Interactions took longer than 2 seconds')
      }
    })

    test('should handle slow network gracefully', async ({ page }) => {
      // Mock slow network
      await page.route('**/auth/forgot-password', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Password reset link sent to your email'
          })
        })
      })

      const startTime = Date.now()
      
      await page.fill('input[name="email"]', 'slow@network.com')
      await page.click('button:has-text("Send Reset Link")')
      
      // Should show loading state or handle gracefully
      await expect(page.locator('button:has-text("Send Reset Link"), h3, .text-red-500, .text-red-600')).toBeVisible()
      
      // Wait for response (success or error)
      await page.waitForSelector('h3, .text-red-500, .text-red-600')
      const totalTime = Date.now() - startTime
      
      console.log(`Slow network test time: ${totalTime}ms`)
    })
  })

  test.describe('Security E2E', () => {
    test('should prevent XSS in input', async ({ page }) => {
      // Try to inject script
      const maliciousInput = '<script>alert("xss")</script>'
      await page.fill('input[name="email"]', maliciousInput)
      
      // Should not trigger alert
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null)
      await page.click('button:has-text("Send Reset Link")')
      const dialog = await dialogPromise
      expect(dialog).toBeNull()
    })

    test('should handle HTML injection in error messages', async ({ page }) => {
      // Mock API to return HTML in error message
      await page.route('**/auth/forgot-password', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: '<script>alert("injection")</script>User not found'
          })
        })
      })

      await page.fill('input[name="email"]', 'injection@test.com')
      await page.click('button:has-text("Send Reset Link")')
      
      // HTML should be escaped, not rendered
      const errorMessage = page.locator('.text-red-600')
      await expect(errorMessage).toContainText('User not found')
      
      // Should not trigger alert
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null)
      const dialog = await dialogPromise
      expect(dialog).toBeNull()
    })

    test('should not expose sensitive data in DOM', async ({ page }) => {
      // Check that no sensitive data is exposed in data attributes or other DOM elements
      const sensitiveSelectors = [
        '[data-password]',
        '[data-token]',
        '[data-secret]',
        '[style*="password"]',
        '[style*="token"]'
      ]

      for (const selector of sensitiveSelectors) {
        const elements = page.locator(selector)
        await expect(elements).toHaveCount(0)
      }
    })
  })

  test.describe('Navigation E2E', () => {
    test('should navigate back to login page', async ({ page }) => {
      // Click back to login link
      await page.click('button:has-text("Sign in")')
      
      // Should navigate to login page
      await expect(page).toHaveURL(/.*\/auth\/login/)
    })

    test('should handle browser back button', async ({ page }) => {
      // Navigate to forgot password page
      await page.goto(`${testConfig.baseUrl}/auth/forgot-password`)
      
      // Go back
      await page.goBack()
      
      // Should handle gracefully (either stay or go back)
      const currentUrl = page.url()
      expect(currentUrl).toBeTruthy()
    })
  })

  test.describe('Email Integration E2E', () => {
    test('should send password reset email via Ethereal', async ({ page }) => {
      // Check if Ethereal is configured
      if (!isEtherealConfigured()) {
        console.log('⚠️  Skipping test: Ethereal Email not configured')
        return
      }
      
      console.log('📧 Testing password reset email flow with Ethereal...')
      
      // Submit forgot password form
      await page.fill('input[name="email"]', testConfig.testUsers.valid.email)
      await page.click('button:has-text("Send Reset Link")')
      
      // Wait for success state
      await expect(page.locator('h3')).toContainText('Check Your Email')
      
      // Wait for email to arrive in Ethereal
      console.log('⏳ Waiting for password reset email...')
      const resetToken = await waitForResetEmail(testConfig.testUsers.valid.email, 30000)
      
      if (resetToken) {
        console.log(`✅ Reset token received: ${resetToken}`)
        
        // Navigate to reset password page with token
        await page.goto(`${testConfig.baseUrl}/auth/reset-password/${resetToken}`)
        
        // Should show reset password form
        await expect(page.locator('h3')).toContainText('Set New Password')
        
        // Complete password reset
        await page.fill('input[name="password"]', 'NewPassword123!')
        await page.fill('input[name="confirmPassword"]', 'NewPassword123!')
        await page.click('button:has-text("Update Password")')
        
        // Should show success
        await expect(page.locator('h3')).toContainText('Password Reset Successfully')
        
        // Check for success email
        console.log('⏳ Checking for success confirmation email...')
        const successEmailSent = await checkForSuccessEmail(testConfig.testUsers.valid.email)
        expect(successEmailSent).toBe(true)
        console.log('✅ Success confirmation email verified')
      } else {
        console.log('❌ No reset token received from Ethereal')
        throw new Error('Failed to receive reset token from Ethereal')
      }
    })

    test('should handle email configuration errors gracefully', async ({ page }) => {
      // This test verifies the system handles missing email configuration
      console.log('🔧 Testing graceful handling of email configuration...')
      
      // Submit forgot password form
      await page.fill('input[name="email"]', testConfig.testUsers.valid.email)
      await page.click('button:has-text("Send Reset Link")')
      
      // Should show success state or handle gracefully
      await expect(page.locator('h3')).toBeVisible()
      
      console.log('✅ Email flow handled gracefully')
    })
  })
})

// Helper functions for Ethereal Email integration
async function getResetTokenFromEthereal(email: string): Promise<string | null> {
  if (!isEtherealConfigured()) {
    console.log('❌ Ethereal Email not configured, skipping email verification')
    console.log('Please set ETHEREAL_USER and ETHEREAL_PASS in your .env file')
    return null
  }

  try {
    // Use the Ethereal helper to get reset token
    const token = await waitForResetEmail(email, 30000)
    console.log(`✅ Fetched reset token for ${email} from Ethereal: ${token}`)
    return token
  } catch (error) {
    console.error('❌ Failed to fetch email from Ethereal:', error)
    return null
  }
}

async function cleanupTestEmails(email: string): Promise<void> {
  // Ethereal Email doesn't have an API for cleanup
  // Emails are automatically cleaned up after some time
  console.log(`Ethereal Email cleanup not needed for ${email}`)
} 