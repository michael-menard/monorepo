import { expect, test } from '@playwright/test';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  confirmPassword: 'TestPassword123!',
};

const invalidUser = {
  email: 'invalid@example.com',
  password: 'wrongpassword',
  firstName: 'Invalid',
  lastName: 'User',
  confirmPassword: 'differentpassword',
};

test.describe('Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto('/');
  });

  test.describe('Navigation', () => {
    test('should navigate to login page from navbar', async ({ page }) => {
      await page.click('text=Sign In');
      await expect(page).toHaveURL('/auth/login');
      await expect(page.locator('h1')).toContainText('Welcome back');
    });

    test('should navigate to signup page from navbar', async ({ page }) => {
      await page.click('text=Sign Up');
      await expect(page).toHaveURL('/auth/signup');
      await expect(page.locator('h1, h2, h3')).toContainText('Create Account');
    });

    test('should navigate between auth pages', async ({ page }) => {
      // Start at login
      await page.goto('/auth/login');
      
      // Navigate to signup
      await page.click('text=Don\'t have an account?');
      await expect(page).toHaveURL('/auth/signup');
      
      // Navigate back to login
      await page.click('text=Already have an account?');
      await expect(page).toHaveURL('/auth/login');
      
      // Navigate to forgot password
      await page.click('text=Forgot your password?');
      await expect(page).toHaveURL('/auth/forgot-password');
      
      // Navigate back to login
      await page.click('text=Back to login');
      await expect(page).toHaveURL('/auth/login');
    });
  });

  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login');
    });

    test('should display login form with all required fields', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Welcome back');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      await page.click('button[type="submit"]');
      
      // Wait for validation errors to appear
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', testUser.password);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Invalid email address')).toBeVisible();
    });

    test('should show validation error for short password', async ({ page }) => {
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', 'short');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    });

    test('should handle successful login simulation', async ({ page }) => {
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      
      // Mock the login API call
      await page.route('**/api/auth/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, user: testUser }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for loading state
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      
      // Wait for navigation to home page
      await expect(page).toHaveURL('/');
    });

    test('should handle login error', async ({ page }) => {
      await page.fill('input[type="email"]', invalidUser.email);
      await page.fill('input[type="password"]', invalidUser.password);
      
      // Mock the login API call to return an error
      await page.route('**/api/auth/login', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid credentials' }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for error message
      await expect(page.locator('text=Login failed. Please try again.')).toBeVisible();
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await page.click('text=Forgot your password?');
      await expect(page).toHaveURL('/auth/forgot-password');
    });

    test('should navigate to signup page', async ({ page }) => {
      await page.click('text=Don\'t have an account?');
      await expect(page).toHaveURL('/auth/signup');
    });
  });

  test.describe('Signup Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/signup');
    });

    test('should display signup form with all required fields', async ({ page }) => {
      await expect(page.locator('h1, h2, h3')).toContainText('Create Account');
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Create Account');
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Full name is required')).toBeVisible();
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    });

    test('should show validation error for password mismatch', async ({ page }) => {
      await page.fill('input[name="name"]', testUser.firstName + ' ' + testUser.lastName);
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', 'differentpassword');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Passwords don\'t match')).toBeVisible();
    });

    test('should show password strength indicator', async ({ page }) => {
      await page.fill('input[name="password"]', 'weak');
      
      // Check for password strength indicator
      await expect(page.locator('[data-testid="password-strength"]')).toBeVisible();
    });

    test('should handle successful signup simulation', async ({ page }) => {
      await page.fill('input[name="name"]', testUser.firstName + ' ' + testUser.lastName);
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.confirmPassword);
      
      // Mock the signup API call
      await page.route('**/api/auth/sign-up', async route => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, user: testUser }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for loading state
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      
      // Wait for navigation to home page
      await expect(page).toHaveURL('/');
    });

    test('should handle signup error', async ({ page }) => {
      await page.fill('input[name="name"]', testUser.firstName + ' ' + testUser.lastName);
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.confirmPassword);
      
      // Mock the signup API call to return an error
      await page.route('**/api/auth/sign-up', async route => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Email already exists' }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for error message
      await expect(page.locator('text=Signup failed. Please try again.')).toBeVisible();
    });

    test('should navigate to login page', async ({ page }) => {
      await page.click('text=Already have an account?');
      await expect(page).toHaveURL('/auth/login');
    });
  });

  test.describe('Forgot Password Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/forgot-password');
    });

    test('should display forgot password form', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Forgot your password?');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Send Reset Link');
    });

    test('should show validation error for empty email', async ({ page }) => {
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Email is required')).toBeVisible();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.fill('input[type="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Invalid email address')).toBeVisible();
    });

    test('should handle successful password reset request', async ({ page }) => {
      await page.fill('input[type="email"]', testUser.email);
      
      // Mock the forgot password API call
      await page.route('**/api/auth/forgot-password', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Reset email sent' }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for success message
      await expect(page.locator('text=Check your email')).toBeVisible();
      await expect(page.locator('text=We\'ve sent you a password reset link')).toBeVisible();
    });

    test('should handle forgot password error', async ({ page }) => {
      await page.fill('input[type="email"]', testUser.email);
      
      // Mock the forgot password API call to return an error
      await page.route('**/api/auth/forgot-password', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'User not found' }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for error message
      await expect(page.locator('text=Failed to send reset email. Please try again.')).toBeVisible();
    });

    test('should navigate back to login page', async ({ page }) => {
      await page.click('text=Back to login');
      await expect(page).toHaveURL('/auth/login');
    });
  });

  test.describe('Reset Password Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/reset-password');
    });

    test('should display reset password form', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Reset your password');
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Reset Password');
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Password is required')).toBeVisible();
      await expect(page.locator('text=Please confirm your password')).toBeVisible();
    });

    test('should show validation error for password mismatch', async ({ page }) => {
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', 'differentpassword');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Passwords do not match')).toBeVisible();
    });

    test('should handle successful password reset', async ({ page }) => {
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.confirmPassword);
      
      // Mock the reset password API call
      await page.route('**/api/auth/reset-password', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Password reset successful' }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for success message
      await expect(page.locator('text=Password reset successful')).toBeVisible();
      await expect(page.locator('text=Your password has been reset successfully')).toBeVisible();
    });

    test('should handle reset password error', async ({ page }) => {
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.confirmPassword);
      
      // Mock the reset password API call to return an error
      await page.route('**/api/auth/reset-password', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid reset token' }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for error message
      await expect(page.locator('text=Password reset failed. Please try again.')).toBeVisible();
    });

    test('should navigate to login page after successful reset', async ({ page }) => {
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.confirmPassword);
      
      // Mock successful reset
      await page.route('**/api/auth/reset-password', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for success state and click login link
      await expect(page.locator('text=Password reset successful')).toBeVisible();
      await page.click('text=Sign in');
      await expect(page).toHaveURL('/auth/login');
    });
  });

  test.describe('Email Verification Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/verify-email');
    });

    test('should display email verification form', async ({ page }) => {
      // Check for the AppCard title instead of h1
      await expect(page.locator('[data-testid="app-card-title"]')).toContainText('Verify Your Email');
      // Check for the input field with correct id
      await expect(page.locator('input[id="code"]')).toBeVisible();
      // Check for the submit button
      await expect(page.locator('button[type="submit"]')).toContainText('Verify Email');
    });

    test('should show validation error for empty verification code', async ({ page }) => {
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Verification code must be 6 characters')).toBeVisible();
    });

    test('should show validation error for invalid verification code format', async ({ page }) => {
      await page.fill('input[id="code"]', '123');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Verification code must be 6 characters')).toBeVisible();
    });

    test('should handle successful email verification', async ({ page }) => {
      await page.fill('input[id="code"]', '123456');
      
      // Mock the email verification API call
      await page.route('**/api/auth/verify-email', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Email verified successfully' }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for success message - check for the verified state
      await expect(page.locator('text=Email Verified')).toBeVisible();
      await expect(page.locator('text=Your email has been successfully verified')).toBeVisible();
    });

    test('should handle email verification error', async ({ page }) => {
      await page.fill('input[id="code"]', '123456');
      
      // Mock the email verification API call to return an error
      await page.route('**/api/auth/verify-email', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid verification code' }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for error message
      await expect(page.locator('text=Invalid verification code')).toBeVisible();
    });

    test('should navigate to home page after successful verification', async ({ page }) => {
      await page.fill('input[id="code"]', '123456');
      
      // Mock successful verification
      await page.route('**/api/auth/verify-email', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });
      
      await page.click('button[type="submit"]');
      
      // Wait for success state and click home link
      await expect(page.locator('text=Email Verified')).toBeVisible();
      await page.click('text=Go to Home');
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Responsive Design', () => {
    test('should display auth forms correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test login page on mobile
      await page.goto('/auth/login');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Test signup page on mobile
      await page.goto('/auth/signup');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('input[name="firstName"]')).toBeVisible();
      await expect(page.locator('input[name="lastName"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    });

    test('should display auth forms correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Test login page on tablet
      await page.goto('/auth/login');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels and ARIA attributes', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Check for proper labels
      await expect(page.locator('label[for="email"]')).toBeVisible();
      await expect(page.locator('label[for="password"]')).toBeVisible();
      
      // Check for proper input attributes
      await expect(page.locator('input[type="email"]')).toHaveAttribute('id', 'email');
      await expect(page.locator('input[type="password"]')).toHaveAttribute('id', 'password');
      
      // Check for proper button attributes
      await expect(page.locator('button[type="submit"]')).toHaveAttribute('type', 'submit');
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="email"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="password"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();
    });
  });
}); 