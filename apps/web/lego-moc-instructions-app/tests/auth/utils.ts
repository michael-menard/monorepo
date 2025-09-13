import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { DEFAULT_TEST_USER, DEFAULT_ADMIN_USER, DEFAULT_FUN_USER, SOUTH_PARK_USERS } from './test-users';

// Test data for consistent testing
export const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  confirmPassword: 'TestPassword123!',
};

export const TEST_USER_2 = {
  email: 'test2@example.com',
  password: 'TestPassword456!',
  firstName: 'Test2',
  lastName: 'User2',
  confirmPassword: 'TestPassword456!',
};

// Additional test users from seed data
export const ADMIN_USER = {
  email: DEFAULT_ADMIN_USER.email,
  password: DEFAULT_ADMIN_USER.password,
  firstName: DEFAULT_ADMIN_USER.name.split(' ')[0],
  lastName: DEFAULT_ADMIN_USER.name.split(' ')[1] || 'User',
  confirmPassword: DEFAULT_ADMIN_USER.password,
};

export const STAN_USER = {
  email: SOUTH_PARK_USERS.STAN.email,
  password: SOUTH_PARK_USERS.STAN.password,
  firstName: SOUTH_PARK_USERS.STAN.name.split(' ')[0],
  lastName: SOUTH_PARK_USERS.STAN.name.split(' ')[1] || 'User',
  confirmPassword: SOUTH_PARK_USERS.STAN.password,
};

export const KYLE_USER = {
  email: SOUTH_PARK_USERS.KYLE.email,
  password: SOUTH_PARK_USERS.KYLE.password,
  firstName: SOUTH_PARK_USERS.KYLE.name.split(' ')[0],
  lastName: SOUTH_PARK_USERS.KYLE.name.split(' ')[1] || 'User',
  confirmPassword: SOUTH_PARK_USERS.KYLE.password,
};

// Native backend URLs for testing
export const BACKEND_URLS = {
  auth: 'http://localhost:5000',
  api: 'http://localhost:3001',
  frontend: 'http://localhost:5173',
};

// Validation error messages
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  invalidEmail: 'Please enter a valid email address',
  passwordTooShort: 'Password must be at least 8 characters long',
  passwordMismatch: 'Passwords do not match',
  invalidCredentials: 'Invalid email or password',
  emailAlreadyExists: 'An account with this email already exists',
};

export class AuthTestUtils {
  constructor(private page: Page) {}

  /**
   * Navigate to a specific auth page and verify it loaded
   */
  async navigateToAuthPage(route: 'login' | 'signup' | 'forgot-password' | 'reset-password', expectedText?: string) {
    await this.page.goto(`/${route}`);
    
    if (expectedText) {
      await expect(this.page.getByText(expectedText)).toBeVisible();
    }
    
    // Wait for page to be fully loaded
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill and submit login form
   */
  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"], input[type="email"], input[name="email"]', email);
    await this.page.fill('[data-testid="password-input"], input[type="password"], input[name="password"]', password);
    await this.page.click('[data-testid="login-button"], button[type="submit"], button:has-text("Sign In")');
  }

  /**
   * Fill and submit signup form
   */
  async signup(userData: typeof TEST_USER) {
    await this.page.fill('[data-testid="first-name-input"], input[name="firstName"]', userData.firstName);
    await this.page.fill('[data-testid="last-name-input"], input[name="lastName"]', userData.lastName);
    await this.page.fill('[data-testid="email-input"], input[type="email"], input[name="email"]', userData.email);
    await this.page.fill('[data-testid="password-input"], input[name="password"]', userData.password);
    await this.page.fill('[data-testid="confirm-password-input"], input[name="confirmPassword"]', userData.confirmPassword);
    await this.page.click('[data-testid="signup-button"], button[type="submit"], button:has-text("Sign Up")');
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    await this.page.fill('[data-testid="email-input"], input[type="email"], input[name="email"]', email);
    await this.page.click('[data-testid="reset-button"], button[type="submit"], button:has-text("Send Reset")');
  }

  /**
   * Mock auth API responses
   */
  async mockAuthAPI(endpoint: string, response: any, status = 200) {
    await this.page.route(`${BACKEND_URLS.auth}/api/auth/**`, async route => {
      const url = route.request().url();
      
      if (url.includes(endpoint)) {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Mock LEGO Projects API responses
   */
  async mockProjectsAPI(endpoint: string, response: any, status = 200) {
    await this.page.route(`${BACKEND_URLS.api}/api/**`, async route => {
      const url = route.request().url();
      
      if (url.includes(endpoint)) {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Wait for authentication to complete and verify redirect
   */
  async waitForAuthSuccess(expectedPath = '/') {
    // Wait for redirect after successful auth
    await this.page.waitForURL(`**${expectedPath}`, { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify validation errors are displayed
   */
  async expectValidationErrors(errors: string[]) {
    for (const error of errors) {
      await expect(this.page.getByText(error)).toBeVisible();
    }
  }

  /**
   * Verify form fields are present and visible
   */
  async expectFormFields(fields: string[]) {
    for (const field of fields) {
      const input = this.page.locator(`[data-testid="${field}-input"], input[name="${field}"]`).first();
      await expect(input).toBeVisible();
    }
  }

  /**
   * Test keyboard navigation through form
   */
  async testKeyboardNavigation() {
    // Test Tab navigation
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    
    // Test Enter submission on focused button
    await this.page.keyboard.press('Enter');
  }

  /**
   * Test responsive design at different viewport sizes
   */
  async testResponsiveDesign() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500);
    
    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(500);
    
    // Reset to desktop
    await this.page.setViewportSize({ width: 1280, height: 720 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear all auth-related cookies and local storage
   */
  async clearAuthData() {
    try {
      await this.page.context().clearCookies();
    } catch (error) {
      console.log('Could not clear cookies:', error);
    }

    try {
      await this.page.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (error) {
          // Handle SecurityError for localStorage access
          console.log('Could not clear localStorage/sessionStorage:', error);
        }
      });
    } catch (error) {
      console.log('Could not evaluate localStorage clear:', error);
    }
  }

  /**
   * Check if user is authenticated (has auth cookie or token)
   */
  async isAuthenticated(): Promise<boolean> {
    const cookies = await this.page.context().cookies();
    const authCookie = cookies.find(cookie => 
      cookie.name.includes('auth') || 
      cookie.name.includes('token') || 
      cookie.name.includes('session')
    );
    
    if (authCookie) return true;
    
    // Check localStorage for auth tokens
    const authToken = await this.page.evaluate(() => {
      return localStorage.getItem('authToken') || 
             localStorage.getItem('accessToken') || 
             sessionStorage.getItem('authToken');
    });
    
    return !!authToken;
  }

  /**
   * Wait for network requests to complete
   */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Intercept and verify API calls to native backends
   */
  async interceptApiCalls() {
    const authRequests: any[] = [];
    const apiRequests: any[] = [];

    // Intercept auth service calls
    await this.page.route(`${BACKEND_URLS.auth}/**`, async route => {
      authRequests.push({
        url: route.request().url(),
        method: route.request().method(),
        headers: route.request().headers(),
      });
      await route.continue();
    });

    // Intercept LEGO projects API calls
    await this.page.route(`${BACKEND_URLS.api}/**`, async route => {
      apiRequests.push({
        url: route.request().url(),
        method: route.request().method(),
        headers: route.request().headers(),
      });
      await route.continue();
    });

    return { authRequests, apiRequests };
  }

  /**
   * Verify health endpoints are accessible
   */
  async verifyBackendHealth() {
    // Check auth service health
    const authResponse = await this.page.request.get(`${BACKEND_URLS.auth}/api/auth/health`);
    expect(authResponse.status()).toBeLessThan(500);

    // Check LEGO projects API health
    const apiResponse = await this.page.request.get(`${BACKEND_URLS.api}/api/health`);
    expect(apiResponse.status()).toBeLessThan(500);
  }

  /**
   * Setup common test environment
   */
  async setup() {
    await this.clearAuthData();
    await this.page.goto('/');
    await this.waitForNetworkIdle();
  }

  /**
   * Cleanup after tests
   */
  async cleanup() {
    await this.clearAuthData();
    await this.page.unrouteAll();
  }
}

/**
 * Factory function to create AuthTestUtils instance
 */
export function createAuthTestUtils(page: Page): AuthTestUtils {
  return new AuthTestUtils(page);
}

/**
 * Common test patterns and helpers
 */
export const TestPatterns = {
  /**
   * Standard auth flow test setup
   */
  async setupAuthTest(page: Page) {
    const utils = createAuthTestUtils(page);
    await utils.setup();
    return utils;
  },

  /**
   * Test for native backend connectivity
   */
  async testNativeBackendConnectivity(page: Page) {
    const utils = createAuthTestUtils(page);
    await utils.verifyBackendHealth();
  },

  /**
   * Standard teardown for auth tests
   */
  async teardownAuthTest(utils: AuthTestUtils) {
    await utils.cleanup();
  },
};
