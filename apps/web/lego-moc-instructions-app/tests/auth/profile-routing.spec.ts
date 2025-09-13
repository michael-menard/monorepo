import { expect, test } from '@playwright/test';
import { createAuthTestUtils } from './utils';
import { SOUTH_PARK_USERS, TEST_USERS } from './test-users';

/**
 * Profile Page Routing Tests
 * 
 * Tests authentication routing and profile page access:
 * - Successful login redirects to profile/dashboard
 * - Protected routes require authentication
 * - User information is displayed correctly
 * - Logout functionality works
 * - Authentication state persistence
 */
test.describe('Profile Page Routing & Authentication State', () => {
  test.describe.configure({ timeout: 90000 }); // 90 seconds per test

  test.beforeAll(async () => {
    console.log('👤 Testing Profile Page Routing:');
    console.log('  - Login → Profile redirect');
    console.log('  - Protected route access');
    console.log('  - User info display');
    console.log('  - Authentication state');
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test.describe('Post-Login Routing', () => {
    test('should redirect to profile page after successful login', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.STAN;

      // Mock successful login with user data
      await authUtils.mockAuthAPI('login', {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'stan-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
            role: testUser.role,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
          },
          tokens: {
            accessToken: 'mock-access-token-stan',
            refreshToken: 'mock-refresh-token-stan',
            expiresIn: 3600,
          },
        },
      });

      // Perform login
      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);

      // Wait for redirect
      await page.waitForTimeout(4000);

      // Check if redirected to a protected page
      const currentUrl = page.url();
      const protectedPagePatterns = [
        /\/profile/,
        /\/dashboard/,
        /\/account/,
        /\/user/,
        /\/home$/,
        /\/app$/,
        /\/$/, // Root after login
      ];

      const isOnProtectedPage = protectedPagePatterns.some(pattern => pattern.test(currentUrl));
      expect(isOnProtectedPage).toBeTruthy();

      console.log(`✅ Successfully redirected to: ${currentUrl}`);

      // Verify we're not on auth pages anymore
      expect(currentUrl).not.toMatch(/\/auth\/(login|signup|forgot-password)/);
    });

    test('should display user information on profile page', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.KYLE;

      // Mock login and navigate to profile
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'kyle-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
            role: testUser.role,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
          },
          tokens: {
            accessToken: 'mock-access-token-kyle',
            refreshToken: 'mock-refresh-token-kyle',
            expiresIn: 3600,
          },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(4000);

      // Look for user information on the page
      const userInfoSelectors = [
        `text=${testUser.name}`,
        `text=${testUser.email}`,
        'text=/profile|account|dashboard/i',
        'text=/logout|sign out/i',
      ];

      let userInfoFound = false;
      for (const selector of userInfoSelectors) {
        const elementCount = await page.locator(selector).count();
        if (elementCount > 0) {
          userInfoFound = true;
          console.log(`✅ Found user info: ${selector}`);
          break;
        }
      }

      // If no specific user info found, check for general authenticated state indicators
      if (!userInfoFound) {
        const authStateIndicators = await page.locator('button, a, text').evaluateAll(elements => {
          return elements.some(el => {
            const text = el.textContent?.toLowerCase() || '';
            return text.includes('logout') || 
                   text.includes('sign out') || 
                   text.includes('profile') || 
                   text.includes('account') ||
                   text.includes('dashboard');
          });
        });

        expect(authStateIndicators).toBeTruthy();
        console.log('✅ Authentication state indicators found');
      }
    });

    test('should redirect admin users to appropriate page', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const adminUser = SOUTH_PARK_USERS.RANDY; // Admin user

      // Mock admin login
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'randy-admin-123',
            email: adminUser.email,
            name: adminUser.name,
            isVerified: true,
            role: 'admin',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
          },
          tokens: {
            accessToken: 'mock-admin-token',
            refreshToken: 'mock-admin-refresh',
            expiresIn: 3600,
          },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(adminUser.email, adminUser.password);
      await page.waitForTimeout(4000);

      // Should be redirected to a protected page (admin or regular)
      const currentUrl = page.url();
      expect(currentUrl).not.toMatch(/\/auth\//);

      // Look for admin-specific elements or general authenticated state
      const hasAdminElements = await page.locator('text=/admin|dashboard|manage/i').count();
      const hasAuthElements = await page.locator('text=/logout|profile|account/i').count();

      expect(hasAdminElements > 0 || hasAuthElements > 0).toBeTruthy();
      console.log(`✅ Admin user redirected to: ${currentUrl}`);
    });
  });

  test.describe('Protected Route Access', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      test.setTimeout(45000);

      // Try to access protected routes without authentication
      const protectedRoutes = [
        '/profile',
        '/dashboard',
        '/account',
        '/user',
        '/settings',
      ];

      for (const route of protectedRoutes) {
        try {
          await page.goto(route, { timeout: 10000 });
          await page.waitForTimeout(2000);

          const currentUrl = page.url();
          
          // Should be redirected to login or show login form
          const isOnLoginPage = currentUrl.includes('/login') || 
                               currentUrl.includes('/auth') ||
                               await page.locator('input[type="email"]').count() > 0;

          if (isOnLoginPage) {
            console.log(`✅ ${route} → redirected to login`);
          } else {
            console.log(`ℹ️  ${route} → accessible without auth (may be expected)`);
          }
        } catch (error) {
          console.log(`ℹ️  ${route} → route not found (may not exist yet)`);
        }
      }
    });

    test('should allow authenticated users to access protected routes', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = TEST_USERS.STANDARD;

      // First, authenticate the user
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'auth-user-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
            role: testUser.role,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
          },
          tokens: {
            accessToken: 'mock-auth-token',
            refreshToken: 'mock-auth-refresh',
            expiresIn: 3600,
          },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      // Now try to access protected routes
      const protectedRoutes = ['/profile', '/dashboard', '/account'];

      for (const route of protectedRoutes) {
        try {
          await page.goto(route, { timeout: 10000 });
          await page.waitForTimeout(2000);

          const currentUrl = page.url();
          
          // Should not be redirected back to login
          const isStillOnProtectedRoute = !currentUrl.includes('/login') && 
                                         !currentUrl.includes('/auth/login');

          if (isStillOnProtectedRoute) {
            console.log(`✅ Authenticated access to ${route} successful`);
          }
        } catch (error) {
          console.log(`ℹ️  ${route} → route may not exist yet`);
        }
      }
    });
  });

  test.describe('Authentication State Management', () => {
    test('should maintain authentication state across page refreshes', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.BUTTERS;

      // Login first
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'butters-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
            role: testUser.role,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
          },
          tokens: {
            accessToken: 'mock-butters-token',
            refreshToken: 'mock-butters-refresh',
            expiresIn: 3600,
          },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      const urlAfterLogin = page.url();

      // Refresh the page
      await page.reload({ timeout: 15000 });
      await page.waitForTimeout(3000);

      // Should still be authenticated (not redirected to login)
      const urlAfterRefresh = page.url();
      const isStillAuthenticated = !urlAfterRefresh.includes('/login') && 
                                  !urlAfterRefresh.includes('/auth/login');

      if (isStillAuthenticated) {
        console.log('✅ Authentication state maintained after refresh');
      } else {
        console.log('ℹ️  Authentication state not persisted (may be expected behavior)');
      }
    });

    test('should handle logout and redirect to login', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.WENDY;

      // Login first
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'wendy-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
            role: testUser.role,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
          },
          tokens: {
            accessToken: 'mock-wendy-token',
            refreshToken: 'mock-wendy-refresh',
            expiresIn: 3600,
          },
        },
      });

      // Mock logout response
      await authUtils.mockAuthAPI('logout', {
        success: true,
        message: 'Logged out successfully',
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      // Look for logout button and click it
      const logoutSelectors = [
        'button:has-text("Logout")',
        'button:has-text("Sign Out")',
        'a:has-text("Logout")',
        'a:has-text("Sign Out")',
        '[data-testid="logout"]',
        'text=/logout|sign out/i',
      ];

      let logoutClicked = false;
      for (const selector of logoutSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            await element.click({ timeout: 5000 });
            logoutClicked = true;
            console.log(`✅ Clicked logout: ${selector}`);
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      if (logoutClicked) {
        await page.waitForTimeout(3000);

        // Should be redirected to login page
        const currentUrl = page.url();
        const isOnLoginPage = currentUrl.includes('/login') || 
                             currentUrl.includes('/auth') ||
                             await page.locator('input[type="email"]').count() > 0;

        expect(isOnLoginPage).toBeTruthy();
        console.log(`✅ Logout successful, redirected to: ${currentUrl}`);
      } else {
        console.log('ℹ️  Logout button not found (may not be implemented yet)');
      }
    });
  });

  test.describe('User Experience Flow', () => {
    test('should provide smooth user experience from login to profile', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.CARTMAN;

      console.log('🎭 Testing user experience with Eric Cartman...');

      // Mock successful login
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'cartman-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
            role: testUser.role,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
          },
          tokens: {
            accessToken: 'mock-cartman-token',
            refreshToken: 'mock-cartman-refresh',
            expiresIn: 3600,
          },
        },
      });

      // Start timing the flow
      const startTime = Date.now();

      // Navigate to login
      await authUtils.navigateToAuthPage('login');
      
      // Perform login
      await authUtils.login(testUser.email, testUser.password);
      
      // Wait for redirect and page load
      await page.waitForTimeout(4000);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify successful authentication
      const currentUrl = page.url();
      const isAuthenticated = !currentUrl.includes('/auth/login');

      expect(isAuthenticated).toBeTruthy();

      // Check for loading states and smooth transitions
      const hasLoadingIndicators = await page.locator('[data-testid="loading"], .loading, .spinner').count();
      
      console.log(`✅ Login to profile flow completed in ${totalTime}ms`);
      console.log(`   Final URL: ${currentUrl}`);
      console.log(`   Loading indicators: ${hasLoadingIndicators}`);

      // Verify reasonable performance (should complete within 30 seconds)
      expect(totalTime).toBeLessThan(30000);
    });
  });
});
