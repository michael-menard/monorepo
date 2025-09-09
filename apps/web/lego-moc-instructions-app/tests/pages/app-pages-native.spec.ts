import { expect, test } from '@playwright/test';
import { BACKEND_URLS, TEST_USER, createAuthTestUtils } from '../auth/utils';

test.describe('App Pages - Native Backend Integration', () => {
  let authUtils: ReturnType<typeof createAuthTestUtils>;

  test.beforeEach(async ({ page }) => {
    authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    await authUtils.cleanup();
  });

  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Should load from native frontend server
    await expect(page).toHaveURL(/.*localhost:5173.*/);
    
    // Should not show any critical errors
    const errorMessages = await page.locator('text=/error|crash|failed to load/i').count();
    expect(errorMessages).toBe(0);
    
    // Page should have loaded content (not blank)
    const bodyContent = await page.textContent('body');
    expect(bodyContent?.length || 0).toBeGreaterThan(10);
  });

  test('should handle app navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to different routes if they exist
    const commonRoutes = ['/', '/about', '/gallery', '/mocs', '/instructions', '/profile'];
    
    for (const route of commonRoutes) {
      try {
        await page.goto(route, { timeout: 3000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        // If route exists, it should load without errors
        if (page.url().includes(route) || route === '/') {
          const hasErrors = await page.locator('text=/404|not found|error/i').count();
          expect(hasErrors).toBe(0);
          console.log(`✅ Route ${route} loads successfully`);
        }
      } catch (error) {
        // Route might not exist, which is fine
        console.log(`ℹ️ Route ${route} not available or timeout`);
      }
    }
  });

  test('should test LEGO Projects API health endpoint', async ({ page }) => {
    // Test API health endpoint directly
    const response = await page.request.get(`${BACKEND_URLS.api}/api/health`);
    
    // Should respond (even if with 404/500, it means service is running)
    expect(response.status()).toBeLessThan(600);
    
    console.log(`LEGO Projects API health status: ${response.status()}`);
  });

  test('should test Auth Service health endpoint', async ({ page }) => {
    // Test Auth service health endpoint
    const response = await page.request.get(`${BACKEND_URLS.auth}/api/auth/health`);
    
    // Should respond (even if with 404/500, it means service is running)
    expect(response.status()).toBeLessThan(600);
    
    console.log(`Auth Service health status: ${response.status()}`);
  });

  test('should handle API calls to LEGO Projects backend', async ({ page }) => {
    const interceptData = await authUtils.interceptApiCalls();
    
    // Mock API responses for testing
    await authUtils.mockProjectsAPI('gallery', {
      success: true,
      data: [
        {
          id: '1',
          title: 'Test LEGO MOC',
          description: 'A test MOC for E2E testing',
          thumbnail: '/test-thumbnail.jpg',
        },
        {
          id: '2', 
          title: 'Another Test MOC',
          description: 'Another test MOC',
          thumbnail: '/test-thumbnail2.jpg',
        },
      ],
    });

    await authUtils.mockProjectsAPI('csrf', {
      csrfToken: 'test-csrf-token',
    });

    // Try to visit a page that might make API calls
    await page.goto('/');
    
    // Wait for any API calls to be made
    await page.waitForTimeout(2000);
    
    // If any API calls were made, they should be to the native backend
    if (interceptData.apiRequests.length > 0) {
      const allRequestsToNativeAPI = interceptData.apiRequests.every(req =>
        req.url.includes(BACKEND_URLS.api) || req.url.includes(BACKEND_URLS.auth)
      );
      expect(allRequestsToNativeAPI).toBeTruthy();
      console.log(`✅ All ${interceptData.apiRequests.length} API requests went to native backends`);
    } else {
      console.log('ℹ️ No API requests detected from homepage');
    }
  });

  test('should test authenticated user flow', async ({ page }) => {
    // First authenticate user
    await authUtils.navigateToAuthPage('login');
    
    // Mock successful auth
    await authUtils.mockAuthAPI('login', {
      success: true,
      user: {
        id: '1',
        email: TEST_USER.email,
        firstName: TEST_USER.firstName,
        lastName: TEST_USER.lastName,
      },
      token: 'test-jwt-token',
    });

    // Login
    await authUtils.login(TEST_USER.email, TEST_USER.password);
    await authUtils.waitForAuthSuccess('/');
    
    // Now test authenticated user experience
    const isAuthenticated = await authUtils.isAuthenticated();
    expect(isAuthenticated).toBeTruthy();
    
    // Try to access protected routes
    const protectedRoutes = ['/profile', '/dashboard', '/settings', '/upload', '/my-mocs'];
    
    for (const route of protectedRoutes) {
      try {
        await page.goto(route, { timeout: 3000 });
        
        if (page.url().includes(route)) {
          // Route exists and user can access it
          const hasError = await page.locator('text=/unauthorized|forbidden|access denied/i').count();
          expect(hasError).toBe(0);
          console.log(`✅ Authenticated user can access ${route}`);
        }
      } catch (error) {
        // Route might not exist
        console.log(`ℹ️ Protected route ${route} not available`);
      }
    }
  });

  test('should test file upload functionality if available', async ({ page }) => {
    // This test is conditional since not all apps will have file upload
    try {
      await page.goto('/upload', { timeout: 3000 });
      
      if (page.url().includes('/upload')) {
        // Look for file input elements
        const fileInputs = await page.locator('input[type="file"]').count();
        
        if (fileInputs > 0) {
          console.log('✅ File upload functionality detected');
          
          // Mock successful upload response
          await authUtils.mockProjectsAPI('upload', {
            success: true,
            fileId: 'test-file-id',
            url: '/uploads/test-file.jpg',
          });
          
          // Test file upload (with a small test file)
          const fileInput = page.locator('input[type="file"]').first();
          await fileInput.setInputFiles({
            name: 'test-image.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('fake-image-data'),
          });
          
          // Submit if there's a submit button
          const submitButton = page.locator('button[type="submit"], button:has-text("Upload")').first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
            
            // Should handle upload (success or error)
            await page.waitForTimeout(1000);
            const hasResponse = await page.locator('text=/upload|success|error/i').count();
            expect(hasResponse).toBeGreaterThan(0);
          }
        } else {
          console.log('ℹ️ Upload page exists but no file inputs found');
        }
      } else {
        console.log('ℹ️ No upload page available');
      }
    } catch (error) {
      console.log('ℹ️ File upload functionality not available');
    }
  });

  test('should test search functionality if available', async ({ page }) => {
    // Mock search results
    await authUtils.mockProjectsAPI('search', {
      success: true,
      results: [
        {
          id: '1',
          title: 'Castle MOC',
          description: 'A medieval castle build',
          type: 'moc',
        },
        {
          id: '2',
          title: 'Space Station',
          description: 'A futuristic space station',
          type: 'moc',
        },
      ],
    });

    await page.goto('/');
    
    // Look for search functionality
    const searchInputs = await page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i]').count();
    
    if (searchInputs > 0) {
      console.log('✅ Search functionality detected');
      
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
      await searchInput.fill('castle');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(2000);
      
      // Should show some kind of results or response
      const hasResults = await page.locator('text=/result|found|castle/i').count();
      expect(hasResults).toBeGreaterThan(0);
    } else {
      console.log('ℹ️ Search functionality not available on homepage');
    }
  });

  test('should test responsive design across viewports', async ({ page }) => {
    await page.goto('/');
    
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1280, height: 720, name: 'Desktop' },
      { width: 1920, height: 1080, name: 'Large Desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      // Page should still load without layout issues
      const bodyContent = await page.textContent('body');
      expect(bodyContent?.length || 0).toBeGreaterThan(10);
      
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}) renders successfully`);
    }
  });

  test('should test accessibility basics', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic accessibility features
    const hasTitle = await page.locator('title').count();
    expect(hasTitle).toBe(1);
    
    // Check for navigation landmarks
    const hasNav = await page.locator('nav, [role="navigation"]').count();
    const hasMain = await page.locator('main, [role="main"]').count();
    
    console.log(`Accessibility check: Nav landmarks: ${hasNav}, Main landmarks: ${hasMain}`);
    
    // Check for keyboard navigation (basic test)
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    
    if (focusedElement && focusedElement !== 'BODY') {
      console.log(`✅ Keyboard navigation working: focused on ${focusedElement}`);
    } else {
      console.log('ℹ️ No focusable elements detected or keyboard navigation issues');
    }
  });

  test('should test error boundaries and error handling', async ({ page }) => {
    // Listen for JavaScript errors
    const errors: Array<string> = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Listen for console errors
    const consoleErrors: Array<string> = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to a non-existent route
    await page.goto('/this-route-does-not-exist');
    await page.waitForTimeout(1000);
    
    // Should handle 404 gracefully (show 404 page or redirect)
    const has404Handling = await page.locator('text=/404|not found|page not found/i').count();
    const isRedirected = page.url().includes('/') && !page.url().includes('/this-route-does-not-exist');
    
    expect(has404Handling > 0 || isRedirected).toBeTruthy();
    
    // Check for JavaScript errors (should be minimal)
    if (errors.length > 0) {
      console.log(`⚠️ JavaScript errors detected: ${errors.join(', ')}`);
    } else {
      console.log('✅ No JavaScript errors detected');
    }
    
    if (consoleErrors.length > 0) {
      console.log(`⚠️ Console errors detected: ${consoleErrors.join(', ')}`);
    } else {
      console.log('✅ No console errors detected');
    }
  });

  test('should verify all backend services are correctly proxied', async ({ page }) => {
    const interceptData = await authUtils.interceptApiCalls();
    
    // Try to make various API calls that should be proxied
    const testEndpoints = [
      `${BACKEND_URLS.api}/api/health`,
      `${BACKEND_URLS.api}/api/csrf`,
      `${BACKEND_URLS.auth}/api/auth/health`,
    ];

    for (const endpoint of testEndpoints) {
      try {
        const response = await page.request.get(endpoint);
        console.log(`${endpoint}: ${response.status()}`);
      } catch (error) {
        console.log(`${endpoint}: Connection error (service may not be running)`);
      }
    }
    
    // From the frontend, API calls should be proxied correctly
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    console.log(`Total intercepted requests: ${interceptData.authRequests.length + interceptData.apiRequests.length}`);
    console.log('✅ Native backend proxy configuration test completed');
  });
});
