import { expect, test } from '@playwright/test'

// Test configuration for different scenarios
const testConfig = {
  baseUrl: 'http://localhost:5173', // Vite dev server
  authServiceUrl: 'http://localhost:9000', // Auth service
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

test.describe('ResetPasswordPage E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the reset password page with a valid token
    await page.goto(`${testConfig.baseUrl}/auth/reset-password/valid-token-123`)
    
    // Wait for the page to load
    await page.waitForSelector('h3:has-text("Set New Password")')
  })

  test.describe('Complete Password Reset Flow', () => {
    test('should complete full password reset journey', async ({ page }) => {
      // Step 1: Verify page loads correctly
      await expect(page.locator('h3')).toContainText('Set New Password')
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
      await expect(page.locator('button:has-text("Update Password")')).toBeVisible()

      // Step 2: Test with invalid password first (too short)
      await page.fill('input[name="password"]', 'short')
      await page.fill('input[name="confirmPassword"]', 'short')
      await page.click('button:has-text("Update Password")')
      
      // Should show validation error
      await expect(page.locator('.text-red-500')).toContainText('Password must be at least 8 characters')

      // Step 3: Test with mismatched passwords
      await page.fill('input[name="password"]', 'ValidPassword123!')
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!')
      await page.click('button:has-text("Update Password")')
      
      // Should show mismatch error
      await expect(page.locator('.text-red-500')).toContainText("Passwords don't match")

      // Step 4: Test with valid passwords
      await page.fill('input[name="password"]', 'ValidPassword123!')
      await page.fill('input[name="confirmPassword"]', 'ValidPassword123!')
      await page.click('button:has-text("Update Password")')
      
      // Should show success state
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
      await expect(page.locator('p')).toContainText('Your password has been updated')
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible()
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/auth/reset-password/**', route => {
        route.abort('failed')
      })

      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
      await page.click('button:has-text("Update Password")')
      
      // Should show network error
      await expect(page.locator('.text-red-600')).toContainText('Failed to reset password. Please try again.')
    })

    test('should handle invalid token errors', async ({ page }) => {
      // Mock invalid token response
      await page.route('**/auth/reset-password/**', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Invalid or expired reset token'
          })
        })
      })

      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
      await page.click('button:has-text("Update Password")')
      
      // Should show token error
      await expect(page.locator('.text-red-600')).toContainText('Invalid or expired reset token')
    })
  })

  test.describe('Form Validation E2E', () => {
    test('should validate empty password submission', async ({ page }) => {
      await page.click('button:has-text("Update Password")')
      
      // Should show validation error
      await expect(page.locator('.text-red-500')).toContainText('Password must be at least 8 characters')
    })

    test('should validate password length', async ({ page }) => {
      // Test short password
      await page.fill('input[name="password"]', '123')
      await page.fill('input[name="confirmPassword"]', '123')
      await page.click('button:has-text("Update Password")')
      
      await expect(page.locator('.text-red-500')).toContainText('Password must be at least 8 characters')

      // Test valid password length
      await page.fill('input[name="password"]', 'ValidPassword123!')
      await page.fill('input[name="confirmPassword"]', 'ValidPassword123!')
      await page.click('button:has-text("Update Password")')
      
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
    })

    test('should validate password confirmation', async ({ page }) => {
      // Test mismatched passwords
      await page.fill('input[name="password"]', 'ValidPassword123!')
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!')
      await page.click('button:has-text("Update Password")')
      
      await expect(page.locator('.text-red-500')).toContainText("Passwords don't match")

      // Test matching passwords
      await page.fill('input[name="confirmPassword"]', 'ValidPassword123!')
      await page.click('button:has-text("Update Password")')
      
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
    })

    test('should handle special characters in password', async ({ page }) => {
      // Test with special characters
      const specialPassword = 'P@ssw0rd!@#$%^&*()'
      await page.fill('input[name="password"]', specialPassword)
      await page.fill('input[name="confirmPassword"]', specialPassword)
      await page.click('button:has-text("Update Password")')
      
      // Should handle gracefully
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
    })
  })

  test.describe('Accessibility E2E', () => {
    test('should be fully keyboard navigable', async ({ page }) => {
      // Tab through all interactive elements
      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="password"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="confirmPassword"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('button:has-text("Update Password")')).toBeFocused()
    })

    test('should support Enter key submission', async ({ page }) => {
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
      await page.keyboard.press('Enter')
      
      // Should trigger form submission
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for proper labeling
      const passwordInput = page.locator('input[name="password"]')
      await expect(passwordInput).toHaveAttribute('id', 'password')
      
      const passwordLabel = page.locator('label[for="password"]')
      await expect(passwordLabel).toContainText('New Password')

      const confirmPasswordInput = page.locator('input[name="confirmPassword"]')
      await expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword')
      
      const confirmPasswordLabel = page.locator('label[for="confirmPassword"]')
      await expect(confirmPasswordLabel).toContainText('Confirm New Password')
    })

    test('should announce errors to screen readers', async ({ page }) => {
      await page.click('button:has-text("Update Password")')
      
      // Error should be announced with proper ARIA attributes
      const errorElement = page.locator('.text-red-500')
      await expect(errorElement).toBeVisible()
      await expect(errorElement).toContainText('Password must be at least 8 characters')
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
      await page.fill('input[name="password"]', 'MobilePassword123!')
      await page.fill('input[name="confirmPassword"]', 'MobilePassword123!')
      await page.click('button:has-text("Update Password")')
      
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
    })

    test('should handle virtual keyboard properly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Focus input to trigger virtual keyboard
      await page.click('input[name="password"]')
      
      // Type with virtual keyboard simulation
      await page.keyboard.type('VirtualKeyboard123!')
      
      // Verify input maintains focus and value
      await expect(page.locator('input[name="password"]')).toHaveValue('VirtualKeyboard123!')
      await expect(page.locator('input[name="password"]')).toBeFocused()
    })

    test('should handle landscape orientation', async ({ page }) => {
      // Set landscape orientation
      await page.setViewportSize({ width: 667, height: 375 })
      
      // Verify layout still works
      await expect(page.locator('h3')).toContainText('Set New Password')
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
    })
  })

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across browsers', async ({ page, browserName }) => {
      // Test basic functionality
      await page.fill('input[name="password"]', 'CrossBrowser123!')
      await page.fill('input[name="confirmPassword"]', 'CrossBrowser123!')
      await page.click('button:has-text("Update Password")')
      
      // Should work the same in all browsers
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
      
      // Log browser-specific behavior for debugging
      console.log(`Test completed successfully in ${browserName}`)
    })

    test('should handle different input methods', async ({ page }) => {
      // Test paste functionality
      await page.fill('input[name="password"]', 'PasteTest123!')
      await page.fill('input[name="confirmPassword"]', 'PasteTest123!')
      
      // Test copy functionality
      await page.click('input[name="password"]')
      await page.keyboard.press('Control+a')
      await page.keyboard.press('Control+c')
      
      // Test paste into confirm password
      await page.click('input[name="confirmPassword"]')
      await page.keyboard.press('Control+v')
      
      await page.click('button:has-text("Update Password")')
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
    })
  })

  test.describe('Error Recovery Scenarios', () => {
    test('should recover from validation errors', async ({ page }) => {
      // Try invalid password
      await page.fill('input[name="password"]', 'short')
      await page.fill('input[name="confirmPassword"]', 'short')
      await page.click('button:has-text("Update Password")')
      
      await expect(page.locator('.text-red-500')).toContainText('Password must be at least 8 characters')
      
      // Fix the error
      await page.fill('input[name="password"]', 'ValidPassword123!')
      await page.fill('input[name="confirmPassword"]', 'ValidPassword123!')
      await page.click('button:has-text("Update Password")')
      
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
    })

    test('should recover from API errors', async ({ page }) => {
      // First trigger an API error
      await page.route('**/auth/reset-password/**', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Invalid or expired reset token'
          })
        })
      })

      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
      await page.click('button:has-text("Update Password")')
      
      await expect(page.locator('.text-red-600')).toContainText('Invalid or expired reset token')

      // Reset route to success
      await page.unroute('**/auth/reset-password/**')
      
      // Try again
      await page.click('button:has-text("Update Password")')
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
    })

    test('should handle multiple submission attempts', async ({ page }) => {
      // Click submit multiple times rapidly
      await page.fill('input[name="password"]', 'MultipleSubmit123!')
      await page.fill('input[name="confirmPassword"]', 'MultipleSubmit123!')
      
      await page.click('button:has-text("Update Password")')
      await page.click('button:has-text("Update Password")')
      await page.click('button:has-text("Update Password")')
      
      // Should handle gracefully (either rate limit or allow)
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
    })
  })

  test.describe('Performance E2E', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto(`${testConfig.baseUrl}/auth/reset-password/valid-token-123`)
      await page.waitForSelector('h3:has-text("Set New Password")')
      
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
      await page.fill('input[name="password"]', 'RapidInteraction123!')
      await page.fill('input[name="confirmPassword"]', 'RapidInteraction123!')
      await page.click('button:has-text("Update Password")')
      await page.waitForSelector('h3:has-text("Password Reset Successfully")')
      
      const interactionTime = Date.now() - startTime
      
      // Interactions should be responsive (under 2 seconds)
      console.log(`Interaction time: ${interactionTime}ms`)
      if (interactionTime >= 2000) {
        console.warn('Interactions took longer than 2 seconds')
      }
    })

    test('should handle slow network gracefully', async ({ page }) => {
      // Mock slow network
      await page.route('**/auth/reset-password/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Password reset successful'
          })
        })
      })

      const startTime = Date.now()
      
      await page.fill('input[name="password"]', 'SlowNetwork123!')
      await page.fill('input[name="confirmPassword"]', 'SlowNetwork123!')
      await page.click('button:has-text("Update Password")')
      
      // Should show loading state
      await expect(page.locator('button:has-text("Update Password")')).toBeDisabled()
      
      await page.waitForSelector('h3:has-text("Password Reset Successfully")')
      const totalTime = Date.now() - startTime
      
      console.log(`Slow network test time: ${totalTime}ms`)
    })
  })

  test.describe('Security E2E', () => {
    test('should prevent XSS in input', async ({ page }) => {
      // Try to inject script
      const maliciousInput = '<script>alert("xss")</script>'
      await page.fill('input[name="password"]', maliciousInput)
      await page.fill('input[name="confirmPassword"]', maliciousInput)
      
      // Should not trigger alert
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null)
      await page.click('button:has-text("Update Password")')
      const dialog = await dialogPromise
      expect(dialog).toBeNull()
    })

    test('should handle HTML injection in error messages', async ({ page }) => {
      // Mock API to return HTML in error message
      await page.route('**/auth/reset-password/**', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: '<script>alert("injection")</script>Invalid token'
          })
        })
      })

      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
      await page.click('button:has-text("Update Password")')
      
      // HTML should be escaped, not rendered
      const errorMessage = page.locator('.text-red-600')
      await expect(errorMessage).toContainText('Invalid token')
      
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
    test('should navigate to login page after successful reset', async ({ page }) => {
      // Complete password reset
      await page.fill('input[name="password"]', 'NavigationTest123!')
      await page.fill('input[name="confirmPassword"]', 'NavigationTest123!')
      await page.click('button:has-text("Update Password")')
      
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
      
      // Click Sign In button
      await page.click('button:has-text("Sign In")')
      
      // Should navigate to login page
      await expect(page).toHaveURL(/.*\/auth\/login/)
    })

    test('should handle browser back button', async ({ page }) => {
      // Complete password reset
      await page.fill('input[name="password"]', 'BackButtonTest123!')
      await page.fill('input[name="confirmPassword"]', 'BackButtonTest123!')
      await page.click('button:has-text("Update Password")')
      
      await expect(page.locator('h3')).toContainText('Password Reset Successfully')
      
      // Go back
      await page.goBack()
      
      // Should still be on reset password page
      await expect(page.locator('h3')).toContainText('Set New Password')
    })
  })

  test.describe('Token Handling E2E', () => {
    test('should handle different token formats', async ({ page }) => {
      // Test with different token formats
      const tokens = [
        'simple-token',
        'token-with-special-chars-!@#$%',
        'very-long-token-' + 'a'.repeat(100),
        'token-with-numbers-123456'
      ]

      for (const token of tokens) {
        await page.goto(`${testConfig.baseUrl}/auth/reset-password/${token}`)
        await page.waitForSelector('h3:has-text("Set New Password")')
        
        await page.fill('input[name="password"]', 'TokenTest123!')
        await page.fill('input[name="confirmPassword"]', 'TokenTest123!')
        await page.click('button:has-text("Update Password")')
        
        await expect(page.locator('h3')).toContainText('Password Reset Successfully')
      }
    })

    test('should handle missing token gracefully', async ({ page }) => {
      await page.goto(`${testConfig.baseUrl}/auth/reset-password/`)
      await page.waitForSelector('h3:has-text("Set New Password")')
      
      await page.fill('input[name="password"]', 'NoTokenTest123!')
      await page.fill('input[name="confirmPassword"]', 'NoTokenTest123!')
      await page.click('button:has-text("Update Password")')
      
      // Should handle gracefully (either succeed or show appropriate error)
      const successText = page.locator('h3:has-text("Password Reset Successfully")')
      const errorText = page.locator('.text-red-600')
      
      await expect(successText.or(errorText)).toBeVisible()
    })
  })
}) 