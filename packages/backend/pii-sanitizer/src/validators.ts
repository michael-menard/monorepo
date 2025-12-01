/**
 * Validators for detecting PII patterns
 */

import {
  EMAIL_PATTERN,
  PHONE_PATTERN,
  CREDIT_CARD_PATTERN,
  IP_ADDRESS_PATTERN,
  SSN_PATTERN,
  API_KEY_PATTERN,
  JWT_PATTERN,
  AWS_KEY_PATTERN,
  PASSWORD_KEYWORDS,
} from './patterns'

/**
 * Check if a string contains an email address
 */
export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}

/**
 * Check if a string contains a phone number
 */
export function isPhoneNumber(value: string): boolean {
  return PHONE_PATTERN.test(value)
}

/**
 * Check if a string contains a credit card number
 */
export function isCreditCard(value: string): boolean {
  // Reset lastIndex for global regex
  CREDIT_CARD_PATTERN.lastIndex = 0
  const match = CREDIT_CARD_PATTERN.test(value)
  CREDIT_CARD_PATTERN.lastIndex = 0
  return match
}

/**
 * Check if a string contains an IP address
 */
export function isIPAddress(value: string): boolean {
  return IP_ADDRESS_PATTERN.test(value)
}

/**
 * Check if a string contains a Social Security Number
 */
export function isSSN(value: string): boolean {
  return SSN_PATTERN.test(value)
}

/**
 * Check if a string contains an API key
 */
export function isAPIKey(value: string): boolean {
  // Only consider it an API key if it's a long string (to avoid false positives)
  return value.length >= 32 && API_KEY_PATTERN.test(value)
}

/**
 * Check if a string contains a JWT token
 */
export function isJWT(value: string): boolean {
  return JWT_PATTERN.test(value)
}

/**
 * Check if a string contains an AWS access key
 */
export function isAWSKey(value: string): boolean {
  return AWS_KEY_PATTERN.test(value)
}

/**
 * Check if a field name contains sensitive keywords
 */
export function containsSensitiveKeyword(
  fieldName: string,
  customKeywords: string[] = [],
): boolean {
  const allKeywords = [...PASSWORD_KEYWORDS, ...customKeywords]
  const lowerFieldName = fieldName.toLowerCase()

  return allKeywords.some(keyword => lowerFieldName.includes(keyword.toLowerCase()))
}

/**
 * Check if a string value should be sanitized based on heuristics
 */
export function shouldSanitize(value: string, fieldName?: string): boolean {
  // Check field name first (most reliable)
  if (fieldName && containsSensitiveKeyword(fieldName)) {
    return true
  }

  // Check value patterns
  return (
    isEmail(value) ||
    isPhoneNumber(value) ||
    isCreditCard(value) ||
    isSSN(value) ||
    isJWT(value) ||
    isAWSKey(value) ||
    (isAPIKey(value) && value.length >= 32)
  )
}
