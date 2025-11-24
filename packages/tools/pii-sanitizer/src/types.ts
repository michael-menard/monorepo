/**
 * Type definitions for PII sanitization
 */

export interface SanitizationOptions {
  /**
   * Replacement string for sanitized values
   * @default '[REDACTED]'
   */
  replacement?: string

  /**
   * Whether to sanitize email addresses
   * @default true
   */
  sanitizeEmails?: boolean

  /**
   * Whether to sanitize phone numbers
   * @default true
   */
  sanitizePhoneNumbers?: boolean

  /**
   * Whether to sanitize credit card numbers
   * @default true
   */
  sanitizeCreditCards?: boolean

  /**
   * Whether to sanitize IP addresses
   * @default false
   */
  sanitizeIPAddresses?: boolean

  /**
   * Whether to sanitize Social Security Numbers
   * @default true
   */
  sanitizeSSN?: boolean

  /**
   * Whether to sanitize API keys and tokens
   * @default true
   */
  sanitizeAPIKeys?: boolean

  /**
   * Whether to sanitize JWT tokens
   * @default true
   */
  sanitizeJWT?: boolean

  /**
   * Whether to sanitize AWS keys
   * @default true
   */
  sanitizeAWSKeys?: boolean

  /**
   * Additional custom patterns to sanitize
   */
  customPatterns?: RegExp[]

  /**
   * Additional keywords to treat as sensitive (case-insensitive)
   */
  customKeywords?: string[]

  /**
   * Whether to preserve part of the value (e.g., last 4 digits)
   * @default false
   */
  partialRedaction?: boolean

  /**
   * Number of characters to preserve when using partial redaction
   * @default 4
   */
  preserveChars?: number
}

export const defaultSanitizationOptions: Required<SanitizationOptions> = {
  replacement: '[REDACTED]',
  sanitizeEmails: true,
  sanitizePhoneNumbers: true,
  sanitizeCreditCards: true,
  sanitizeIPAddresses: false,
  sanitizeSSN: true,
  sanitizeAPIKeys: true,
  sanitizeJWT: true,
  sanitizeAWSKeys: true,
  customPatterns: [],
  customKeywords: [],
  partialRedaction: false,
  preserveChars: 4,
}

export interface SanitizationRule {
  pattern: RegExp
  replacement: string | ((match: string) => string)
  name: string
}

export interface SanitizationResult<T> {
  sanitized: T
  redactionCount: number
  redactedFields: string[]
}

export type CustomSanitizer = (value: unknown, options?: SanitizationOptions) => unknown

/**
 * Create a custom sanitizer with specific options
 */
export function createCustomSanitizer(
  defaultOptions: Partial<SanitizationOptions>,
): CustomSanitizer {
  return (value: unknown, options?: SanitizationOptions) => {
    const mergedOptions = { ...defaultSanitizationOptions, ...defaultOptions, ...options }
    // This will be implemented in sanitizer.ts
    return value
  }
}
