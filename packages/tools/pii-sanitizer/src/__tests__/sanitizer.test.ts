/**
 * Tests for PII sanitization functions
 */

import { describe, it, expect } from 'vitest'
import {
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
} from '../sanitizer'
import type { SanitizationOptions } from '../types'

describe('PII Sanitizer', () => {
  describe('sanitizeString', () => {
    it('should sanitize email addresses', () => {
      const input = 'Contact us at user@example.com for help'
      const result = sanitizeString(input)
      expect(result).toBe('Contact us at [REDACTED] for help')
    })

    it('should sanitize phone numbers', () => {
      const input = 'Call me at 555-123-4567'
      const result = sanitizeString(input)
      expect(result).toBe('Call me at [REDACTED]')
    })

    it('should sanitize credit card numbers', () => {
      const input = 'Card: 4532-1234-5678-9010'
      const result = sanitizeString(input)
      expect(result).toBe('Card: [REDACTED]')
    })

    it('should sanitize SSN', () => {
      const input = 'SSN: 123-45-6789'
      const result = sanitizeString(input)
      expect(result).toBe('SSN: [REDACTED]')
    })

    it('should sanitize JWT tokens', () => {
      const input =
        'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      const result = sanitizeString(input)
      expect(result).toBe('Token: [REDACTED]')
    })

    it('should sanitize AWS keys', () => {
      const input = 'Key: AKIAIOSFODNN7EXAMPLE'
      const result = sanitizeString(input)
      expect(result).toBe('Key: [REDACTED]')
    })

    it('should use custom replacement string', () => {
      const input = 'Email: user@example.com'
      const result = sanitizeString(input, { replacement: '***HIDDEN***' })
      expect(result).toBe('Email: ***HIDDEN***')
    })

    it('should support partial redaction for credit cards', () => {
      const input = '4532-1234-5678-9010'
      const result = sanitizeString(input, {
        partialRedaction: true,
        preserveChars: 4,
      })
      expect(result).toBe('****-****-****-9010')
    })

    it('should support partial redaction for SSN', () => {
      const input = '123-45-6789'
      const result = sanitizeString(input, {
        partialRedaction: true,
        preserveChars: 4,
      })
      expect(result).toBe('***-**-6789')
    })

    it('should apply custom patterns', () => {
      const input = 'Reference: REF-12345'
      const customPattern = /REF-\d+/g
      const result = sanitizeString(input, {
        customPatterns: [customPattern],
      })
      expect(result).toBe('Reference: [REDACTED]')
    })

    it('should not sanitize IP addresses by default', () => {
      const input = 'Server: 192.168.1.1'
      const result = sanitizeString(input)
      expect(result).toBe('Server: 192.168.1.1')
    })

    it('should sanitize IP addresses when enabled', () => {
      const input = 'Server: 192.168.1.1'
      const result = sanitizeString(input, { sanitizeIPAddresses: true })
      expect(result).toBe('Server: [REDACTED]')
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize string values in objects', () => {
      const input = {
        message: 'Contact user@example.com',
        phone: '555-123-4567',
      }
      const result = sanitizeObject(input)
      expect(result).toEqual({
        message: 'Contact [REDACTED]',
        phone: '[REDACTED]',
      })
    })

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          email: 'user@example.com',
          profile: {
            phone: '555-123-4567',
          },
        },
      }
      const result = sanitizeObject(input)
      expect(result).toEqual({
        user: {
          email: '[REDACTED]',
          profile: {
            phone: '[REDACTED]',
          },
        },
      })
    })

    it('should sanitize arrays', () => {
      const input = {
        emails: ['user1@example.com', 'user2@example.com'],
      }
      const result = sanitizeObject(input)
      expect(result).toEqual({
        emails: ['[REDACTED]', '[REDACTED]'],
      })
    })

    it('should redact fields with sensitive keywords', () => {
      const input = {
        password: 'mySecretPassword123',
        api_key: 'abc123',
        token: 'xyz789',
        username: 'john_doe',
      }
      const result = sanitizeObject(input)
      expect(result).toEqual({
        password: '[REDACTED]',
        api_key: '[REDACTED]',
        token: '[REDACTED]',
        username: 'john_doe',
      })
    })

    it('should handle custom keywords', () => {
      const input = {
        socialSecurityNumber: '123-45-6789',
        accountNumber: '987654321',
      }
      const result = sanitizeObject(input, {
        customKeywords: ['socialSecurityNumber', 'accountNumber'],
      })
      expect(result).toEqual({
        socialSecurityNumber: '[REDACTED]',
        accountNumber: '[REDACTED]',
      })
    })

    it('should preserve non-sensitive data', () => {
      const input = {
        name: 'John Doe',
        age: 30,
        active: true,
        metadata: {
          created: '2024-01-01',
        },
      }
      const result = sanitizeObject(input)
      expect(result).toEqual(input)
    })
  })

  describe('sanitizeError', () => {
    it('should sanitize error messages', () => {
      const error = new Error('Failed to send email to user@example.com')
      const result = sanitizeError(error)
      expect(result.message).toBe('Failed to send email to [REDACTED]')
    })

    it('should sanitize stack traces', () => {
      const error = new Error('Test error')
      error.stack = `Error: Failed at user@example.com
        at Object.<anonymous> (/path/to/file.js:10:15)
        at Module._compile (internal/modules/cjs/loader.js:999:30)`

      const result = sanitizeError(error)
      expect(result.stack).toContain('[REDACTED]')
      expect(result.stack).not.toContain('user@example.com')
    })

    it('should sanitize additional error properties', () => {
      const error = new Error('Test') as Error & {
        userEmail?: string
        metadata?: { apiKey?: string }
      }
      error.userEmail = 'user@example.com'
      error.metadata = { apiKey: 'secret-key-12345' }

      const result = sanitizeError(error) as Error & {
        userEmail?: string
        metadata?: { apiKey?: string }
      }
      expect(result.userEmail).toBe('[REDACTED]')
    })
  })

  describe('sanitizeStackTrace', () => {
    it('should sanitize URLs in stack traces', () => {
      const stack = `Error: Test
        at fetch (http://example.com/api?token=secret123)
        at Object.<anonymous> (/path/to/file.js:10:15)`

      const result = sanitizeStackTrace(stack)
      expect(result).toContain('token=[REDACTED]')
      expect(result).not.toContain('secret123')
    })

    it('should sanitize PII in stack traces', () => {
      const stack = `Error: Failed for user@example.com
        at processUser (/app/users.js:45:10)`

      const result = sanitizeStackTrace(stack)
      expect(result).toContain('[REDACTED]')
      expect(result).not.toContain('user@example.com')
    })
  })

  describe('sanitizeUrl', () => {
    it('should sanitize sensitive query parameters', () => {
      const url = 'https://api.example.com/data?token=secret123&id=456'
      const result = sanitizeUrl(url)
      expect(result).toContain('token=[REDACTED]')
      expect(result).toContain('id=456')
    })

    it('should sanitize multiple sensitive parameters', () => {
      const url =
        'https://api.example.com/auth?api_key=abc123&password=secret&user=john'
      const result = sanitizeUrl(url)
      expect(result).toContain('api_key=[REDACTED]')
      expect(result).toContain('password=[REDACTED]')
      expect(result).toContain('user=john')
    })

    it('should handle URLs without query parameters', () => {
      const url = 'https://api.example.com/data'
      const result = sanitizeUrl(url)
      expect(result).toBe(url)
    })

    it('should handle malformed URLs gracefully', () => {
      const url = 'not-a-url?token=secret123'
      const result = sanitizeUrl(url)
      expect(result).toContain('token=[REDACTED]')
    })
  })

  describe('sanitizeHeaders', () => {
    it('should sanitize authorization headers', () => {
      const headers = {
        'Authorization': 'Bearer token123',
        'Content-Type': 'application/json',
      }
      const result = sanitizeHeaders(headers)
      expect(result).toEqual({
        'Authorization': '[REDACTED]',
        'Content-Type': 'application/json',
      })
    })

    it('should sanitize cookie headers', () => {
      const headers = {
        'Cookie': 'session=abc123; token=xyz789',
        'User-Agent': 'Mozilla/5.0',
      }
      const result = sanitizeHeaders(headers)
      expect(result).toEqual({
        'Cookie': '[REDACTED]',
        'User-Agent': 'Mozilla/5.0',
      })
    })

    it('should sanitize x-api-key headers', () => {
      const headers = {
        'x-api-key': 'secret-api-key',
        'x-request-id': '12345',
      }
      const result = sanitizeHeaders(headers)
      expect(result).toEqual({
        'x-api-key': '[REDACTED]',
        'x-request-id': '12345',
      })
    })

    it('should handle array header values', () => {
      const headers = {
        'set-cookie': ['cookie1=value1', 'cookie2=value2'],
      }
      const result = sanitizeHeaders(headers)
      expect(result).toEqual({
        'set-cookie': '[REDACTED]',
      })
    })
  })

  describe('sanitizeEmail', () => {
    it('should fully redact email by default', () => {
      const result = sanitizeEmail('user@example.com')
      expect(result).toBe('[REDACTED]')
    })

    it('should partially redact email when enabled', () => {
      const result = sanitizeEmail('user@example.com', {
        partialRedaction: true,
        preserveChars: 4,
      })
      expect(result).toBe('user***@example.com')
    })

    it('should return non-email strings unchanged', () => {
      const result = sanitizeEmail('not an email')
      expect(result).toBe('not an email')
    })
  })

  describe('sanitizePhoneNumber', () => {
    it('should fully redact phone by default', () => {
      const result = sanitizePhoneNumber('555-123-4567')
      expect(result).toBe('[REDACTED]')
    })

    it('should partially redact phone when enabled', () => {
      const result = sanitizePhoneNumber('555-123-4567', {
        partialRedaction: true,
        preserveChars: 4,
      })
      expect(result).toBe('***-***-4567')
    })

    it('should return non-phone strings unchanged', () => {
      const result = sanitizePhoneNumber('not a phone')
      expect(result).toBe('not a phone')
    })
  })

  describe('sanitizeCreditCard', () => {
    it('should fully redact card by default', () => {
      const result = sanitizeCreditCard('4532-1234-5678-9010')
      expect(result).toBe('[REDACTED]')
    })

    it('should partially redact card when enabled', () => {
      const result = sanitizeCreditCard('4532-1234-5678-9010', {
        partialRedaction: true,
        preserveChars: 4,
      })
      expect(result).toBe('****-****-****-9010')
    })

    it('should return non-card strings unchanged', () => {
      const result = sanitizeCreditCard('not a card')
      expect(result).toBe('not a card')
    })
  })

  describe('sanitizeIPAddress', () => {
    it('should fully redact IP by default', () => {
      const result = sanitizeIPAddress('192.168.1.1', {
        sanitizeIPAddresses: true,
      })
      expect(result).toBe('[REDACTED]')
    })

    it('should partially redact IP when enabled', () => {
      const result = sanitizeIPAddress('192.168.1.1', {
        sanitizeIPAddresses: true,
        partialRedaction: true,
      })
      expect(result).toBe('192.168.***.***.')
    })

    it('should return non-IP strings unchanged', () => {
      const result = sanitizeIPAddress('not an ip')
      expect(result).toBe('not an ip')
    })
  })

  describe('sanitizeUserAgent', () => {
    it('should extract browser and OS info', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      const result = sanitizeUserAgent(ua)
      expect(result).toBe('Chrome/91 (Windows)')
    })

    it('should handle Firefox user agents', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
      const result = sanitizeUserAgent(ua)
      expect(result).toBe('Firefox/89 (Mac OS)')
    })

    it('should handle Safari user agents', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      const result = sanitizeUserAgent(ua)
      expect(result).toBe('Safari/605 (Mac OS)')
    })
  })

  describe('Integration tests', () => {
    it('should sanitize complex nested objects with multiple PII types', () => {
      const input = {
        user: {
          email: 'user@example.com',
          phone: '555-123-4567',
          ssn: '123-45-6789',
        },
        payment: {
          card: '4532-1234-5678-9010',
          amount: 100,
        },
        apiKey: 'AKIAIOSFODNN7EXAMPLE',
        metadata: {
          ip: '192.168.1.1',
          token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
        },
      }

      const result = sanitizeObject(input)

      expect(result).toEqual({
        user: {
          email: '[REDACTED]',
          phone: '[REDACTED]',
          ssn: '[REDACTED]',
        },
        payment: {
          card: '[REDACTED]',
          amount: 100,
        },
        apiKey: '[REDACTED]',
        metadata: {
          ip: '192.168.1.1', // Not sanitized by default
          token: '[REDACTED]',
        },
      })
    })

    it('should preserve data when all sanitization is disabled', () => {
      const input = {
        email: 'user@example.com',
        phone: '555-123-4567',
      }

      const options: SanitizationOptions = {
        sanitizeEmails: false,
        sanitizePhoneNumbers: false,
        sanitizeCreditCards: false,
        sanitizeSSN: false,
        sanitizeAPIKeys: false,
        sanitizeJWT: false,
        sanitizeAWSKeys: false,
      }

      const result = sanitizeObject(input, options)
      expect(result).toEqual(input)
    })
  })
})
