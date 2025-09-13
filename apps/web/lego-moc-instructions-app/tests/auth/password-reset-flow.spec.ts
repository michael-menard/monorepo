import { expect, test } from '@playwright/test';
import { createAuthTestUtils } from './utils';
import { SOUTH_PARK_USERS, TEST_USERS } from './test-users';

/**
 * Complete Password Reset Flow Tests
 * 
 * Tests the entire password reset journey:
 * - Forgot Password → Email sent → Reset link → New password → Login
 * - Token validation and expiration
 * - Password strength validation
 * - Multiple reset attempts
 * - Security edge cases
 */
test.describe('Complete Password Reset Flow', () => {
  test.describe.configure({ timeout: 180000 }); // 3 minutes for email flows

  test.beforeAll(async () => {
    console.log('🔑 Testing Complete Password Reset Flow:');
    console.log('  - Forgot password request');
    console.log('  - Email delivery with reset link');
    console.log('  - Reset token validation');
    console.log('  - New password setting');
    console.log('  - Login with new password');
    console.log('  - Security and edge cases');
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test.describe('Forgot Password Request', () => {
    test('should send password reset email for valid user', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.STAN;

      // Mock successful forgot password response
      await authUtils.mockAuthAPI('forgot-password', {
        success: true,
        message: 'Password reset email sent successfully',
        data: {
          email: testUser.email,
          resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        },
      });

      await authUtils.navigateToAuthPage('forgot-password');

      // Verify forgot password form
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Fill email and submit
      await page.fill('input[type="email"]', testUser.email);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Should show success message
      await expect(page.locator('text=/reset.*email.*sent|check.*email|password.*reset/i')).toBeVisible({ timeout: 8000 });
      
      console.log(`✅ Password reset email sent for: ${testUser.email}`);
      console.log('📧 Check Ethereal Email for reset link');
    });

    test('should handle non-existent email gracefully', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock error response for non-existent email
      await authUtils.mockAuthAPI('forgot-password', {
        success: false,
        message: 'No account found with this email address',
        code: 'USER_NOT_FOUND',
      }, 404);

      await authUtils.navigateToAuthPage('forgot-password');

      // Try with non-existent email
      await page.fill('input[type="email"]', 'nonexistent@example.com');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Should show error message
      await expect(page.locator('text=/no.*account.*found|email.*not.*found|user.*not.*exist/i')).toBeVisible({ timeout: 8000 });
      console.log('✅ Non-existent email handled correctly');
    });

    test('should validate email format', async ({ page }) => {
      test.setTimeout(45000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('forgot-password');

      // Try with invalid email format
      await page.fill('input[type="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Should show validation error
      const hasValidationError = await page.locator('text=/invalid.*email|enter.*valid.*email/i').count();
      expect(hasValidationError).toBeGreaterThan(0);
      console.log('✅ Email format validation working');
    });

    test('should handle rate limiting for multiple requests', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.KYLE;

      // First request succeeds
      await authUtils.mockAuthAPI('forgot-password', {
        success: true,
        message: 'Password reset email sent successfully',
      });

      await authUtils.navigateToAuthPage('forgot-password');
      await page.fill('input[type="email"]', testUser.email);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Second request should be rate limited
      await authUtils.mockAuthAPI('forgot-password', {
        success: false,
        message: 'Please wait before requesting another password reset',
        code: 'RATE_LIMITED',
      }, 429);

      await page.fill('input[type="email"]', testUser.email);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Should show rate limit message
      await expect(page.locator('text=/wait.*before|too.*many.*requests|rate.*limit/i')).toBeVisible({ timeout: 8000 });
      console.log('✅ Rate limiting working correctly');
    });
  });

  test.describe('Password Reset Token Validation', () => {
    test('should accept valid reset token', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock successful token validation
      await authUtils.mockAuthAPI('validate-reset-token', {
        success: true,
        message: 'Reset token is valid',
        data: {
          email: 'test@example.com',
          tokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      });

      // Navigate to reset password page with token
      await page.goto('/auth/reset-password?token=valid-reset-token-123', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Should show password reset form
      const hasPasswordFields = await page.locator('input[type="password"]').count();
      expect(hasPasswordFields).toBeGreaterThanOrEqual(2); // Password and confirm password

      console.log('✅ Valid reset token accepted');
    });

    test('should reject invalid reset token', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock invalid token response
      await authUtils.mockAuthAPI('validate-reset-token', {
        success: false,
        message: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN',
      }, 400);

      await page.goto('/auth/reset-password?token=invalid-token', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Should show error message
      await expect(page.locator('text=/invalid.*token|expired.*token|reset.*failed/i')).toBeVisible({ timeout: 8000 });
      console.log('✅ Invalid reset token rejected');
    });

    test('should reject expired reset token', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock expired token response
      await authUtils.mockAuthAPI('validate-reset-token', {
        success: false,
        message: 'Reset token has expired',
        code: 'TOKEN_EXPIRED',
      }, 400);

      await page.goto('/auth/reset-password?token=expired-token', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Should show expiration message
      await expect(page.locator('text=/token.*expired|link.*expired|request.*new/i')).toBeVisible({ timeout: 8000 });
      console.log('✅ Expired reset token handled correctly');
    });
  });

  test.describe('New Password Setting', () => {
    test('should successfully reset password with valid token', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const newPassword = 'NewSecurePassword123!';

      // Mock successful token validation
      await authUtils.mockAuthAPI('validate-reset-token', {
        success: true,
        message: 'Reset token is valid',
        data: { email: 'test@example.com' },
      });

      // Mock successful password reset
      await authUtils.mockAuthAPI('reset-password', {
        success: true,
        message: 'Password reset successfully',
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            isVerified: true,
          },
        },
      });

      await page.goto('/auth/reset-password?token=valid-token', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Fill new password form
      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.first().fill(newPassword);
      await passwordInputs.last().fill(newPassword);

      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Should show success message or redirect to login
      const hasSuccessMessage = await page.locator('text=/password.*reset|success|updated/i').count();
      const isOnLoginPage = page.url().includes('/login');
      
      expect(hasSuccessMessage > 0 || isOnLoginPage).toBeTruthy();
      console.log('✅ Password reset completed successfully');
    });

    test('should validate password strength requirements', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      await authUtils.mockAuthAPI('validate-reset-token', {
        success: true,
        message: 'Reset token is valid',
        data: { email: 'test@example.com' },
      });

      await page.goto('/auth/reset-password?token=valid-token', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Test weak password
      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.first().fill('weak');
      await passwordInputs.last().fill('weak');

      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Should show password strength error
      const hasPasswordError = await page.locator('text=/password.*strong|password.*requirements|at least.*8/i').count();
      expect(hasPasswordError).toBeGreaterThan(0);
      console.log('✅ Password strength validation working');
    });

    test('should validate password confirmation match', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      await authUtils.mockAuthAPI('validate-reset-token', {
        success: true,
        message: 'Reset token is valid',
        data: { email: 'test@example.com' },
      });

      await page.goto('/auth/reset-password?token=valid-token', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Test password mismatch
      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.first().fill('Password123!');
      await passwordInputs.last().fill('DifferentPassword123!');

      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Should show password mismatch error
      await expect(page.locator('text=/passwords.*match/i')).toBeVisible({ timeout: 8000 });
      console.log('✅ Password confirmation validation working');
    });
  });

  test.describe('Complete Reset Journey', () => {
    test('should complete full password reset journey', async ({ page }) => {
      test.setTimeout(150000); // 2.5 minutes for complete journey
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.BUTTERS;
      const newPassword = 'NewButtersPassword123!';

      console.log('🚀 Starting complete password reset journey...');

      // Step 1: Request password reset
      console.log('📝 Step 1: Request password reset');
      await authUtils.mockAuthAPI('forgot-password', {
        success: true,
        message: 'Password reset email sent successfully',
      });

      await authUtils.navigateToAuthPage('forgot-password');
      await page.fill('input[type="email"]', testUser.email);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Step 2: Simulate email link click (navigate to reset page)
      console.log('📧 Step 2: Email link clicked (simulated)');
      await authUtils.mockAuthAPI('validate-reset-token', {
        success: true,
        message: 'Reset token is valid',
        data: { email: testUser.email },
      });

      await page.goto('/auth/reset-password?token=valid-reset-token-123');
      await page.waitForTimeout(3000);

      // Step 3: Set new password
      console.log('🔑 Step 3: Set new password');
      await authUtils.mockAuthAPI('reset-password', {
        success: true,
        message: 'Password reset successfully',
        data: {
          user: {
            id: 'butters-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
          },
        },
      });

      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.first().fill(newPassword);
      await passwordInputs.last().fill(newPassword);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Step 4: Login with new password
      console.log('🔐 Step 4: Login with new password');
      await authUtils.mockAuthAPI('login', {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'butters-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
          },
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresIn: 3600,
          },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, newPassword);
      await page.waitForTimeout(3000);

      // Should be redirected to profile/dashboard
      const currentUrl = page.url();
      const isAuthenticated = !currentUrl.includes('/auth/login');
      expect(isAuthenticated).toBeTruthy();

      console.log('🎉 Complete password reset journey successful!');
      console.log(`   User: ${testUser.name}`);
      console.log(`   Email: ${testUser.email}`);
      console.log(`   New Password: ${newPassword}`);
      console.log(`   Final URL: ${currentUrl}`);
    });
  });

  test.describe('Security Edge Cases', () => {
    test('should prevent password reset token reuse', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);

      // First use of token succeeds
      await authUtils.mockAuthAPI('validate-reset-token', {
        success: true,
        message: 'Reset token is valid',
        data: { email: 'test@example.com' },
      });

      await authUtils.mockAuthAPI('reset-password', {
        success: true,
        message: 'Password reset successfully',
      });

      await page.goto('/auth/reset-password?token=one-time-token');
      await page.waitForTimeout(2000);

      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.first().fill('NewPassword123!');
      await passwordInputs.last().fill('NewPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Second use of same token should fail
      await authUtils.mockAuthAPI('validate-reset-token', {
        success: false,
        message: 'Reset token has already been used',
        code: 'TOKEN_USED',
      }, 400);

      await page.goto('/auth/reset-password?token=one-time-token');
      await page.waitForTimeout(3000);

      await expect(page.locator('text=/token.*used|already.*used|invalid.*token/i')).toBeVisible({ timeout: 8000 });
      console.log('✅ Token reuse prevention working');
    });

    test('should handle concurrent reset requests', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.CARTMAN;

      // Mock multiple reset requests
      await authUtils.mockAuthAPI('forgot-password', {
        success: true,
        message: 'Password reset email sent successfully',
      });

      await authUtils.navigateToAuthPage('forgot-password');

      // Send multiple requests quickly
      for (let i = 0; i < 3; i++) {
        await page.fill('input[type="email"]', testUser.email);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
      }

      // Should handle gracefully (either success or rate limiting)
      const hasResponse = await page.locator('text=/email.*sent|wait.*before|rate.*limit/i').count();
      expect(hasResponse).toBeGreaterThan(0);
      console.log('✅ Concurrent reset requests handled');
    });
  });
});
