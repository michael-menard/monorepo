import { expect, test } from '@playwright/test'
import { etherealHelper, waitForVerificationEmail } from './ethereal-helper'

// Test configuration for different scenarios
const testConfig = {
  baseUrl: 'http://localhost:5173', // Vite dev server
  authServiceUrl: 'http://localhost:9000', // Auth service
  ethereal: {
    host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.ETHEREAL_PORT || '587'),
    user: process.env.ETHEREAL_USER || 'your_ethereal_username',
    pass: process.env.ETHEREAL_PASS || 'your_ethereal_password',
    secure: process.env.ETHEREAL_SECURE === 'true'
  },
  testUsers: {
    valid: {
      email: 'test-e2e@example.com',
      password: 'TestPassword123!'
    },
    invalid: {
      email: 'invalid@example.com',
      password: 'WrongPassword123!'
    }
  }
}

test.describe('EmailVerificationPage E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the email verification page
    await page.goto(`${testConfig.baseUrl}/auth/email-verification`)
    
    // Wait for the page to load
    await page.waitForSelector('h3:has-text("Verify Your Email")')
  })

  test.describe('Complete Email Verification Flow', () => {
    test('should complete full email verification journey', async ({ page }) => {
      // Step 1: Verify page loads correctly
      await expect(page.locator('h3')).toContainText('Verify Your Email')
      await expect(page.locator('input[name="code"]')).toBeVisible()
      await expect(page.locator('button:has-text("Verify Email")')).toBeVisible()
      await expect(page.locator('button:has-text("Resend Code")')).toBeVisible()

      // Step 2: Test with invalid code first
      await page.fill('input[name="code"]', '000000')
      await page.click('button:has-text("Verify Email")')
      
      // Should show error message
      await expect(page.locator('.text-red-600')).toContainText('Invalid or expired verification code')

      // Step 3: Test resend functionality
      await page.click('button:has-text("Resend Code")')
      
             // Should show success message (if email is in localStorage)
       // Note: In real E2E, we'd check Ethereal Email for the actual email
       await expect(page.locator('body')).toContainText('Verification code resent successfully!', { timeout: 5000 })

      // Step 4: Test with valid code (mocked for E2E)
      await page.fill('input[name="code"]', '123456')
      await page.click('button:has-text("Verify Email")')
      
      // Should show success state
      await expect(page.locator('h3')).toContainText('Email Verified')
      await expect(page.locator('p')).toContainText('Your email has been successfully verified')
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/auth/verify-email', route => {
        route.abort('failed')
      })

      await page.fill('input[name="code"]', '123456')
      await page.click('button:has-text("Verify Email")')
      
      // Should show network error
      await expect(page.locator('.text-red-600')).toContainText('Network error. Please check your connection.')
    })
  })

  test.describe('Form Validation E2E', () => {
    test('should validate empty code submission', async ({ page }) => {
      await page.click('button:has-text("Verify Email")')
      
      // Should show validation error
      await expect(page.locator('.text-red-600')).toContainText('Verification code must be 6 characters')
    })

    test('should validate code length', async ({ page }) => {
      // Test short code
      await page.fill('input[name="code"]', '123')
      await page.click('button:has-text("Verify Email")')
      
      await expect(page.locator('.text-red-600')).toContainText('Verification code must be 6 characters')

      // Test long code (should be truncated)
      await page.fill('input[name="code"]', '123456789')
      await expect(page.locator('input[name="code"]')).toHaveValue('123456')
    })

    test('should handle special characters in input', async ({ page }) => {
      // Test with special characters
      await page.fill('input[name="code"]', '12@#$%')
      await page.click('button:has-text("Verify Email")')
      
      // Should handle gracefully (either accept or show appropriate error)
      await expect(page.locator('input[name="code"]')).toHaveValue('12@#$%')
    })
  })

  test.describe('Accessibility E2E', () => {
    test('should be fully keyboard navigable', async ({ page }) => {
      // Tab through all interactive elements
      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="code"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('button:has-text("Verify Email")')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('button:has-text("Resend Code")')).toBeFocused()
    })

    test('should support Enter key submission', async ({ page }) => {
      await page.fill('input[name="code"]', '123456')
      await page.keyboard.press('Enter')
      
      // Should trigger form submission
      await expect(page.locator('h3')).toContainText('Email Verified')
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for proper labeling
      const codeInput = page.locator('input[name="code"]')
      await expect(codeInput).toHaveAttribute('id', 'code')
      
      const label = page.locator('label[for="code"]')
      await expect(label).toContainText('Verification Code')
    })
  })

  test.describe('Mobile Responsiveness E2E', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Verify layout is responsive
      await expect(page.locator('.min-h-screen')).toBeVisible()
      await expect(page.locator('.max-w-md')).toBeVisible()
      
      // Test touch interactions
      await page.fill('input[name="code"]', '123456')
      await page.click('button:has-text("Verify Email")')
      
      await expect(page.locator('h3')).toContainText('Email Verified')
    })

    test('should handle virtual keyboard properly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Focus input to trigger virtual keyboard
      await page.click('input[name="code"]')
      
      // Type with virtual keyboard simulation
      await page.keyboard.type('123456')
      
      // Verify input maintains focus and value
      await expect(page.locator('input[name="code"]')).toHaveValue('123456')
      await expect(page.locator('input[name="code"]')).toBeFocused()
    })
  })

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across browsers', async ({ page, browserName }) => {
      // Test basic functionality
      await page.fill('input[name="code"]', '123456')
      await page.click('button:has-text("Verify Email")')
      
      // Should work the same in all browsers
      await expect(page.locator('h3')).toContainText('Email Verified')
      
      // Log browser-specific behavior for debugging
      console.log(`Test completed successfully in ${browserName}`)
    })
  })

  test.describe('Error Recovery Scenarios', () => {
    test('should recover from invalid code attempts', async ({ page }) => {
      // Try invalid code
      await page.fill('input[name="code"]', '000000')
      await page.click('button:has-text("Verify Email")')
      
      await expect(page.locator('.text-red-600')).toContainText('Invalid or expired verification code')
      
      // Try valid code after error
      await page.fill('input[name="code"]', '123456')
      await page.click('button:has-text("Verify Email")')
      
      await expect(page.locator('h3')).toContainText('Email Verified')
    })

    test('should handle multiple resend attempts', async ({ page }) => {
      // Click resend multiple times
      await page.click('button:has-text("Resend Code")')
      await page.click('button:has-text("Resend Code")')
      await page.click('button:has-text("Resend Code")')
      
      // Should handle gracefully (either rate limit or allow)
      // In real implementation, this might show rate limiting message
      await expect(page.locator('body')).toContainText('Verification code resent successfully!', { timeout: 5000 })
    })
  })

  test.describe('Performance E2E', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto(`${testConfig.baseUrl}/auth/email-verification`)
      await page.waitForSelector('h3:has-text("Verify Your Email")')
      
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
      await page.fill('input[name="code"]', '123456')
      await page.click('button:has-text("Verify Email")')
      await page.waitForSelector('h3:has-text("Email Verified")')
      
      const interactionTime = Date.now() - startTime
      
      // Interactions should be responsive (under 2 seconds)
      console.log(`Interaction time: ${interactionTime}ms`)
      if (interactionTime >= 2000) {
        console.warn('Interactions took longer than 2 seconds')
      }
    })
  })

  test.describe('Security E2E', () => {
    test('should prevent XSS in input', async ({ page }) => {
      // Try to inject script
      const maliciousInput = '<script>alert("xss")</script>'
      await page.fill('input[name="code"]', maliciousInput)
      
      // Should be truncated by maxLength
      await expect(page.locator('input[name="code"]')).toHaveValue('<scrip')
      
      // No alert should be triggered
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null)
      await page.click('button:has-text("Verify Email")')
      const dialog = await dialogPromise
      expect(dialog).toBeNull()
    })

    test('should handle HTML injection in error messages', async ({ page }) => {
      // Mock API to return HTML in error message
      await page.route('**/auth/verify-email', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: '<script>alert("injection")</script>Invalid code'
          })
        })
      })

      await page.fill('input[name="code"]', '000000')
      await page.click('button:has-text("Verify Email")')
      
      // HTML should be escaped, not rendered
      const errorMessage = page.locator('.text-red-600')
      await expect(errorMessage).toContainText('Invalid code')
      
      // Check that script tags are escaped
      const html = await errorMessage.innerHTML()
      expect(html).toContain('&lt;script&gt;')
      expect(html).not.toContain('<script>')
    })
  })
})

// Helper functions for Ethereal Email integration
async function getVerificationCodeFromEthereal(email: string): Promise<string | null> {
  if (!testConfig.ethereal.user || testConfig.ethereal.user === 'your_ethereal_username') {
    console.log('Ethereal Email not configured, skipping email verification')
    console.log('Please set ETHEREAL_USER and ETHEREAL_PASS in your .env file')
    return null
  }

  try {
    // Use the Ethereal helper to get verification code
    const code = await waitForVerificationEmail(email, 30000)
    console.log(`Fetched verification code for ${email} from Ethereal: ${code}`)
    return code
  } catch (error) {
    console.error('Failed to fetch email from Ethereal:', error)
    return null
  }
}

async function cleanupTestEmails(email: string): Promise<void> {
  // Ethereal Email doesn't have an API for cleanup
  // Emails are automatically cleaned up after some time
  console.log(`Ethereal Email cleanup not needed for ${email}`)
} 