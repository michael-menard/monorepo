/**
 * Test Constants
 * Centralized constants for Playwright tests
 */

/**
 * Timeout constants (in milliseconds)
 */
export const TIMEOUTS = {
  /** Short timeout for quick UI updates (500ms) */
  SHORT: 500,

  /** Standard timeout for most operations (1 second) */
  STANDARD: 1000,

  /** Medium timeout for API calls and navigation (2 seconds) */
  MEDIUM: 2000,

  /** Long timeout for slow operations (5 seconds) */
  LONG: 5000,

  /** Extra long timeout for page loads and complex operations (10 seconds) */
  EXTRA_LONG: 10000,
} as const

/**
 * Test email domain for generating unique test emails
 */
export const TEST_EMAIL_DOMAIN = '@test.example.com'

/**
 * Password requirements for validation
 */
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRES_UPPERCASE: true,
  REQUIRES_LOWERCASE: true,
  REQUIRES_NUMBER: true,
  REQUIRES_SPECIAL_CHAR: true,
} as const

/**
 * Common test data
 */
export const TEST_DATA = {
  VALID_PASSWORD: 'Test123!@#',
  WEAK_PASSWORD: 'test',
  SHORT_PASSWORD: 'Test1!',
  NO_UPPERCASE_PASSWORD: 'test123!@#',
  NO_LOWERCASE_PASSWORD: 'TEST123!@#',
  NO_NUMBER_PASSWORD: 'TestTest!@#',
  NO_SPECIAL_CHAR_PASSWORD: 'Test123456',
  VALID_NAME: 'Test User',
  SHORT_NAME: 'T',
  VALID_EMAIL: 'test@example.com',
  INVALID_EMAIL: 'invalid-email',
} as const

/**
 * Password strength levels
 */
export const PASSWORD_STRENGTH = {
  VERY_WEAK: 'Very weak',
  WEAK: 'Weak',
  FAIR: 'Fair',
  GOOD: 'Good',
  STRONG: 'Strong',
} as const

