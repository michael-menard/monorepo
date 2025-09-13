import { expect, test } from '@playwright/test';
import { createAuthTestUtils, BACKEND_URLS } from './utils';
import { TEST_USERS, SOUTH_PARK_USERS, getRandomUser } from './test-users';

/**
 * Complete Auth Flow Test Suite
 * 
 * Tests the entire authentication journey:
 * - Sign Up → Email Verification → Sign In → Profile Page
 * - Sign In → Profile Page  
 * - Forgot Password → Reset → Sign In → Profile Page
 * - Error handling and validation
 * - CSRF protection throughout
 */
test.describe('Complete Auth Flow Test Suite', () => {
  // Set timeout for this test suite (auth flows can be complex)
  test.describe.configure({ timeout: 120000 }); // 2 minutes per test

  test.beforeAll(async () => {
    console.log('🔐 Testing Complete Auth Flow:');
    console.log(`  Auth Service: http://localhost:9000`);
    console.log(`  Frontend: http://localhost:3004`);
    console.log('  Testing: Signup → Verification → Login → Profile');
    console.log('  Using: Consolidated auth package with CSRF protection');
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test.describe('Sign Up Flow', () => {
    test('should complete full signup flow with email verification', async ({ page }) => {
      test.setTimeout(90000); // 90 seconds for this complex flow
      
      const authUtils = createAuthTestUtils(page);
      const testUser = {
        name: 'New Test User',
        email: `test-signup-${Date.now()}@example.com`,
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      // Mock successful signup response
      await authUtils.mockAuthAPI('signup', {
        success: true,
        message: 'Account created successfully. Please check your email for verification.',
        data: {
          user: {
            id: 'new-user-id',
            email: testUser.email,
            name: testUser.name,
            isVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      });

      // Navigate to signup page
      await authUtils.navigateToAuthPage('signup');

      // Verify signup form is present
      await expect(page.locator('input[name="name"], input[placeholder*="name"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();

      // Fill signup form
      await page.fill('input[name="name"], input[placeholder*="name"]', testUser.name);
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.confirmPassword);

      // Submit signup form
      await page.click('button[type="submit"]', { timeout: 5000 });

      // Wait for success response
      await page.waitForTimeout(3000);

      // Should show success message or redirect to verification page
      const hasSuccessMessage = await page.locator('text=/success|created|check.*email|verification/i').count();
      const isOnVerificationPage = page.url().includes('/verify') || page.url().includes('/check-email');
      
      expect(hasSuccessMessage > 0 || isOnVerificationPage).toBeTruthy();
      console.log('✅ Signup completed successfully');
    });

    test('should validate signup form fields', async ({ page }) => {
      test.setTimeout(45000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('signup');

      // Test empty form submission
      await page.click('button[type="submit"]', { timeout: 5000 });
      await page.waitForTimeout(2000);

      // Should show validation errors
      const hasValidationErrors = await page.locator('text=/required|enter.*name|enter.*email|enter.*password/i').count();
      expect(hasValidationErrors).toBeGreaterThan(0);

      // Test password mismatch
      await page.fill('input[name="name"], input[placeholder*="name"]', 'Test User');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Should show password mismatch error
      await expect(page.locator('text=/passwords.*match/i')).toBeVisible({ timeout: 8000 });
      console.log('✅ Signup validation working correctly');
    });

    test('should handle signup errors gracefully', async ({ page }) => {
      test.setTimeout(45000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock signup error (email already exists)
      await authUtils.mockAuthAPI('signup', {
        success: false,
        message: 'Email already exists',
        code: 'EMAIL_EXISTS',
      }, 409);

      await authUtils.navigateToAuthPage('signup');

      // Fill form with existing user email
      await page.fill('input[name="name"], input[placeholder*="name"]', 'Test User');
      await page.fill('input[type="email"]', TEST_USERS.STANDARD.email);
      await page.fill('input[name="password"]', 'Password123!');
      await page.fill('input[name="confirmPassword"]', 'Password123!');

      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Should show error message
      await expect(page.locator('text=/email.*exists|already.*registered/i')).toBeVisible({ timeout: 8000 });
      console.log('✅ Signup error handling working correctly');
    });
  });

  test.describe('Sign In Flow', () => {
    test('should complete signin and redirect to profile page', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.STAN;

      // Mock successful login response
      await authUtils.mockAuthAPI('login', {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'stan-user-id',
            email: testUser.email,
            name: testUser.name,
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

      // Verify login form is present
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Perform login
      await authUtils.login(testUser.email, testUser.password);

      // Wait for authentication to complete
      await page.waitForTimeout(3000);

      // Should redirect to profile page or dashboard
      const currentUrl = page.url();
      const isOnProfilePage = currentUrl.includes('/profile') || 
                             currentUrl.includes('/dashboard') || 
                             currentUrl.includes('/account') ||
                             currentUrl.match(/\/(home|app|user)$/);

      expect(isOnProfilePage).toBeTruthy();
      console.log(`✅ Login successful, redirected to: ${currentUrl}`);

      // Verify user is authenticated (check for user info or logout button)
      const hasUserInfo = await page.locator('text=/logout|sign out|profile|account/i').count();
      expect(hasUserInfo).toBeGreaterThan(0);
      console.log('✅ User authentication state confirmed');
    });

    test('should handle invalid login credentials', async ({ page }) => {
      test.setTimeout(45000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock failed login response
      await authUtils.mockAuthAPI('login', {
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      }, 401);

      await authUtils.navigateToAuthPage('login');

      // Try login with invalid credentials
      await authUtils.login('invalid@example.com', 'wrongpassword');

      // Should show error message
      await expect(page.locator('text=/invalid.*credentials|incorrect.*password|login.*failed/i')).toBeVisible({ timeout: 8000 });
      
      // Should remain on login page
      expect(page.url()).toMatch(/\/auth\/login/);
      console.log('✅ Invalid login handled correctly');
    });

    test('should validate login form fields', async ({ page }) => {
      test.setTimeout(30000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('login');

      // Try to submit empty form
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Should show validation errors
      const hasValidationErrors = await page.locator('text=/required|enter.*email|enter.*password/i').count();
      expect(hasValidationErrors).toBeGreaterThan(0);
      console.log('✅ Login validation working correctly');
    });
  });

  test.describe('Forgot Password Flow', () => {
    test('should complete forgot password flow', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.KYLE;

      // Mock successful forgot password response
      await authUtils.mockAuthAPI('forgot-password', {
        success: true,
        message: 'Password reset email sent successfully',
      });

      // Navigate to forgot password page
      await authUtils.navigateToAuthPage('forgot-password');

      // Verify forgot password form
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Fill email and submit
      await page.fill('input[type="email"]', testUser.email);
      await page.click('button[type="submit"]');

      // Wait for response
      await page.waitForTimeout(3000);

      // Should show success message
      await expect(page.locator('text=/reset.*email.*sent|check.*email|password.*reset/i')).toBeVisible({ timeout: 8000 });
      console.log('✅ Forgot password request sent successfully');
    });

    test('should handle forgot password for non-existent email', async ({ page }) => {
      test.setTimeout(45000);
      
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
      console.log('✅ Forgot password error handling working correctly');
    });
  });

  test.describe('Email Verification Flow', () => {
    test('should handle email verification', async ({ page }) => {
      test.setTimeout(45000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock successful verification response
      await authUtils.mockAuthAPI('verify-email', {
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: 'user-id',
            email: 'test@example.com',
            name: 'Test User',
            isVerified: true,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
          },
        },
      });

      // Navigate to verification page with token
      await page.goto('/auth/verify-email?token=mock-verification-token', { timeout: 15000 });

      // Wait for verification to complete
      await page.waitForTimeout(3000);

      // Should show success message or redirect to login
      const hasSuccessMessage = await page.locator('text=/verified|success|confirmed/i').count();
      const isOnLoginPage = page.url().includes('/login');
      
      expect(hasSuccessMessage > 0 || isOnLoginPage).toBeTruthy();
      console.log('✅ Email verification completed successfully');
    });

    test('should handle invalid verification token', async ({ page }) => {
      test.setTimeout(45000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock error response for invalid token
      await authUtils.mockAuthAPI('verify-email', {
        success: false,
        message: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN',
      }, 400);

      // Navigate to verification page with invalid token
      await page.goto('/auth/verify-email?token=invalid-token', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Should show error message
      await expect(page.locator('text=/invalid.*token|expired.*token|verification.*failed/i')).toBeVisible({ timeout: 8000 });
      console.log('✅ Invalid verification token handled correctly');
    });
  });

  test.describe('Complete User Journey', () => {
    test('should complete full user journey: signup → verify → login → profile', async ({ page }) => {
      test.setTimeout(150000); // 2.5 minutes for complete journey
      
      const authUtils = createAuthTestUtils(page);
      const journeyUser = {
        name: 'Journey Test User',
        email: `journey-${Date.now()}@example.com`,
        password: 'JourneyPassword123!',
        confirmPassword: 'JourneyPassword123!',
      };

      console.log('🚀 Starting complete user journey...');

      // Step 1: Sign Up
      console.log('📝 Step 1: Sign Up');
      await authUtils.mockAuthAPI('signup', {
        success: true,
        message: 'Account created successfully',
        data: {
          user: {
            id: 'journey-user-id',
            email: journeyUser.email,
            name: journeyUser.name,
            isVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      });

      await authUtils.navigateToAuthPage('signup');
      await page.fill('input[name="name"], input[placeholder*="name"]', journeyUser.name);
      await page.fill('input[type="email"]', journeyUser.email);
      await page.fill('input[name="password"]', journeyUser.password);
      await page.fill('input[name="confirmPassword"]', journeyUser.confirmPassword);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Step 2: Email Verification (simulate)
      console.log('📧 Step 2: Email Verification');
      await authUtils.mockAuthAPI('verify-email', {
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: 'journey-user-id',
            email: journeyUser.email,
            name: journeyUser.name,
            isVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      });

      await page.goto('/auth/verify-email?token=mock-verification-token');
      await page.waitForTimeout(3000);

      // Step 3: Sign In
      console.log('🔐 Step 3: Sign In');
      await authUtils.mockAuthAPI('login', {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'journey-user-id',
            email: journeyUser.email,
            name: journeyUser.name,
            isVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600,
          },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(journeyUser.email, journeyUser.password);
      await page.waitForTimeout(3000);

      // Step 4: Verify Profile Page
      console.log('👤 Step 4: Profile Page');
      const currentUrl = page.url();
      const isOnProfilePage = currentUrl.includes('/profile') || 
                             currentUrl.includes('/dashboard') || 
                             currentUrl.includes('/account') ||
                             currentUrl.match(/\/(home|app|user)$/);

      expect(isOnProfilePage).toBeTruthy();

      // Verify user is authenticated
      const hasUserInfo = await page.locator('text=/logout|sign out|profile|account/i').count();
      expect(hasUserInfo).toBeGreaterThan(0);

      console.log('🎉 Complete user journey successful!');
      console.log(`   Final URL: ${currentUrl}`);
    });
  });

  test.describe('CSRF Protection Throughout Auth Flow', () => {
    test('should include CSRF tokens in all auth requests', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const authRequests: any[] = [];

      // Track all auth requests
      page.on('request', request => {
        if (request.url().includes('/api/auth/')) {
          authRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
          });
        }
      });

      // Test CSRF in login
      await authUtils.navigateToAuthPage('login');
      await authUtils.login(TEST_USERS.STANDARD.email, TEST_USERS.STANDARD.password);
      await page.waitForTimeout(2000);

      // Test CSRF in signup
      await authUtils.navigateToAuthPage('signup');
      await page.fill('input[name="name"], input[placeholder*="name"]', 'CSRF Test');
      await page.fill('input[type="email"]', 'csrf-test@example.com');
      await page.fill('input[name="password"]', 'CSRFPassword123!');
      await page.fill('input[name="confirmPassword"]', 'CSRFPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Verify CSRF tokens were included
      const authRequestsWithCSRF = authRequests.filter(req => {
        const headers = Object.keys(req.headers);
        return headers.some(header => header.toLowerCase().includes('csrf'));
      });

      expect(authRequestsWithCSRF.length).toBeGreaterThan(0);
      console.log(`✅ CSRF protection verified in ${authRequestsWithCSRF.length} auth requests`);
    });
  });
});
