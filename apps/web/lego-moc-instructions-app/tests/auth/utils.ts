import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test data constants
export const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  name: 'Test User',
  confirmPassword: 'TestPassword123!',
};

export const INVALID_USER = {
  email: 'invalid@example.com',
  password: 'wrongpassword',
  firstName: 'Invalid',
  lastName: 'User',
  name: 'Invalid User',
  confirmPassword: 'differentpassword',
};

// Common auth page URLs
export const AUTH_URLS = {
  login: '/auth/login',
  signup: '/auth/signup',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  verifyEmail: '/auth/verify-email',
} as const;

// Helper functions for common auth actions
export class AuthTestUtils {
  constructor(private page: Page) {}

  /**
   * Fill and submit the login form
   */
  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  /**
   * Fill and submit the signup form
   */
  async signup(userData: typeof TEST_USER) {
    await this.page.fill('input[name="name"]', userData.name);
    await this.page.fill('input[type="email"]', userData.email);
    await this.page.fill('input[name="password"]', userData.password);
    await this.page.fill('input[name="confirmPassword"]', userData.confirmPassword);
    await this.page.click('button[type="submit"]');
  }

  /**
   * Fill and submit the forgot password form
   */
  async requestPasswordReset(email: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.click('button[type="submit"]');
  }

  /**
   * Fill and submit the reset password form
   */
  async resetPassword(password: string, confirmPassword: string) {
    await this.page.fill('input[name="password"]', password);
    await this.page.fill('input[name="confirmPassword"]', confirmPassword);
    await this.page.click('button[type="submit"]');
  }

  /**
   * Fill and submit the email verification form
   */
  async verifyEmail(code: string) {
    await this.page.fill('input[name="verificationCode"]', code);
    await this.page.click('button[type="submit"]');
  }

  /**
   * Wait for loading state to complete
   */
  async waitForLoadingComplete() {
    await this.page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 10000 });
  }

  /**
   * Wait for success message to appear
   */
  async waitForSuccessMessage(expectedText?: string) {
    if (expectedText) {
      await expect(this.page.locator(`text=${expectedText}`)).toBeVisible({ timeout: 10000 });
    } else {
      await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Wait for error message to appear
   */
  async waitForErrorMessage(expectedText?: string) {
    if (expectedText) {
      await expect(this.page.locator(`text=${expectedText}`)).toBeVisible({ timeout: 10000 });
    } else {
      await expect(this.page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Navigate to auth page and verify it loaded correctly
   */
  async navigateToAuthPage(page: keyof typeof AUTH_URLS, expectedTitle: string) {
    await this.page.goto(AUTH_URLS[page]);
    // Look for the specific title in the page content
    await expect(this.page.locator('h1, h2, h3')).toContainText(expectedTitle);
  }

  /**
   * Verify form validation errors are displayed
   */
  async expectValidationErrors(expectedErrors: Array<string>) {
    for (const error of expectedErrors) {
      await expect(this.page.locator(`text=${error}`)).toBeVisible();
    }
  }

  /**
   * Verify form fields are present and visible
   */
  async expectFormFields(fields: Array<string>) {
    for (const field of fields) {
      await expect(this.page.locator(field)).toBeVisible();
    }
  }

  /**
   * Test responsive design at different viewport sizes
   */
  async testResponsiveDesign(viewport: { width: number; height: number }) {
    await this.page.setViewportSize(viewport);
    // Use a more specific selector to avoid strict mode violations
    await expect(this.page.locator('h1, h2, h3').first()).toBeVisible();
    // Don't check for submit button on home page since it might not exist
  }

  /**
   * Test keyboard navigation through form
   */
  async testKeyboardNavigation(focusableElements: Array<string>) {
    // Focus the first element first
    await this.page.locator(focusableElements[0]).focus();
    
    for (let i = 1; i < focusableElements.length; i++) {
      await this.page.keyboard.press('Tab');
      await expect(this.page.locator(focusableElements[i])).toBeFocused();
    }
  }
}

// Factory function to create auth test utils
export function createAuthTestUtils(page: Page) {
  return new AuthTestUtils(page);
}

// Common validation error messages
export const VALIDATION_MESSAGES = {
  emailRequired: 'Please enter a valid email address',
  emailInvalid: 'Please enter a valid email address',
  passwordRequired: 'Password must be at least 8 characters',
  passwordTooShort: 'Password must be at least 8 characters',
  nameRequired: 'Full name is required',
  firstNameRequired: 'Full name is required', // Keep for backward compatibility
  lastNameRequired: 'Full name is required', // Keep for backward compatibility
  confirmPasswordRequired: 'Please confirm your password',
  passwordsMismatch: 'Passwords don\'t match',
  verificationCodeRequired: 'Verification code is required',
  verificationCodeInvalid: 'Verification code must be 6 digits',
} as const;

// Common success messages
export const SUCCESS_MESSAGES = {
  loginSuccess: 'Login successful',
  signupSuccess: 'Account created successfully',
  passwordResetSent: 'Check your email',
  passwordResetSuccess: 'Password reset successful',
  emailVerified: 'Email verified successfully',
} as const;

// Common error messages
export const ERROR_MESSAGES = {
  loginFailed: 'Login failed. Please try again.',
  signupFailed: 'Signup failed. Please try again.',
  passwordResetFailed: 'Failed to send reset email. Please try again.',
  passwordResetError: 'Password reset failed. Please try again.',
  emailVerificationFailed: 'Email verification failed. Please try again.',
} as const; 