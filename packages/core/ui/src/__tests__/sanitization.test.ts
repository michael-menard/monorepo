import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  sanitizeInput,
  sanitizeByInputType,
  sanitizeFormData,
  validateSanitizedInput,
  isDOMPurifyAvailable,
  safeSanitizeInput,
  SANITIZATION_PROFILES,
  INPUT_TYPE_PROFILES,
} from '../lib/sanitization'

// Mock DOMPurify for testing
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((input: string, config?: any) => {
      // Simple mock implementation that removes script tags
      return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    }),
  },
}))

describe('Sanitization Utilities', () => {
  describe('sanitizeInput', () => {
    it('should handle null and undefined input', () => {
      expect(sanitizeInput(null)).toBe('')
      expect(sanitizeInput(undefined)).toBe('')
    })

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('')
      expect(sanitizeInput('   ')).toBe('   ')
    })

    it('should convert non-string input to string', () => {
      expect(sanitizeInput(123 as any)).toBe('123')
      expect(sanitizeInput(true as any)).toBe('true')
    })

    it('should sanitize malicious script tags', () => {
      const maliciousInput = '<script>alert("XSS")</script>Hello World'
      const result = sanitizeInput(maliciousInput)
      expect(result).toBe('Hello World')
      expect(result).not.toContain('<script>')
    })

    it('should remove javascript: URLs', () => {
      const maliciousInput = 'javascript:alert("XSS")'
      const result = sanitizeInput(maliciousInput)
      expect(result).not.toContain('javascript:')
    })

    it('should remove event handlers', () => {
      const maliciousInput = '<div onclick="alert(1)">Click me</div>'
      const result = sanitizeInput(maliciousInput)
      expect(result).not.toContain('onclick=')
    })
  })

  describe('sanitizeByInputType', () => {
    it('should use correct profile for different input types', () => {
      const testInput = '<b>Bold text</b>'

      // Text input should use STRICT profile
      const textResult = sanitizeByInputType(testInput, 'text')
      expect(textResult).toBeDefined()

      // Search input should use SEARCH profile
      const searchResult = sanitizeByInputType(testInput, 'search')
      expect(searchResult).toBeDefined()

      // Unknown input type should default to STRICT
      const unknownResult = sanitizeByInputType(testInput, 'unknown')
      expect(unknownResult).toBeDefined()
    })

    it('should handle null input type', () => {
      const result = sanitizeByInputType('test', undefined as any)
      expect(result).toBe('test')
    })
  })

  describe('sanitizeFormData', () => {
    it('should sanitize all string values in form data', () => {
      const formData = {
        name: '<script>alert("XSS")</script>John',
        email: 'john@example.com',
        age: 25,
        message: '<b>Hello</b> World',
      }

      const result = sanitizeFormData(formData)

      expect(result.name).toBe('John')
      expect(result.email).toBe('john@example.com')
      expect(result.age).toBe(25) // Non-string values should remain unchanged
      expect(result.message).toBe('<b>Hello</b> World')
    })

    it('should use field-specific configurations', () => {
      const formData = {
        title: '<b>Important</b>',
        description: '<script>alert("XSS")</script><b>Content</b>',
      }

      const fieldConfigs = {
        title: SANITIZATION_PROFILES.BASIC_TEXT,
        description: SANITIZATION_PROFILES.STRICT,
      }

      const result = sanitizeFormData(formData, fieldConfigs)

      expect(result.title).toBe('<b>Important</b>') // Should preserve basic HTML
      expect(result.description).toBe('<b>Content</b>') // Should remove script but keep content
    })
  })

  describe('validateSanitizedInput', () => {
    it('should detect when content was modified', () => {
      const original = '<script>alert("XSS")</script>Hello'
      const sanitized = 'Hello'

      const result = validateSanitizedInput(original, sanitized)

      expect(result.isValid).toBe(true) // Valid because XSS was removed
      expect(result.warnings).toContain('Content was modified during sanitization')
    })

    it('should detect XSS patterns that were removed', () => {
      const original = '<script>alert("XSS")</script>'
      const sanitized = ''

      const result = validateSanitizedInput(original, sanitized)

      expect(result.warnings).toContain('Potentially malicious content was removed')
    })

    it('should pass validation for clean content', () => {
      const original = 'Hello World'
      const sanitized = 'Hello World'

      const result = validateSanitizedInput(original, sanitized)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('should handle strict validation mode', () => {
      const original = '<b>Bold</b>'
      const sanitized = 'Bold'

      const result = validateSanitizedInput(original, sanitized, { strict: true })

      expect(result.isValid).toBe(false) // Strict mode fails when content is modified
      expect(result.warnings).toContain('Content was modified during sanitization')
    })
  })

  describe('isDOMPurifyAvailable', () => {
    it('should return true when DOMPurify is available', () => {
      // In test environment with jsdom, window is defined and DOMPurify is mocked
      expect(isDOMPurifyAvailable()).toBe(true)
    })
  })

  describe('safeSanitizeInput', () => {
    it('should use DOMPurify when available', () => {
      const maliciousInput = '<script>alert("XSS")</script><b>Hello</b>'
      const result = safeSanitizeInput(maliciousInput)

      // Should remove dangerous content but may preserve safe HTML depending on config
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('javascript:')
      // In test environment, DOMPurify is available and mocked to preserve <b> tags
      expect(result).toContain('Hello')
    })

    it('should handle null and undefined input', () => {
      expect(safeSanitizeInput(null)).toBe('')
      expect(safeSanitizeInput(undefined)).toBe('')
    })
  })

  describe('SANITIZATION_PROFILES', () => {
    it('should have all required profiles', () => {
      expect(SANITIZATION_PROFILES.STRICT).toBeDefined()
      expect(SANITIZATION_PROFILES.BASIC_TEXT).toBeDefined()
      expect(SANITIZATION_PROFILES.RICH_TEXT).toBeDefined()
      expect(SANITIZATION_PROFILES.SEARCH).toBeDefined()
      expect(SANITIZATION_PROFILES.URL).toBeDefined()
    })

    it('should have proper configuration structure', () => {
      const profile = SANITIZATION_PROFILES.STRICT
      expect(profile).toHaveProperty('allowBasicHTML')
      expect(profile).toHaveProperty('allowLinks')
      expect(profile).toHaveProperty('customConfig')
      expect(profile.customConfig).toHaveProperty('ALLOWED_TAGS')
      expect(profile.customConfig).toHaveProperty('ALLOWED_ATTR')
    })
  })

  describe('INPUT_TYPE_PROFILES', () => {
    it('should map input types to appropriate profiles', () => {
      expect(INPUT_TYPE_PROFILES.text).toBe('STRICT')
      expect(INPUT_TYPE_PROFILES.email).toBe('STRICT')
      expect(INPUT_TYPE_PROFILES.search).toBe('SEARCH')
      expect(INPUT_TYPE_PROFILES.url).toBe('URL')
      expect(INPUT_TYPE_PROFILES.textarea).toBe('BASIC_TEXT')
    })
  })
})
