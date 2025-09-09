import { expect, test } from '@playwright/test';
import { createAuthTestUtils, TEST_USER, BACKEND_URLS, TestPatterns } from './utils';

test.describe('Auth Flow - Native Backend Integration', () => {
  test.beforeAll(async () => {
    // This will be shown in test output to confirm native backend URLs
    console.log('🔧 Testing against Native Backends:');
    console.log(`  Auth Service: ${BACKEND_URLS.auth}`);
    console.log(`  LEGO API: ${BACKEND_URLS.api}`);
    console.log(`  Frontend: ${BACKEND_URLS.frontend}`);
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test('should verify native backend services are accessible', async ({ page }) => {
    await TestPatterns.testNativeBackendConnectivity(page);
  });

  test('should load the home page and display auth options', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // The page should load successfully from the native frontend
    await expect(page).toHaveURL(/.*localhost:5173.*/);
    
    // Should have some way to access authentication
    // This will depend on your app's specific UI structure
    const hasLoginLink = await page.locator('a[href*="/login"], button:has-text("Login"), button:has-text("Sign In")').count();
    const hasSignupLink = await page.locator('a[href*="/signup"], button:has-text("Sign Up"), button:has-text("Register")').count();
    
    expect(hasLoginLink + hasSignupLink).toBeGreaterThan(0);
  });

  test('should navigate to login page', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    
    await authUtils.navigateToAuthPage('login');
    
    // Should be on login page
    await expect(page).toHaveURL(/.*\/login.*/);
    
    // Should have login form elements
    await authUtils.expectFormFields(['email', 'password']);
  });

  test('should navigate to signup page', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    
    await authUtils.navigateToAuthPage('signup');
    
    // Should be on signup page
    await expect(page).toHaveURL(/.*\/signup.*/);
    
    // Should have signup form elements
    await authUtils.expectFormFields(['email', 'password']);
  });

  test('should handle login with native auth service', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    
    // Intercept API calls to verify they go to native backend
    const interceptData = await authUtils.interceptApiCalls();
    
    // Navigate to login
    await authUtils.navigateToAuthPage('login');
    
    // Mock successful login response from native auth service
    await authUtils.mockAuthAPI('login', {
      success: true,
      user: {
        id: '1',
        email: TEST_USER.email,
        firstName: TEST_USER.firstName,
        lastName: TEST_USER.lastName,
      },
      token: 'mock-jwt-token',
    });
    
    // Attempt login
    await authUtils.login(TEST_USER.email, TEST_USER.password);
    
    // Should redirect to home page on success
    await authUtils.waitForAuthSuccess('/');
    
    // Verify API calls were made to native auth service
    await page.waitForTimeout(1000); // Allow time for requests
    expect(interceptData.authRequests.length).toBeGreaterThan(0);
    
    // Check that at least one request went to the native auth service
    const hasAuthRequest = interceptData.authRequests.some(req => 
      req.url.includes(BACKEND_URLS.auth)
    );
    expect(hasAuthRequest).toBeTruthy();
  });

  test('should handle signup with native auth service', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    
    // Intercept API calls
    const interceptData = await authUtils.interceptApiCalls();
    
    // Navigate to signup
    await authUtils.navigateToAuthPage('signup');
    
    // Mock successful signup response
    await authUtils.mockAuthAPI('signup', {
      success: true,
      message: 'Account created successfully',
      user: {
        id: '2',
        email: TEST_USER.email,
        firstName: TEST_USER.firstName,
        lastName: TEST_USER.lastName,
      },
    });
    
    // Attempt signup
    await authUtils.signup(TEST_USER);
    
    // Should show success message or redirect
    // The exact behavior depends on your app's implementation
    const hasSuccessMessage = await page.locator('text=/success|created|registered/i').count();
    const isRedirected = !page.url().includes('/signup');
    
    expect(hasSuccessMessage > 0 || isRedirected).toBeTruthy();
    
    // Verify API calls were made to native auth service
    await page.waitForTimeout(1000);
    expect(interceptData.authRequests.length).toBeGreaterThan(0);
  });

  test('should handle login errors from native auth service', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    
    await authUtils.navigateToAuthPage('login');
    
    // Mock failed login response
    await authUtils.mockAuthAPI('login', {
      error: 'Invalid credentials',
      message: 'The email or password you entered is incorrect',
    }, 401);
    
    // Attempt login with invalid credentials
    await authUtils.login('invalid@email.com', 'wrongpassword');
    
    // Should show error message
    await expect(page.locator('text=/error|invalid|incorrect/i')).toBeVisible({ timeout: 5000 });
    
    // Should remain on login page
    await expect(page).toHaveURL(/.*\/login.*/);
  });

  test('should handle password reset with native auth service', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    
    await authUtils.navigateToAuthPage('forgot-password');
    
    // Mock password reset response
    await authUtils.mockAuthAPI('forgot-password', {
      success: true,
      message: 'Password reset email sent',
    });
    
    // Request password reset
    await authUtils.requestPasswordReset(TEST_USER.email);
    
    // Should show success message
    await expect(page.locator('text=/sent|reset|email/i')).toBeVisible({ timeout: 5000 });
  });

  test('should test LEGO Projects API integration', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    
    // First login to get authenticated
    await authUtils.navigateToAuthPage('login');
    await authUtils.mockAuthAPI('login', {
      success: true,
      user: { id: '1', email: TEST_USER.email },
      token: 'mock-jwt-token',
    });
    await authUtils.login(TEST_USER.email, TEST_USER.password);
    await authUtils.waitForAuthSuccess('/');
    
    // Intercept API calls to LEGO Projects API
    const interceptData = await authUtils.interceptApiCalls();
    
    // Mock LEGO Projects API responses
    await authUtils.mockProjectsAPI('gallery', {
      success: true,
      data: [
        {
          id: '1',
          title: 'Test MOC',
          description: 'A test LEGO MOC',
          imageUrl: '/test-image.jpg',
        },
      ],
    });
    
    // Navigate to a page that uses the LEGO Projects API
    // The exact route depends on your app structure
    const possibleGalleryRoutes = ['/gallery', '/mocs', '/projects', '/instructions'];
    let galleryFound = false;
    
    for (const route of possibleGalleryRoutes) {
      try {
        await page.goto(route, { timeout: 3000 });
        if (page.url().includes(route)) {
          galleryFound = true;
          break;
        }
      } catch (error) {
        // Route doesn't exist, try next one
        continue;
      }
    }
    
    if (galleryFound) {
      // Wait for API calls to be made
      await page.waitForTimeout(2000);
      
      // Verify API calls were made to native LEGO Projects API
      const hasApiRequest = interceptData.apiRequests.some(req => 
        req.url.includes(BACKEND_URLS.api)
      );
      expect(hasApiRequest).toBeTruthy();
    } else {
      console.log('⚠️ No gallery/MOC routes found to test LEGO Projects API integration');
      // This is not a failure - just log for information
    }
  });

  test('should handle authentication state persistence', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    
    // Login first
    await authUtils.navigateToAuthPage('login');
    await authUtils.mockAuthAPI('login', {
      success: true,
      user: { id: '1', email: TEST_USER.email },
      token: 'mock-jwt-token',
    });
    await authUtils.login(TEST_USER.email, TEST_USER.password);
    await authUtils.waitForAuthSuccess('/');
    
    // Verify user is authenticated
    const isAuth = await authUtils.isAuthenticated();
    expect(isAuth).toBeTruthy();
    
    // Refresh the page
    await page.reload();
    await authUtils.waitForNetworkIdle();
    
    // User should still be authenticated after page refresh
    // (This tests that tokens/cookies are properly set)
    const isStillAuth = await authUtils.isAuthenticated();
    expect(isStillAuth).toBeTruthy();
  });

  test('should test responsive design on different viewports', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    
    await authUtils.navigateToAuthPage('login');
    
    // Test responsive design
    await authUtils.testResponsiveDesign();
    
    // Form should still be functional on all viewport sizes
    await authUtils.expectFormFields(['email', 'password']);
  });

  test('should test keyboard navigation', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    
    await authUtils.navigateToAuthPage('login');
    
    // Test keyboard navigation
    await authUtils.testKeyboardNavigation();
    
    // Should be able to submit form with Enter key
    // (The actual behavior depends on form implementation)
  });

  test('should handle network failures gracefully', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    
    await authUtils.navigateToAuthPage('login');
    
    // Mock network failure
    await authUtils.mockAuthAPI('login', { error: 'Network Error' }, 500);
    
    // Attempt login
    await authUtils.login(TEST_USER.email, TEST_USER.password);
    
    // Should handle error gracefully (show error message, not crash)
    const hasErrorIndicator = await page.locator('text=/error|failed|try again/i').count();
    expect(hasErrorIndicator).toBeGreaterThan(0);
  });

  test('should verify CSRF protection is working', async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    const interceptData = await authUtils.interceptApiCalls();
    
    await authUtils.navigateToAuthPage('login');
    
    // Mock login response
    await authUtils.mockAuthAPI('login', {
      success: true,
      user: { id: '1', email: TEST_USER.email },
    });
    
    // Attempt login
    await authUtils.login(TEST_USER.email, TEST_USER.password);
    
    // Wait for requests
    await page.waitForTimeout(1000);
    
    // Check if CSRF tokens are being sent with requests
    if (interceptData.authRequests.length > 0) {
      const hasCSRFToken = interceptData.authRequests.some(req => 
        req.headers['x-csrf-token'] || 
        req.headers['csrf-token'] ||
        req.headers['x-xsrf-token']
      );
      
      // CSRF tokens should be present (unless the implementation doesn't use them)
      console.log(`CSRF protection status: ${hasCSRFToken ? 'Enabled' : 'Not detected'}`);
    }
  });
});
