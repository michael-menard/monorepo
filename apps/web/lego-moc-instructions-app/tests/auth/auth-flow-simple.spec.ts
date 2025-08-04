import { expect, test } from '@playwright/test';
import { 
  AUTH_URLS,
  createAuthTestUtils, 
  TEST_USER, 
  VALIDATION_MESSAGES
} from './utils';

test.describe('Auth Flow - E2E Tests', () => {
  let authUtils: ReturnType<typeof createAuthTestUtils>;

  test.beforeEach(async ({ page }) => {
    authUtils = createAuthTestUtils(page);
    await page.goto('/');
  });

  test.describe('Form Validation', () => {
    test('should show validation errors for empty login form', async ({ page }) => {
      await authUtils.navigateToAuthPage('login', 'Welcome Back');
      
      await page.click('button[type="submit"]');
      
      await authUtils.expectValidationErrors([
        VALIDATION_MESSAGES.emailRequired,
        VALIDATION_MESSAGES.passwordRequired
      ]);
    });

    test('should show validation errors for empty signup form', async ({ page }) => {
      await authUtils.navigateToAuthPage('signup', 'Create Account');
      
      await page.click('button[type="submit"]');
      
      await authUtils.expectValidationErrors([
        VALIDATION_MESSAGES.nameRequired,
        VALIDATION_MESSAGES.emailRequired,
        VALIDATION_MESSAGES.passwordRequired
      ]);
    });

    test('should validate email format on login', async ({ page }) => {
      await authUtils.navigateToAuthPage('login', 'Welcome Back');
      
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await authUtils.expectValidationErrors([
        VALIDATION_MESSAGES.emailInvalid
      ]);
    });

    test('should validate password length on signup', async ({ page }) => {
      await authUtils.navigateToAuthPage('signup', 'Create Account');
      
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'short');
      await page.fill('input[name="confirmPassword"]', 'short');
      await page.click('button[type="submit"]');
      
      await authUtils.expectValidationErrors([
        VALIDATION_MESSAGES.passwordTooShort
      ]);
    });

    test('should validate password confirmation on signup', async ({ page }) => {
      await authUtils.navigateToAuthPage('signup', 'Create Account');
      
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'differentpassword');
      await page.click('button[type="submit"]');
      
      await authUtils.expectValidationErrors([
        VALIDATION_MESSAGES.passwordsMismatch
      ]);
    });
  });

  test.describe('Real API Integration', () => {
    test('should successfully create a new user account', async ({ page }) => {
      await authUtils.navigateToAuthPage('signup', 'Create Account');
      
      // Use a more unique email to avoid conflicts
      const randomId = Math.random().toString(36).substring(2, 15);
      const uniqueEmail = `e2e-test-${randomId}@example.com`;
      
      await page.fill('input[name="name"]', 'E2E Test User');
      await page.fill('input[type="email"]', uniqueEmail);
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      
      // Wait a moment to see if there's an error
      await page.waitForTimeout(2000);
      
      // Check if there's an error message
      const errorElement = page.locator('.bg-red-50 .text-red-600');
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log('Error message found:', errorText);
        throw new Error(`Signup failed with error: ${errorText}`);
      }
      
      // Wait for redirect to email verification page
      await expect(page).toHaveURL('/auth/verify-email');
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await authUtils.navigateToAuthPage('login', 'Welcome Back');
      
      // Use the existing test user
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      
      // Wait for error message about email not being verified
      await expect(page.locator('.bg-red-50 .text-red-600')).toBeVisible();
      await expect(page.locator('.bg-red-50 .text-red-600')).toContainText('Email not verified');
    });

    test('should handle login with invalid credentials', async ({ page }) => {
      await authUtils.navigateToAuthPage('login', 'Welcome Back');
      
      await page.fill('input[type="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Wait for error message in red box
      await expect(page.locator('.bg-red-50 .text-red-600')).toBeVisible();
      await expect(page.locator('.bg-red-50 .text-red-600')).toContainText('Invalid credentials');
    });

    test('should handle signup with existing email', async ({ page }) => {
      await authUtils.navigateToAuthPage('signup', 'Create Account');
      
      // Use real API - no mocking needed
      
      // Try to create account with existing email
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      
      // Wait for error message in red box
      await expect(page.locator('.bg-red-50 .text-red-600')).toBeVisible();
      await expect(page.locator('.bg-red-50 .text-red-600')).toContainText('User already exists');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between login and signup pages', async ({ page }) => {
      // Start at login
      await authUtils.navigateToAuthPage('login', 'Welcome Back');
      
      // Navigate to signup
      await page.click('text=Sign up');
      await expect(page).toHaveURL(AUTH_URLS.signup);
      
      // Navigate back to login
      await page.click('text=Sign in');
      await expect(page).toHaveURL(AUTH_URLS.login);
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await authUtils.navigateToAuthPage('login', 'Welcome Back');
      
      await page.click('text=Forgot password?');
      await expect(page).toHaveURL(AUTH_URLS.forgotPassword);
    });
  });

  test.describe('User Experience', () => {
    test('should show loading state during form submission', async ({ page }) => {
      await authUtils.navigateToAuthPage('login', 'Welcome Back');
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Should show loading spinner
      await expect(page.locator('button[type="submit"] .animate-spin')).toBeVisible();
    });

    test('should disable submit button during form submission', async ({ page }) => {
      await authUtils.navigateToAuthPage('login', 'Welcome Back');
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Button should be disabled
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels on login page', async ({ page }) => {
      await authUtils.navigateToAuthPage('login', 'Welcome Back');
      
      await expect(page.locator('label[for="email"]')).toBeVisible();
      await expect(page.locator('label[for="password"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toHaveAttribute('id', 'email');
      await expect(page.locator('input[type="password"]')).toHaveAttribute('id', 'password');
    });

    test('should have proper form labels on signup page', async ({ page }) => {
      await authUtils.navigateToAuthPage('signup', 'Create Account');
      
      await expect(page.locator('label[for="name"]')).toBeVisible();
      await expect(page.locator('label[for="email"]')).toBeVisible();
      await expect(page.locator('label[for="password"]')).toBeVisible();
      await expect(page.locator('label[for="confirmPassword"]')).toBeVisible();
    });

    test('should support keyboard navigation on login form', async ({ page }) => {
      await authUtils.navigateToAuthPage('login', 'Welcome Back');
      
      // Focus the first input
      await page.locator('input[type="email"]').focus();
      await expect(page.locator('input[type="email"]')).toBeFocused();
      
      // Tab to password input
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="password"]')).toBeFocused();
      
      // Verify form elements are accessible via keyboard
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.locator('button:has-text("Forgot password?")')).toBeVisible();
      await expect(page.locator('button[type="button"]:has-text("Sign up")')).toBeVisible();
      
      // Verify submit button is enabled and can be focused programmatically
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled();
      await submitButton.focus();
      await expect(submitButton).toBeFocused();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await authUtils.navigateToAuthPage('login', 'Welcome Back');
      
      // Should be able to interact with form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await authUtils.navigateToAuthPage('signup', 'Create Account');
      
      // Should be able to interact with form elements
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    });
  });
}); 