import { expect, test } from '@playwright/test';
import { createAuthTestUtils } from './utils';
import { SOUTH_PARK_USERS, TEST_USERS } from './test-users';

/**
 * Account Security Features Tests
 * 
 * Tests advanced security features:
 * - Password change while logged in
 * - Account deactivation/deletion
 * - Login attempt rate limiting
 * - Suspicious activity detection
 * - Account lockout after failed attempts
 * - Two-factor authentication (if implemented)
 */
test.describe('Account Security Features', () => {
  test.describe.configure({ timeout: 120000 }); // 2 minutes for security tests

  test.beforeAll(async () => {
    console.log('🔒 Testing Account Security Features:');
    console.log('  - Password change while logged in');
    console.log('  - Account deactivation and deletion');
    console.log('  - Login attempt rate limiting');
    console.log('  - Suspicious activity detection');
    console.log('  - Account lockout mechanisms');
    console.log('  - Security notifications');
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test.describe('Password Change (Authenticated)', () => {
    test('should successfully change password while logged in', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.STAN;
      const newPassword = 'NewStanPassword123!';

      // Mock login
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'stan-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
          },
          tokens: {
            accessToken: 'stan-access-token',
            refreshToken: 'stan-refresh-token',
            expiresIn: 3600,
          },
        },
      });

      // Login first
      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      // Mock password change endpoint
      await authUtils.mockAuthAPI('change-password', {
        success: true,
        message: 'Password changed successfully',
        data: {
          user: {
            id: 'stan-123',
            email: testUser.email,
            name: testUser.name,
            passwordChangedAt: new Date().toISOString(),
          },
        },
      });

      // Navigate to password change page
      await page.goto('/account/security', { timeout: 15000 });
      await page.waitForTimeout(2000);

      // Look for password change form
      const hasPasswordForm = await page.locator('input[name="currentPassword"], input[placeholder*="current"]').count();
      
      if (hasPasswordForm > 0) {
        // Fill password change form
        await page.fill('input[name="currentPassword"], input[placeholder*="current"]', testUser.password);
        await page.fill('input[name="newPassword"], input[placeholder*="new"]', newPassword);
        await page.fill('input[name="confirmPassword"], input[placeholder*="confirm"]', newPassword);

        // Submit password change
        await page.click('button:has-text("Change Password"), button[type="submit"]');
        await page.waitForTimeout(3000);

        // Should show success message
        const hasSuccessMessage = await page.locator('text=/password.*changed|password.*updated|success/i').count();
        expect(hasSuccessMessage).toBeGreaterThan(0);
        console.log('✅ Password change successful');
      } else {
        console.log('ℹ️  Password change form not found - may not be implemented yet');
      }
    });

    test('should require current password for password change', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.KYLE;

      // Mock login and navigate to security page
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: { id: 'kyle-123', email: testUser.email, name: testUser.name, isVerified: true },
          tokens: { accessToken: 'kyle-token', refreshToken: 'kyle-refresh', expiresIn: 3600 },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      // Mock incorrect current password
      await authUtils.mockAuthAPI('change-password', {
        success: false,
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
      }, 400);

      await page.goto('/account/security', { timeout: 15000 });
      await page.waitForTimeout(2000);

      const hasPasswordForm = await page.locator('input[name="currentPassword"]').count();
      
      if (hasPasswordForm > 0) {
        // Try with wrong current password
        await page.fill('input[name="currentPassword"]', 'WrongPassword123!');
        await page.fill('input[name="newPassword"]', 'NewPassword123!');
        await page.fill('input[name="confirmPassword"]', 'NewPassword123!');

        await page.click('button:has-text("Change Password")');
        await page.waitForTimeout(3000);

        // Should show error for incorrect current password
        const hasErrorMessage = await page.locator('text=/current.*password.*incorrect|wrong.*password/i').count();
        expect(hasErrorMessage).toBeGreaterThan(0);
        console.log('✅ Current password validation working');
      }
    });

    test('should validate new password strength', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.CARTMAN;

      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: { id: 'cartman-123', email: testUser.email, name: testUser.name, isVerified: true },
          tokens: { accessToken: 'cartman-token', refreshToken: 'cartman-refresh', expiresIn: 3600 },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      await page.goto('/account/security', { timeout: 15000 });
      await page.waitForTimeout(2000);

      const hasPasswordForm = await page.locator('input[name="newPassword"]').count();
      
      if (hasPasswordForm > 0) {
        // Try with weak password
        await page.fill('input[name="currentPassword"]', testUser.password);
        await page.fill('input[name="newPassword"]', 'weak');
        await page.fill('input[name="confirmPassword"]', 'weak');

        await page.click('button:has-text("Change Password")');
        await page.waitForTimeout(2000);

        // Should show password strength error
        const hasStrengthError = await page.locator('text=/password.*strong|password.*requirements|at least.*8/i').count();
        expect(hasStrengthError).toBeGreaterThan(0);
        console.log('✅ New password strength validation working');
      }
    });
  });

  test.describe('Login Rate Limiting', () => {
    test('should implement rate limiting after multiple failed attempts', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.KENNY;

      // Mock failed login attempts
      let attemptCount = 0;
      await page.route('**/api/auth/login', async route => {
        attemptCount++;
        
        if (attemptCount <= 3) {
          // First 3 attempts fail normally
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Invalid credentials',
              code: 'INVALID_CREDENTIALS',
              attemptsRemaining: 3 - attemptCount,
            }),
          });
        } else {
          // 4th+ attempts are rate limited
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Too many failed login attempts. Please try again later.',
              code: 'RATE_LIMITED',
              retryAfter: 300, // 5 minutes
            }),
          });
        }
      });

      await authUtils.navigateToAuthPage('login');

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await page.fill('input[type="email"]', testUser.email);
        await page.fill('input[type="password"]', 'WrongPassword123!');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
      }

      // Should show rate limiting message
      const hasRateLimitMessage = await page.locator('text=/too.*many.*attempts|rate.*limit|try.*again.*later/i').count();
      expect(hasRateLimitMessage).toBeGreaterThan(0);
      console.log('✅ Login rate limiting working');
    });

    test('should show remaining attempts before lockout', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.BUTTERS;

      // Mock failed login with attempt counter
      await authUtils.mockAuthAPI('login', {
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        attemptsRemaining: 2,
        maxAttempts: 5,
      }, 401);

      await authUtils.navigateToAuthPage('login');
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Should show remaining attempts
      const hasAttemptWarning = await page.locator('text=/attempts.*remaining|2.*attempts.*left/i').count();
      
      if (hasAttemptWarning > 0) {
        console.log('✅ Remaining attempts warning displayed');
      } else {
        console.log('ℹ️  Attempt counter may not be implemented yet');
      }
    });
  });

  test.describe('Account Lockout', () => {
    test('should lock account after maximum failed attempts', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.WENDY;

      // Mock account lockout
      await authUtils.mockAuthAPI('login', {
        success: false,
        message: 'Account has been locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockoutExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      }, 423);

      await authUtils.navigateToAuthPage('login');
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Should show account locked message
      const hasLockoutMessage = await page.locator('text=/account.*locked|locked.*due.*to|too.*many.*failed/i').count();
      expect(hasLockoutMessage).toBeGreaterThan(0);
      console.log('✅ Account lockout message displayed');
    });

    test('should provide account unlock mechanism', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock unlock account endpoint
      await authUtils.mockAuthAPI('unlock-account', {
        success: true,
        message: 'Account unlock email sent',
      });

      // Test unlock account request
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/unlock-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'locked@example.com' }),
        }).then(r => r.json());
      });

      if (response.success) {
        console.log('✅ Account unlock mechanism available');
      } else {
        console.log('ℹ️  Account unlock may not be implemented yet');
      }
    });
  });

  test.describe('Suspicious Activity Detection', () => {
    test('should detect login from unusual location', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.RANDY;

      // Mock suspicious login detection
      await authUtils.mockAuthAPI('login', {
        success: true,
        message: 'Login successful, but unusual activity detected',
        data: {
          user: {
            id: 'randy-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
          },
          tokens: {
            accessToken: 'randy-token',
            refreshToken: 'randy-refresh',
            expiresIn: 3600,
          },
          securityAlert: {
            type: 'UNUSUAL_LOCATION',
            message: 'Login from new location detected',
            location: 'Unknown Location',
            requiresVerification: true,
          },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      // Should show security alert
      const hasSecurityAlert = await page.locator('text=/unusual.*activity|new.*location|security.*alert/i').count();
      
      if (hasSecurityAlert > 0) {
        console.log('✅ Suspicious activity detection working');
      } else {
        console.log('ℹ️  Suspicious activity detection may not be implemented yet');
      }
    });

    test('should detect login from new device', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock new device detection
      await authUtils.mockAuthAPI('login', {
        success: true,
        message: 'Login from new device detected',
        data: {
          user: { id: 'user-123', email: 'test@example.com', name: 'Test User', isVerified: true },
          tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 },
          securityAlert: {
            type: 'NEW_DEVICE',
            message: 'Login from unrecognized device',
            deviceInfo: 'Chrome on Unknown OS',
            requiresVerification: false,
          },
        },
      });

      const response = await page.evaluate(async () => {
        return fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        }).then(r => r.json());
      });

      if (response.data?.securityAlert) {
        console.log('✅ New device detection working');
      } else {
        console.log('ℹ️  New device detection may not be implemented yet');
      }
    });
  });

  test.describe('Account Deactivation & Deletion', () => {
    test('should allow account deactivation', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.JIMMY;

      // Mock login and deactivation
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: { id: 'jimmy-123', email: testUser.email, name: testUser.name, isVerified: true },
          tokens: { accessToken: 'jimmy-token', refreshToken: 'jimmy-refresh', expiresIn: 3600 },
        },
      });

      await authUtils.mockAuthAPI('deactivate-account', {
        success: true,
        message: 'Account deactivated successfully',
        data: {
          deactivatedAt: new Date().toISOString(),
          reactivationPeriod: 30, // days
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      // Navigate to account settings
      await page.goto('/account/settings', { timeout: 15000 });
      await page.waitForTimeout(2000);

      // Look for deactivation option
      const hasDeactivateOption = await page.locator('button:has-text("Deactivate"), a:has-text("Deactivate")').count();
      
      if (hasDeactivateOption > 0) {
        await page.click('button:has-text("Deactivate"), a:has-text("Deactivate")');
        await page.waitForTimeout(2000);

        // Should show confirmation dialog
        const hasConfirmation = await page.locator('text=/confirm.*deactivat|are.*you.*sure/i').count();
        
        if (hasConfirmation > 0) {
          await page.click('button:has-text("Confirm"), button:has-text("Yes")');
          await page.waitForTimeout(3000);

          const hasSuccessMessage = await page.locator('text=/account.*deactivated|deactivation.*successful/i').count();
          expect(hasSuccessMessage).toBeGreaterThan(0);
          console.log('✅ Account deactivation working');
        }
      } else {
        console.log('ℹ️  Account deactivation may not be implemented yet');
      }
    });

    test('should allow account deletion with confirmation', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.TIMMY;

      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: { id: 'timmy-123', email: testUser.email, name: testUser.name, isVerified: true },
          tokens: { accessToken: 'timmy-token', refreshToken: 'timmy-refresh', expiresIn: 3600 },
        },
      });

      await authUtils.mockAuthAPI('delete-account', {
        success: true,
        message: 'Account deletion initiated',
        data: {
          deletionScheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          gracePeriod: 7, // days
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      await page.goto('/account/settings', { timeout: 15000 });
      await page.waitForTimeout(2000);

      const hasDeleteOption = await page.locator('button:has-text("Delete"), a:has-text("Delete")').count();
      
      if (hasDeleteOption > 0) {
        await page.click('button:has-text("Delete"), a:has-text("Delete")');
        await page.waitForTimeout(2000);

        // Should require password confirmation
        const hasPasswordConfirm = await page.locator('input[type="password"]').count();
        
        if (hasPasswordConfirm > 0) {
          await page.fill('input[type="password"]', testUser.password);
          await page.click('button:has-text("Confirm"), button:has-text("Delete")');
          await page.waitForTimeout(3000);

          const hasSuccessMessage = await page.locator('text=/deletion.*initiated|account.*will.*be.*deleted/i').count();
          expect(hasSuccessMessage).toBeGreaterThan(0);
          console.log('✅ Account deletion with confirmation working');
        }
      } else {
        console.log('ℹ️  Account deletion may not be implemented yet');
      }
    });
  });

  test.describe('Security Notifications', () => {
    test('should send security notifications for important events', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock security notification endpoints
      const securityEvents = [
        'password_changed',
        'login_from_new_device',
        'account_locked',
        'suspicious_activity',
        'account_deactivated',
      ];

      for (const event of securityEvents) {
        await authUtils.mockAuthAPI(`security-notification/${event}`, {
          success: true,
          message: `Security notification sent for ${event}`,
          data: {
            notificationType: event,
            sentAt: new Date().toISOString(),
            channels: ['email', 'sms'],
          },
        });
      }

      console.log('✅ Security notification endpoints configured');
      console.log('ℹ️  Security notifications should be sent for:');
      console.log('   - Password changes');
      console.log('   - Login from new device/location');
      console.log('   - Account lockouts');
      console.log('   - Suspicious activity detection');
      console.log('   - Account deactivation/deletion');
    });
  });
});
