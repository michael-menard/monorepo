import { test as base } from 'playwright-bdd'
import { expect } from '@playwright/test'
import { LoginPage, SignupPage, OTPPage, ForgotPasswordPage, ResetPasswordPage } from './pages'

/**
 * Custom fixtures for BDD tests
 * Provides page objects and shared utilities
 */
export const test = base.extend<{
  loginPage: LoginPage
  signupPage: SignupPage
  otpPage: OTPPage
  forgotPasswordPage: ForgotPasswordPage
  resetPasswordPage: ResetPasswordPage
}>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await use(loginPage)
  },
  signupPage: async ({ page }, use) => {
    const signupPage = new SignupPage(page)
    await use(signupPage)
  },
  otpPage: async ({ page }, use) => {
    const otpPage = new OTPPage(page)
    await use(otpPage)
  },
  forgotPasswordPage: async ({ page }, use) => {
    const forgotPasswordPage = new ForgotPasswordPage(page)
    await use(forgotPasswordPage)
  },
  resetPasswordPage: async ({ page }, use) => {
    const resetPasswordPage = new ResetPasswordPage(page)
    await use(resetPasswordPage)
  },
})

export { expect }

/**
 * Test Data Constants
 */
export const TEST_DATA = {
  // Valid test user (should exist in seeded database)
  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
  },

  // MFA-enabled user
  mfaUser: {
    email: 'mfa-user@example.com',
    password: 'ValidPassword123!',
  },

  // New user for signup tests
  newUser: {
    email: 'newuser@example.com',
    password: 'ValidPassword123!',
    name: 'New User',
  },

  // Invalid credentials for error testing
  invalidUser: {
    email: 'invalid@example.com',
    password: 'WrongPassword123!',
  },

  // OTP codes for testing
  otpCodes: {
    valid: '123456',
    invalid: '000000',
    expired: '999999',
  },

  // Password variations for validation testing
  passwords: {
    weak: 'weak',
    short: 'Short1!',
    noUppercase: 'nouppercase1!',
    noLowercase: 'NOLOWERCASE1!',
    noNumber: 'NoNumber!!',
    noSpecial: 'NoSpecial123',
    valid: 'ValidPassword123!',
    strong: 'StrongerPass1!',
  },

  // Invalid email formats
  invalidEmails: {
    noAt: 'invalidemail',
    noDomain: 'invalid@',
    noTld: 'invalid@example',
    spaces: 'invalid email@example.com',
  },
}

/**
 * URL constants for navigation assertions
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/register',
  dashboard: '/dashboard',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  otpVerification: '/auth/otp-verification',
  verifyEmail: '/verify-email',
  profile: '/profile',
  settings: '/settings',
}

/**
 * Common validation messages expected from the app
 */
export const VALIDATION_MESSAGES = {
  email: {
    required: 'email',
    invalid: 'valid email',
  },
  password: {
    required: 'password',
    tooShort: 'at least 8 characters',
    noUppercase: 'uppercase',
    noLowercase: 'lowercase',
    noNumber: 'number',
    noSpecial: 'special character',
  },
  confirmPassword: {
    mismatch: "don't match",
  },
  auth: {
    invalidCredentials: 'invalid|incorrect|failed',
    invalidOtp: 'invalid|incorrect',
    expiredCode: 'expired',
    rateLimited: 'too many|try again',
    emailExists: 'already exists',
  },
}
