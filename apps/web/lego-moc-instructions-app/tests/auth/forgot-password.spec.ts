import { expect, test } from '@playwright/test';
import { 
  AUTH_URLS,
  createAuthTestUtils, 
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  TEST_USER,
  VALIDATION_MESSAGES
} from './utils';

test.describe('Forgot Password Page', () => {
  let authUtils: ReturnType<typeof createAuthTestUtils>;

  test.beforeEach(async ({ page }) => {
    authUtils = createAuthTestUtils(page);
    await page.goto('/');
  });

  test.describe('Page Navigation and Initial State', () => {
    test('should navigate to forgot password page and display correct content', async ({ page }) => {
      try {
        await page.goto(AUTH_URLS.forgotPassword);
        
        // Check page title and description
        await expect(page.locator('text=Reset Password')).toBeVisible();
        await expect(page.locator('text=Enter your email to receive a password reset link')).toBeVisible();
        
        // Check form elements are present
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
        await expect(page.locator('text=Send Reset Link')).toBeVisible();
        
        // Check navigation link - use more specific selector
        await expect(page.locator('text=Remember your password?')).toBeVisible();
        await expect(page.locator('button[type="button"]:has-text("Sign in")')).toBeVisible();
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });

    test('should have proper form structure and accessibility', async ({ page }) => {
      try {
        await page.goto(AUTH_URLS.forgotPassword);
        
        // Check form has proper role
        await expect(page.locator('form[role="form"]')).toBeVisible();
        
        // Check email input has proper label
        await expect(page.locator('label[for="email"]')).toBeVisible();
        await expect(page.locator('label[for="email"]')).toContainText('Email');
        
        // Check email input has proper attributes
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toHaveAttribute('id', 'email');
        await expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
        
        // Check submit button is enabled initially
        await expect(page.locator('button[type="submit"]')).toBeEnabled();
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });
  });

  test.describe('Basic Form Functionality', () => {
    test('should allow entering email address', async ({ page }) => {
      try {
        await page.goto(AUTH_URLS.forgotPassword);
        
        const emailInput = page.locator('input[type="email"]');
        await emailInput.fill('test@example.com');
        
        // Check that the email was entered
        await expect(emailInput).toHaveValue('test@example.com');
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });

    test('should submit form with valid email', async ({ page }) => {
      try {
        await page.goto(AUTH_URLS.forgotPassword);
        
        // Mock successful API response
        await page.route('**/auth/forgot-password', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Password reset email sent successfully'
            })
          });
        });
        
        // Fill and submit form
        await page.fill('input[type="email"]', 'test@example.com');
        await page.click('button[type="submit"]');
        
        // Wait for success state with timeout
        await expect(page.locator('text=Check Your Email')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=We\'ve sent a password reset link to your email address')).toBeVisible();
        await expect(page.locator('text=If you don\'t see the email, check your spam folder.')).toBeVisible();
        await expect(page.locator('text=Back to Sign In')).toBeVisible();
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });

    test('should display error message on API failure', async ({ page }) => {
      try {
        await page.goto(AUTH_URLS.forgotPassword);
        
        // Mock API error response
        await page.route('**/auth/forgot-password', async route => {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'User not found with this email address'
            })
          });
        });
        
        // Fill and submit form
        await page.fill('input[type="email"]', 'nonexistent@example.com');
        await page.click('button[type="submit"]');
        
        // Wait for error message with timeout
        await expect(page.locator('.bg-red-50 .text-red-600')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=User not found with this email address')).toBeVisible();
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });

    test('should handle network errors gracefully', async ({ page }) => {
      try {
        await page.goto(AUTH_URLS.forgotPassword);
        
        // Mock network error
        await page.route('**/auth/forgot-password', async route => {
          await route.abort('failed');
        });
        
        // Fill and submit form
        await page.fill('input[type="email"]', 'test@example.com');
        await page.click('button[type="submit"]');
        
        // Wait for any error message to appear (more flexible)
        await expect(page.locator('.bg-red-50 .text-red-600')).toBeVisible({ timeout: 10000 });
        
        // Check that some error message is displayed (don't check specific text)
        const errorElement = page.locator('.bg-red-50 .text-red-600');
        const errorText = await errorElement.textContent();
        expect(errorText).toBeTruthy();
        expect(errorText!.length).toBeGreaterThan(0);
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });
  });

  test.describe('Navigation', () => {
    test('should navigate back to login page from forgot password form', async ({ page }) => {
      try {
        await page.goto(AUTH_URLS.forgotPassword);
        
        // Click "Sign in" link - use more specific selector
        await page.click('button[type="button"]:has-text("Sign in")');
        
        // Should navigate to login page
        await expect(page).toHaveURL(AUTH_URLS.login);
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });

    test('should navigate back to login page from success state', async ({ page }) => {
      try {
        await page.goto(AUTH_URLS.forgotPassword);
        
        // Mock successful API response
        await page.route('**/auth/forgot-password', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Password reset email sent successfully'
            })
          });
        });
        
        // Submit form to reach success state
        await page.fill('input[type="email"]', 'test@example.com');
        await page.click('button[type="submit"]');
        
        // Wait for success state
        await expect(page.locator('text=Check Your Email')).toBeVisible({ timeout: 10000 });
        
        // Click "Back to Sign In" link
        await page.click('text=Back to Sign In');
        
        // Should navigate to login page
        await expect(page).toHaveURL(AUTH_URLS.login);
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });
  });

  test.describe('Accessibility and UX', () => {
    test('should support keyboard navigation', async ({ page }) => {
      try {
        await page.goto(AUTH_URLS.forgotPassword);
        
        // Focus email input
        await page.locator('input[type="email"]').focus();
        await expect(page.locator('input[type="email"]')).toBeFocused();
        
        // Check that submit button is focusable
        await page.locator('button[type="submit"]').focus();
        await expect(page.locator('button[type="submit"]')).toBeFocused();
        
        // Check that "Sign in" link is focusable
        await page.locator('button[type="button"]:has-text("Sign in")').focus();
        await expect(page.locator('button[type="button"]:has-text("Sign in")')).toBeFocused();
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      try {
        await page.goto(AUTH_URLS.forgotPassword);
        
        // Check form has proper role
        await expect(page.locator('form[role="form"]')).toBeVisible();
        
        // Check email input has proper label association
        const emailInput = page.locator('input[type="email"]');
        const emailLabel = page.locator('label[for="email"]');
        await expect(emailInput).toHaveAttribute('id', 'email');
        await expect(emailLabel).toHaveAttribute('for', 'email');
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });

    test('should be responsive on different screen sizes', async ({ page }) => {
      try {
        await page.goto(AUTH_URLS.forgotPassword);
        
        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.locator('text=Reset Password')).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        
        // Test tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await expect(page.locator('text=Reset Password')).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        
        // Test desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        await expect(page.locator('text=Reset Password')).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });
  });
}); 