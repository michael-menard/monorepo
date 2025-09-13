/**
 * Test Setup and Configuration for Auth Package
 * 
 * This file provides utilities and configurations for testing the auth package
 * across unit tests, integration tests, and E2E tests.
 */

import { vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../../store/authApi';
import authReducer from '../../store/authSlice';

// Mock environment variables for testing
export const TEST_ENV = {
  NODE_ENV: 'test',
  API_BASE_URL: 'http://localhost:5001',
  FRONTEND_URL: 'http://localhost:5173',
};

// Test user data
export const TEST_USERS = {
  validUser: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'TestPassword123!',
    isVerified: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  unverifiedUser: {
    id: '2',
    email: 'unverified@example.com',
    name: 'Unverified User',
    password: 'TestPassword123!',
    isVerified: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  adminUser: {
    id: '3',
    email: 'admin@example.com',
    name: 'Admin User',
    password: 'AdminPassword123!',
    role: 'admin',
    isVerified: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
};

// Mock API responses
export const MOCK_RESPONSES = {
  loginSuccess: {
    success: true,
    message: 'Login successful',
    data: {
      user: TEST_USERS.validUser,
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      },
    },
  },
  loginFailure: {
    success: false,
    message: 'Invalid credentials',
    code: 'INVALID_CREDENTIALS',
  },
  signupSuccess: {
    success: true,
    message: 'Account created successfully',
    data: {
      user: TEST_USERS.validUser,
    },
  },
  signupFailure: {
    success: false,
    message: 'Email already exists',
    code: 'EMAIL_EXISTS',
  },
  forgotPasswordSuccess: {
    success: true,
    message: 'Password reset email sent',
  },
  resetPasswordSuccess: {
    success: true,
    message: 'Password reset successful',
  },
  csrfToken: {
    token: 'test-csrf-token-123',
  },
  csrfFailure: {
    success: false,
    code: 'CSRF_FAILED',
    message: 'CSRF token validation failed',
  },
};

/**
 * Create a test store with auth reducers
 */
export function createTestStore(preloadedState?: any) {
  return configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [authApi.util.resetApiState.type],
        },
      }).concat(authApi.middleware),
    preloadedState,
  });
}

/**
 * Mock fetch for testing
 */
export function createMockFetch() {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;
  return mockFetch;
}

/**
 * Mock CSRF utilities for testing
 */
export function mockCSRFUtils() {
  return {
    getCSRFHeaders: vi.fn().mockResolvedValue({
      'X-CSRF-Token': 'test-csrf-token',
    }),
    refreshCSRFToken: vi.fn().mockResolvedValue('new-csrf-token'),
    isCSRFError: vi.fn().mockReturnValue(false),
    initializeCSRF: vi.fn().mockResolvedValue(undefined),
    clearCSRFToken: vi.fn(),
    hasCSRFToken: vi.fn().mockReturnValue(true),
    fetchCSRFToken: vi.fn().mockResolvedValue('test-csrf-token'),
    getCSRFToken: vi.fn().mockResolvedValue('test-csrf-token'),
  };
}

/**
 * Mock document.cookie for CSRF testing
 */
export function mockDocumentCookie(cookieValue = '') {
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: cookieValue,
  });
}

/**
 * Create mock auth API responses
 */
export function createMockApiResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

/**
 * Test utilities for form validation
 */
export const VALIDATION_TEST_CASES = {
  email: {
    valid: ['test@example.com', 'user.name@domain.co.uk', 'test+tag@example.org'],
    invalid: ['invalid-email', '@domain.com', 'test@', 'test.domain.com'],
  },
  password: {
    valid: ['Password123!', 'MySecureP@ss1', 'Test1234567890!'],
    invalid: ['123', 'password', 'PASSWORD', '12345678'],
  },
  name: {
    valid: ['John Doe', 'Jane Smith-Wilson', 'José García'],
    invalid: ['', '   ', 'A', '123'],
  },
};

/**
 * Wait for async operations in tests
 */
export function waitForAsync(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock user event for testing
 */
export function createMockUserEvent() {
  return {
    type: vi.fn(),
    click: vi.fn(),
    clear: vi.fn(),
    selectOptions: vi.fn(),
    upload: vi.fn(),
  };
}

/**
 * Test error scenarios
 */
export const ERROR_SCENARIOS = {
  networkError: new Error('Network error'),
  timeoutError: new Error('Request timeout'),
  serverError: createMockApiResponse(
    { success: false, message: 'Internal server error' },
    500
  ),
  unauthorizedError: createMockApiResponse(
    { success: false, message: 'Unauthorized' },
    401
  ),
  forbiddenError: createMockApiResponse(
    { success: false, message: 'Forbidden' },
    403
  ),
  csrfError: createMockApiResponse(MOCK_RESPONSES.csrfFailure, 403),
};

/**
 * Setup function for tests
 */
export function setupAuthTests() {
  // Mock environment
  Object.assign(process.env, TEST_ENV);

  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});

  // Mock document.cookie
  mockDocumentCookie();

  return {
    mockFetch: createMockFetch(),
    mockCSRF: mockCSRFUtils(),
    testStore: createTestStore(),
  };
}

/**
 * Cleanup function for tests
 */
export function cleanupAuthTests() {
  vi.restoreAllMocks();
  vi.clearAllMocks();
}

/**
 * Assert helpers for common test patterns
 */
export const testAssertions = {
  expectValidationError: (container: HTMLElement, fieldName: string, errorMessage: string) => {
    const errorElement = container.querySelector(`[data-testid="${fieldName}-error"], .error-message`);
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveTextContent(errorMessage);
  },

  expectFormSubmission: (mockFn: any, expectedData: any) => {
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining(expectedData)
    );
  },

  expectRedirect: (mockNavigate: any, expectedPath: string) => {
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: expectedPath })
    );
  },

  expectLoadingState: (container: HTMLElement, isLoading: boolean) => {
    const loadingElement = container.querySelector('[data-testid="loading"], .loading');
    if (isLoading) {
      expect(loadingElement).toBeInTheDocument();
    } else {
      expect(loadingElement).not.toBeInTheDocument();
    }
  },
};

/**
 * Performance testing utilities
 */
export const performanceUtils = {
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    return end - start;
  },

  expectFastRender: (renderTime: number, maxTime = 100) => {
    expect(renderTime).toBeLessThan(maxTime);
  },
};

/**
 * Accessibility testing utilities
 */
export const a11yUtils = {
  expectAriaLabels: (container: HTMLElement, expectedLabels: string[]) => {
    expectedLabels.forEach(label => {
      const element = container.querySelector(`[aria-label="${label}"]`);
      expect(element).toBeInTheDocument();
    });
  },

  expectKeyboardNavigation: async (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    expect(focusableElements.length).toBeGreaterThan(0);
  },
};
