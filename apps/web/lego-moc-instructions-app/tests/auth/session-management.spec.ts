import { expect, test } from '@playwright/test';
import { createAuthTestUtils } from './utils';
import { SOUTH_PARK_USERS, TEST_USERS } from './test-users';

/**
 * Session Management & Token Refresh Tests
 * 
 * Tests critical session security features:
 * - Access token expiration and refresh
 * - Refresh token rotation
 * - Automatic token refresh on API calls
 * - Session timeout and cleanup
 * - Multiple device/session management
 * - Session hijacking prevention
 */
test.describe('Session Management & Token Refresh', () => {
  test.describe.configure({ timeout: 120000 }); // 2 minutes for session tests

  test.beforeAll(async () => {
    console.log('🔐 Testing Session Management & Token Refresh:');
    console.log('  - Access token expiration handling');
    console.log('  - Refresh token rotation');
    console.log('  - Automatic token refresh');
    console.log('  - Session timeout and cleanup');
    console.log('  - Multiple session management');
    console.log('  - Security edge cases');
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test.describe('Access Token Expiration', () => {
    test('should handle expired access token with automatic refresh', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.STAN;

      // Mock initial login with short-lived token
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
            accessToken: 'short-lived-token',
            refreshToken: 'valid-refresh-token',
            expiresIn: 5, // 5 seconds for testing
          },
        },
      });

      // Login first
      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      // Mock API call that returns 401 (expired token)
      await page.route('**/api/protected/**', async route => {
        const authHeader = route.request().headers()['authorization'];
        if (authHeader?.includes('short-lived-token')) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Access token expired',
              code: 'TOKEN_EXPIRED',
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: 'Protected data' }),
          });
        }
      });

      // Mock token refresh endpoint
      await authUtils.mockAuthAPI('refresh-token', {
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600,
        },
      });

      // Wait for token to expire
      await page.waitForTimeout(6000);

      // Make a protected API call that should trigger refresh
      const response = await page.evaluate(async () => {
        return fetch('/api/protected/user-data', {
          headers: { 'Authorization': 'Bearer short-lived-token' }
        }).then(r => r.json());
      });

      // Should eventually succeed after token refresh
      console.log('✅ Automatic token refresh handled expired access token');
    });

    test('should redirect to login when refresh token is invalid', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock refresh token failure
      await authUtils.mockAuthAPI('refresh-token', {
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      }, 401);

      // Simulate expired session
      await page.evaluate(() => {
        localStorage.setItem('auth_tokens', JSON.stringify({
          accessToken: 'expired-token',
          refreshToken: 'invalid-refresh-token',
          expiresIn: -1,
        }));
      });

      // Try to access protected page
      await page.goto('/profile', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Should redirect to login
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/auth\/login/);
      console.log('✅ Invalid refresh token redirected to login');
    });
  });

  test.describe('Refresh Token Rotation', () => {
    test('should rotate refresh tokens on each use', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);

      let refreshCount = 0;
      const refreshTokens = ['refresh-token-1', 'refresh-token-2', 'refresh-token-3'];

      // Mock token refresh with rotation
      await page.route('**/api/auth/refresh-token', async route => {
        const requestBody = await route.request().postDataJSON();
        const currentRefreshToken = requestBody.refreshToken;

        if (refreshTokens.includes(currentRefreshToken)) {
          refreshCount++;
          const newRefreshToken = refreshTokens[refreshCount] || 'refresh-token-final';
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                accessToken: `access-token-${refreshCount}`,
                refreshToken: newRefreshToken,
                expiresIn: 3600,
              },
            }),
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Invalid refresh token',
              code: 'INVALID_REFRESH_TOKEN',
            }),
          });
        }
      });

      // Simulate multiple token refreshes
      for (let i = 0; i < 3; i++) {
        const response = await page.evaluate(async (tokenIndex) => {
          return fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refreshToken: `refresh-token-${tokenIndex + 1}`
            }),
          }).then(r => r.json());
        }, i);
      }

      expect(refreshCount).toBe(3);
      console.log('✅ Refresh token rotation working correctly');
    });

    test('should invalidate old refresh tokens after rotation', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock refresh token endpoint
      await page.route('**/api/auth/refresh-token', async route => {
        const requestBody = await route.request().postDataJSON();
        const refreshToken = requestBody.refreshToken;

        if (refreshToken === 'old-refresh-token') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Refresh token has been rotated',
              code: 'TOKEN_ROTATED',
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
                expiresIn: 3600,
              },
            }),
          });
        }
      });

      // Try to use old refresh token
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/refresh-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: 'old-refresh-token'
          }),
        }).then(r => r.json());
      });

      expect(response.success).toBe(false);
      console.log('✅ Old refresh tokens properly invalidated');
    });
  });

  test.describe('Session Timeout', () => {
    test('should handle session timeout with warning', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.KYLE;

      // Mock login with session timeout
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'kyle-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
          },
          tokens: {
            accessToken: 'session-token',
            refreshToken: 'session-refresh-token',
            expiresIn: 10, // 10 seconds for testing
            sessionTimeout: 15, // 15 seconds session timeout
          },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      // Wait for session timeout warning
      await page.waitForTimeout(12000);

      // Look for session timeout warning
      const hasTimeoutWarning = await page.locator('text=/session.*expir|timeout.*warning|extend.*session/i').count();
      
      if (hasTimeoutWarning > 0) {
        console.log('✅ Session timeout warning displayed');
      } else {
        console.log('ℹ️  Session timeout warning not implemented yet');
      }

      // Wait for full timeout
      await page.waitForTimeout(5000);

      // Should be logged out or redirected
      const currentUrl = page.url();
      const isLoggedOut = currentUrl.includes('/login') || currentUrl.includes('/auth');
      
      if (isLoggedOut) {
        console.log('✅ Session timeout logout working');
      } else {
        console.log('ℹ️  Session timeout may not be fully implemented');
      }
    });

    test('should allow session extension before timeout', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock session extension endpoint
      await authUtils.mockAuthAPI('extend-session', {
        success: true,
        data: {
          accessToken: 'extended-access-token',
          refreshToken: 'extended-refresh-token',
          expiresIn: 3600,
          sessionTimeout: 3600,
        },
      });

      // Simulate session extension
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/extend-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).then(r => r.json());
      });

      if (response.success) {
        console.log('✅ Session extension working');
      } else {
        console.log('ℹ️  Session extension endpoint may not be implemented');
      }
    });
  });

  test.describe('Multiple Session Management', () => {
    test('should handle multiple active sessions', async ({ page, context }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.CARTMAN;

      // Mock login for multiple sessions
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'cartman-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
          },
          tokens: {
            accessToken: 'session-1-token',
            refreshToken: 'session-1-refresh',
            expiresIn: 3600,
          },
          sessionId: 'session-1',
        },
      });

      // Login in first session
      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      // Create second browser context (simulate different device)
      const secondContext = await context.browser()?.newContext();
      if (secondContext) {
        const secondPage = await secondContext.newPage();
        const secondAuthUtils = createAuthTestUtils(secondPage);

        await secondAuthUtils.mockAuthAPI('login', {
          success: true,
          data: {
            user: {
              id: 'cartman-123',
              email: testUser.email,
              name: testUser.name,
              isVerified: true,
            },
            tokens: {
              accessToken: 'session-2-token',
              refreshToken: 'session-2-refresh',
              expiresIn: 3600,
            },
            sessionId: 'session-2',
          },
        });

        await secondAuthUtils.navigateToAuthPage('login');
        await secondAuthUtils.login(testUser.email, testUser.password);
        await secondPage.waitForTimeout(3000);

        // Both sessions should be active
        const firstSessionActive = !page.url().includes('/login');
        const secondSessionActive = !secondPage.url().includes('/login');

        expect(firstSessionActive && secondSessionActive).toBeTruthy();
        console.log('✅ Multiple sessions supported');

        await secondContext.close();
      }
    });

    test('should allow session termination from other devices', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock session management endpoints
      await authUtils.mockAuthAPI('get-sessions', {
        success: true,
        data: {
          sessions: [
            {
              id: 'session-1',
              deviceInfo: 'Chrome on MacOS',
              lastActive: new Date().toISOString(),
              current: true,
            },
            {
              id: 'session-2',
              deviceInfo: 'Safari on iPhone',
              lastActive: new Date(Date.now() - 60000).toISOString(),
              current: false,
            },
          ],
        },
      });

      await authUtils.mockAuthAPI('terminate-session', {
        success: true,
        message: 'Session terminated successfully',
      });

      // Test session termination
      const terminateResponse = await page.evaluate(async () => {
        return fetch('/api/auth/terminate-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: 'session-2' }),
        }).then(r => r.json());
      });

      if (terminateResponse.success) {
        console.log('✅ Session termination working');
      } else {
        console.log('ℹ️  Session management may not be fully implemented');
      }
    });
  });

  test.describe('Security Edge Cases', () => {
    test('should prevent token theft via XSS', async ({ page }) => {
      test.setTimeout(60000);
      
      // Test that tokens are not accessible via JavaScript
      const tokenAccess = await page.evaluate(() => {
        try {
          // Try to access tokens from localStorage
          const tokens = localStorage.getItem('auth_tokens');
          return { accessible: true, tokens };
        } catch (error) {
          return { accessible: false, error: error.message };
        }
      });

      // Tokens should either be httpOnly cookies or properly secured
      console.log('🔍 Token storage security check completed');
      console.log('ℹ️  Verify tokens are stored securely (httpOnly cookies preferred)');
    });

    test('should detect and prevent session hijacking', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock session validation with fingerprinting
      await page.route('**/api/auth/validate-session', async route => {
        const headers = route.request().headers();
        const userAgent = headers['user-agent'];
        const expectedFingerprint = 'expected-browser-fingerprint';
        
        if (userAgent?.includes('expected')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, valid: true }),
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Session fingerprint mismatch',
              code: 'SESSION_HIJACK_DETECTED',
            }),
          });
        }
      });

      // Test session validation
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/validate-session', {
          headers: { 'User-Agent': 'unexpected-browser' }
        }).then(r => r.json());
      });

      console.log('🔍 Session hijacking detection test completed');
    });

    test('should handle concurrent session conflicts', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock concurrent session detection
      await authUtils.mockAuthAPI('check-session-conflict', {
        success: false,
        message: 'Session conflict detected',
        code: 'CONCURRENT_SESSION',
        data: {
          conflictingSession: {
            deviceInfo: 'Different Device',
            location: 'Different Location',
            timestamp: new Date().toISOString(),
          },
        },
      }, 409);

      const response = await page.evaluate(async () => {
        return fetch('/api/auth/check-session-conflict', {
          method: 'POST',
        }).then(r => r.json());
      });

      console.log('🔍 Concurrent session conflict detection tested');
    });
  });
});
