/**
 * Core sanitization functions for PII data
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
  SENSITIVE_HEADERS,
  SENSITIVE_QUERY_PARAMS,
} from './patterns'
import type { SanitizationOptions } from './types'
import { defaultSanitizationOptions } from './types'
import {
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

/**
 * Sanitize a string value based on detected PII patterns
 */
export function sanitizeString(value: string, options: SanitizationOptions = {}): string {
  const opts = { ...defaultSanitizationOptions, ...options }
  let sanitized = value

  // Apply each sanitization rule if enabled
  // Note: Credit cards must be checked BEFORE phones since phone pattern can match parts of credit cards
  if (opts.sanitizeCreditCards && isCreditCard(value)) {
    // Reset the regex lastIndex to ensure proper matching
    CREDIT_CARD_PATTERN.lastIndex = 0
    if (opts.partialRedaction) {
      const replaced = sanitized.replace(CREDIT_CARD_PATTERN, match => {
        const digits = match.replace(/[-\s]/g, '')
        const lastFour = digits.slice(-opts.preserveChars)
        return `****-****-****-${lastFour}`
      })
      CREDIT_CARD_PATTERN.lastIndex = 0
      sanitized = replaced
    } else {
      const replaced = sanitized.replace(CREDIT_CARD_PATTERN, opts.replacement)
      CREDIT_CARD_PATTERN.lastIndex = 0
      sanitized = replaced
    }
  }

  if (opts.sanitizeEmails && isEmail(value)) {
    sanitized = sanitized.replace(EMAIL_PATTERN, opts.replacement)
  }

  if (opts.sanitizePhoneNumbers && isPhoneNumber(value)) {
    sanitized = sanitized.replace(PHONE_PATTERN, opts.replacement)
  }

  if (opts.sanitizeIPAddresses && isIPAddress(value)) {
    sanitized = sanitized.replace(IP_ADDRESS_PATTERN, opts.replacement)
  }

  if (opts.sanitizeSSN && isSSN(value)) {
    if (opts.partialRedaction) {
      sanitized = sanitized.replace(SSN_PATTERN, match => {
        const lastFour = match.slice(-4)
        return `***-**-${lastFour}`
      })
    } else {
      sanitized = sanitized.replace(SSN_PATTERN, opts.replacement)
    }
  }

  if (opts.sanitizeJWT && isJWT(value)) {
    sanitized = sanitized.replace(JWT_PATTERN, opts.replacement)
  }

  if (opts.sanitizeAWSKeys && isAWSKey(value)) {
    sanitized = sanitized.replace(AWS_KEY_PATTERN, opts.replacement)
  }

  if (opts.sanitizeAPIKeys && isAPIKey(value)) {
    if (opts.partialRedaction) {
      sanitized = sanitized.replace(API_KEY_PATTERN, match => {
        if (match.length < 32) return match
        const lastFour = match.slice(-opts.preserveChars)
        return `${opts.replacement.slice(0, -1)}-${lastFour}]`
      })
    } else {
      sanitized = sanitized.replace(API_KEY_PATTERN, match => {
        return match.length >= 32 ? opts.replacement : match
      })
    }
  }

  // Apply custom patterns
  if (opts.customPatterns && opts.customPatterns.length > 0) {
    for (const pattern of opts.customPatterns) {
      sanitized = sanitized.replace(pattern, opts.replacement)
    }
  }

  return sanitized
}

/**
 * Sanitize an object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizationOptions = {},
): T {
  const opts = { ...defaultSanitizationOptions, ...options }

  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') {
        return sanitizeString(item, opts)
      } else if (typeof item === 'object' && item !== null) {
        return sanitizeObject(item as Record<string, unknown>, opts)
      }
      return item
    }) as unknown as T
  }

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    // Check if field name contains sensitive keywords
    if (containsSensitiveKeyword(key, opts.customKeywords)) {
      sanitized[key] = opts.replacement
      continue
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, opts)
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, opts)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}

/**
 * Sanitize an Error object
 */
export function sanitizeError(error: Error, options: SanitizationOptions = {}): Error {
  const opts = { ...defaultSanitizationOptions, ...options }

  const sanitized = new Error(sanitizeString(error.message, opts))
  sanitized.name = error.name
  sanitized.stack = error.stack ? sanitizeStackTrace(error.stack, opts) : undefined

  // Sanitize any additional properties
  for (const [key, value] of Object.entries(error)) {
    if (key !== 'message' && key !== 'name' && key !== 'stack') {
      if (typeof value === 'string') {
        ;(sanitized as unknown as Record<string, unknown>)[key] = sanitizeString(value, opts)
      } else if (typeof value === 'object' && value !== null) {
        ;(sanitized as unknown as Record<string, unknown>)[key] = sanitizeObject(
          value as Record<string, unknown>,
          opts,
        )
      } else {
        ;(sanitized as unknown as Record<string, unknown>)[key] = value
      }
    }
  }

  return sanitized
}

/**
 * Sanitize a stack trace string
 */
export function sanitizeStackTrace(stackTrace: string, options: SanitizationOptions = {}): string {
  const opts = { ...defaultSanitizationOptions, ...options }
  const lines = stackTrace.split('\n')

  return lines
    .map(line => {
      // Sanitize URLs in stack trace (file paths, source maps)
      let sanitized = line

      // Remove query parameters from URLs that might contain sensitive data
      sanitized = sanitized.replace(/\?[^)\s]+/g, match => {
        return sanitizeUrl(match, opts)
      })

      // Sanitize any PII in the stack trace itself
      sanitized = sanitizeString(sanitized, opts)

      return sanitized
    })
    .join('\n')
}

/**
 * Sanitize a URL by removing sensitive query parameters
 */
export function sanitizeUrl(url: string, options: SanitizationOptions = {}): string {
  const opts = { ...defaultSanitizationOptions, ...options }

  try {
    const urlObj = new URL(url)
    const params = new URLSearchParams(urlObj.search)
    const newParams: string[] = []

    // Check each query parameter
    for (const [key, value] of params.entries()) {
      const lowerKey = key.toLowerCase()
      const isSensitive =
        SENSITIVE_QUERY_PARAMS.some(param => lowerKey.includes(param.toLowerCase())) ||
        containsSensitiveKeyword(key, opts.customKeywords)

      if (isSensitive) {
        newParams.push(`${key}=${opts.replacement}`)
      } else {
        newParams.push(`${key}=${value}`)
      }
    }

    // Reconstruct URL with sanitized params
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
    return newParams.length > 0 ? `${baseUrl}?${newParams.join('&')}` : baseUrl
  } catch {
    // If URL parsing fails, try basic string replacement
    return url.replace(
      /([?&])(token|key|secret|password|auth|api_key)=[^&\s]*/gi,
      (match, prefix, param) => {
        return `${prefix}${param}=${opts.replacement}`
      },
    )
  }
}

/**
 * Sanitize HTTP headers object
 */
export function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>,
  options: SanitizationOptions = {},
): Record<string, string | string[] | undefined> {
  const opts = { ...defaultSanitizationOptions, ...options }
  const sanitized: Record<string, string | string[] | undefined> = {}

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_HEADERS.includes(lowerKey)

    if (isSensitive) {
      sanitized[key] = opts.replacement
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, opts)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => sanitizeString(v, opts))
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Sanitize email address (partial redaction or full)
 */
export function sanitizeEmail(email: string, options: SanitizationOptions = {}): string {
  const opts = { ...defaultSanitizationOptions, ...options }

  if (!isEmail(email)) {
    return email
  }

  if (opts.partialRedaction) {
    return email.replace(EMAIL_PATTERN, match => {
      const [localPart, domain] = match.split('@')
      if (!localPart || !domain) return opts.replacement

      const visibleChars = Math.min(opts.preserveChars, localPart.length)
      const redactedLocal = localPart.slice(0, visibleChars) + '***'
      return `${redactedLocal}@${domain}`
    })
  }

  return email.replace(EMAIL_PATTERN, opts.replacement)
}

/**
 * Sanitize phone number (partial redaction or full)
 */
export function sanitizePhoneNumber(phone: string, options: SanitizationOptions = {}): string {
  const opts = { ...defaultSanitizationOptions, ...options }

  if (!isPhoneNumber(phone)) {
    return phone
  }

  if (opts.partialRedaction) {
    return phone.replace(PHONE_PATTERN, match => {
      const digits = match.replace(/\D/g, '')
      const lastFour = digits.slice(-opts.preserveChars)
      return `***-***-${lastFour}`
    })
  }

  return phone.replace(PHONE_PATTERN, opts.replacement)
}

/**
 * Sanitize credit card number (partial redaction or full)
 */
export function sanitizeCreditCard(cardNumber: string, options: SanitizationOptions = {}): string {
  const opts = { ...defaultSanitizationOptions, ...options }

  if (!isCreditCard(cardNumber)) {
    return cardNumber
  }

  if (opts.partialRedaction) {
    return cardNumber.replace(CREDIT_CARD_PATTERN, match => {
      const digits = match.replace(/[-\s]/g, '')
      const lastFour = digits.slice(-opts.preserveChars)
      return `****-****-****-${lastFour}`
    })
  }

  return cardNumber.replace(CREDIT_CARD_PATTERN, opts.replacement)
}

/**
 * Sanitize IP address
 */
export function sanitizeIPAddress(ip: string, options: SanitizationOptions = {}): string {
  const opts = { ...defaultSanitizationOptions, ...options }

  if (!isIPAddress(ip)) {
    return ip
  }

  if (opts.partialRedaction) {
    return ip.replace(IP_ADDRESS_PATTERN, match => {
      const parts = match.split('.')
      return `${parts[0]}.${parts[1]}.***.***.`
    })
  }

  return ip.replace(IP_ADDRESS_PATTERN, opts.replacement)
}

/**
 * Sanitize user agent string (remove identifying information)
 */
export function sanitizeUserAgent(userAgent: string, options: SanitizationOptions = {}): string {
  const opts = { ...defaultSanitizationOptions, ...options }

  // Keep only browser and OS information, remove specific version details
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)[/\s](\d+)/i)
  const osMatch = userAgent.match(/(Windows|Mac OS|Linux|Android|iOS)/i)

  if (browserMatch && osMatch) {
    return `${browserMatch[1]}/${browserMatch[2]} (${osMatch[1]})`
  }

  // If we can't parse it, apply standard sanitization
  return sanitizeString(userAgent, opts)
}
