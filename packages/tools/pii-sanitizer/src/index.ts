/**
 * PII Sanitizer
 *
 * Provides utilities for sanitizing Personally Identifiable Information (PII)
 * from logs, errors, analytics, and other data before transmission or storage.
 *
 * Used across frontend and backend for:
 * - Error reporting
 * - Application logging
 * - Analytics tracking
 * - CloudWatch logs
 */

export {
  sanitizeString,
  sanitizeObject,
  sanitizeError,
  sanitizeStackTrace,
  sanitizeUrl,
  sanitizeHeaders,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeCreditCard,
  sanitizeIPAddress,
  sanitizeUserAgent,
} from './sanitizer'

export {
  type SanitizationOptions,
  type SanitizationRule,
  type SanitizationResult,
  defaultSanitizationOptions,
  createCustomSanitizer,
} from './types'

export {
  EMAIL_PATTERN,
  PHONE_PATTERN,
  CREDIT_CARD_PATTERN,
  IP_ADDRESS_PATTERN,
  SSN_PATTERN,
  API_KEY_PATTERN,
  JWT_PATTERN,
  AWS_KEY_PATTERN,
  PASSWORD_KEYWORDS,
  SENSITIVE_HEADERS,
} from './patterns'

export {
  isEmail,
  isPhoneNumber,
  isCreditCard,
  isIPAddress,
  isSSN,
  isAPIKey,
  isJWT,
  isAWSKey,
  containsSensitiveKeyword,
} from './validators'
