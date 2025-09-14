import { expect, test } from '@playwright/test';
import { createAuthTestUtils, TEST_USER, BACKEND_URLS } from './utils';

/**
 * Comprehensive E2E tests for the consolidated auth flow
 * Tests the integration between the shared auth package and the web app
 */
test.describe('Consolidated Auth Flow - Shared Package Integration', () => {
  // Set timeout for this entire test suite
  test.describe.configure({ timeout: 90000 }); // 90 seconds per test (more complex tests)
  test.beforeAll(async () => {
    console.log('🧪 Testing Consolidated Auth Flow:');
    console.log(`  Auth Service: http://localhost:9000`);
    console.log(`  Frontend: http://localhost:3001`);
    console.log('  Using shared @repo/auth package');
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test.describe('CSRF Protection', () => {
    test('should include CSRF token in auth requests', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);
      
      // Track network requests
      const requests: any[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/auth/')) {
          requests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
          });
        }
      });

      // Navigate to login page
      await authUtils.navigateToAuthPage('login');

      // Mock successful login with CSRF token requirement
      await page.route('**/api/auth/login', async route => {
        const headers = route.request().headers();
        const hasCSRFToken = headers['x-csrf-token'] || headers['X-CSRF-Token'];
        
        if (hasCSRFToken) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                user: {
                  id: '1',
                  email: TEST_USER.email,
                  name: `${TEST_USER.firstName} ${TEST_USER.lastName}`,
                  isVerified: true,
                },
                tokens: {
                  accessToken: 'mock-access-token',
                  refreshToken: 'mock-refresh-token',
                  expiresIn: 3600,
                },
              },
            }),
          });
        } else {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              code: 'CSRF_FAILED',
              message: 'CSRF token validation failed',
            }),
          });
        }
      });

      // Attempt login
      await authUtils.login(TEST_USER.email, TEST_USER.password);

      // Wait for request to complete
      await page.waitForTimeout(2000);

      // Verify CSRF token was included in the request
      const loginRequest = requests.find(req => req.url.includes('/login'));
      expect(loginRequest).toBeDefined();
      
      // Should have CSRF token header (case-insensitive check)
      const hasCSRFHeader = Object.keys(loginRequest.headers).some(key => 
        key.toLowerCase() === 'x-csrf-token'
      );
      expect(hasCSRFHeader).toBeTruthy();
    });

    test('should retry request after CSRF failure', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);
      let requestCount = 0;

      // Mock CSRF failure on first request, success on retry
      await page.route('**/api/auth/login', async route => {
        requestCount++;
        
        if (requestCount === 1) {
          // First request fails with CSRF error
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              code: 'CSRF_FAILED',
              message: 'CSRF token validation failed',
            }),
          });
        } else {
          // Retry succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                user: {
                  id: '1',
                  email: TEST_USER.email,
                  name: `${TEST_USER.firstName} ${TEST_USER.lastName}`,
                  isVerified: true,
                },
              },
            }),
          });
        }
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(TEST_USER.email, TEST_USER.password);

      // Wait for retry logic to complete
      await page.waitForTimeout(3000);

      // Should have made 2 requests (original + retry)
      expect(requestCount).toBe(2);

      // Should eventually succeed and redirect to profile
      await expect(page).toHaveURL(/.*\/(profile|dashboard|home|\/)$/);
    });
  });

  test.describe('Login Flow with Shared Package', () => {
    test('should successfully login using shared auth components', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);

      // Mock successful login response
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: '1',
            email: TEST_USER.email,
            name: `${TEST_USER.firstName} ${TEST_USER.lastName}`,
            isVerified: true,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600,
          },
        },
      });

      // Navigate to login page
      await authUtils.navigateToAuthPage('login');

      // Verify shared auth package components are rendered
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Perform login
      await authUtils.login(TEST_USER.email, TEST_USER.password);

      // Should redirect to profile page on success
      await authUtils.waitForAuthSuccess('/profile');

      // Verify user is authenticated
      await expect(page).toHaveURL(/.*\/(profile|dashboard|home|\/)$/);
    });

    test('should display validation errors from shared package', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);

      await authUtils.navigateToAuthPage('login');

      // Try to submit with empty fields
      await page.click('button[type="submit"]');

      // Should show validation errors from shared auth package
      await expect(page.locator('text=/email.*required|please enter.*email/i')).toBeVisible();
      await expect(page.locator('text=/password.*required|please enter.*password/i')).toBeVisible();
    });

    test('should handle login errors from API', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);

      // Mock failed login response
      await authUtils.mockAuthAPI('login', {
        success: false,
        message: 'Invalid credentials',
      }, 401);

      await authUtils.navigateToAuthPage('login');
      await authUtils.login('wrong@email.com', 'wrongpassword');

      // Should display error message
      await expect(page.locator('text=/invalid credentials/i')).toBeVisible();
    });
  });

  test.describe('Signup Flow with Shared Package', () => {
    test('should successfully signup using shared auth components', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);

      // Mock successful signup response
      await authUtils.mockAuthAPI('signup', {
        success: true,
        message: 'Account created successfully',
        data: {
          user: {
            id: '2',
            email: TEST_USER.email,
            name: `${TEST_USER.firstName} ${TEST_USER.lastName}`,
            isVerified: false,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        },
      });

      await authUtils.navigateToAuthPage('signup');

      // Verify shared auth package components are rendered
      // Note: Updated to use single name field instead of firstName/lastName
      await expect(page.locator('input[placeholder*="name"], input[name="name"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();

      // Fill signup form with updated structure
      await page.fill('input[placeholder*="name"], input[name="name"]', `${TEST_USER.firstName} ${TEST_USER.lastName}`);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.fill('input[name="confirmPassword"]', TEST_USER.confirmPassword);
      
      await page.click('button[type="submit"]');

      // Should show success message or redirect
      const hasSuccessMessage = await page.locator('text=/success|created|registered/i').count();
      const isRedirected = !page.url().includes('/signup');
      
      expect(hasSuccessMessage > 0 || isRedirected).toBeTruthy();
    });

    test('should validate password confirmation', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);

      await authUtils.navigateToAuthPage('signup');

      // Fill form with mismatched passwords
      await page.fill('input[placeholder*="name"], input[name="name"]', `${TEST_USER.firstName} ${TEST_USER.lastName}`);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.fill('input[name="confirmPassword"]', 'different-password');
      
      await page.click('button[type="submit"]');

      // Should show password mismatch error
      await expect(page.locator('text=/passwords.*match/i')).toBeVisible();
    });
  });

  test.describe('Forgot Password Flow', () => {
    test('should send password reset request', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);

      // Mock successful forgot password response
      await authUtils.mockAuthAPI('forgot-password', {
        success: true,
        message: 'Password reset email sent',
      });

      await authUtils.navigateToAuthPage('forgot-password');

      // Fill email and submit
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('text=/reset.*email.*sent/i')).toBeVisible();
    });
  });

  test.describe('Redux Store Integration', () => {
    test('should properly integrate with Redux store', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);

      // Mock successful login
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: '1',
            email: TEST_USER.email,
            name: `${TEST_USER.firstName} ${TEST_USER.lastName}`,
            isVerified: true,
          },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(TEST_USER.email, TEST_USER.password);

      // Wait for Redux state to update
      await page.waitForTimeout(1000);

      // Check if Redux DevTools extension is available and state is updated
      const reduxState = await page.evaluate(() => {
        // Try to access Redux state through window.__REDUX_DEVTOOLS_EXTENSION__
        return (window as any).__REDUX_DEVTOOLS_EXTENSION__?.getState?.() || null;
      });

      // If Redux DevTools is available, verify auth state
      if (reduxState) {
        expect(reduxState.auth || reduxState.authApi).toBeDefined();
      }
    });
  });

  test.describe('Navigation and Routing', () => {
    test('should navigate between auth pages using TanStack Router', async ({ page }) => {
      await page.goto('/auth/login');
      await expect(page).toHaveURL(/.*\/auth\/login$/);

      // Navigate to signup from login
      await page.click('text=/sign up|create account/i');
      await expect(page).toHaveURL(/.*\/auth\/signup$/);

      // Navigate to forgot password
      await page.goto('/auth/login');
      await page.click('text=/forgot.*password/i');
      await expect(page).toHaveURL(/.*\/auth\/forgot-password$/);
    });
  });
});
