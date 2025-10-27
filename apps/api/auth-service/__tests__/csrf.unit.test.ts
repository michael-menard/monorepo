import { describe, it, expect, vi } from 'vitest'
import { generateCsrfToken } from '../utils/tokenUtils'

// Mock the crypto module to use the real implementation
vi.mock('crypto', async importOriginal => {
  const actual = await importOriginal<typeof import('crypto')>()
  return actual
})

describe('CSRF Token Generation', () => {
  describe('generateCsrfToken', () => {
    it('should generate a CSRF token', () => {
      const token = generateCsrfToken()

      expect(typeof token).toBe('string')
      expect(token).toHaveLength(64) // 32 bytes hex encoded = 64 chars
    })

    it('should generate a valid hex-encoded token', () => {
      const token = generateCsrfToken()

      // Should be valid hex string
      expect(token).toMatch(/^[0-9a-f]{64}$/)

      // Should be able to convert from hex without errors
      const buffer = Buffer.from(token, 'hex')
      expect(buffer.length).toBe(32) // 32 bytes
    })

    it('should generate different tokens on subsequent calls', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()

      expect(token1).not.toBe(token2)
      expect(token1).toHaveLength(64)
      expect(token2).toHaveLength(64)
    })

    it('should generate cryptographically secure random tokens', () => {
      // Generate multiple tokens and verify they're all unique
      const tokens = new Set()

      for (let i = 0; i < 100; i++) {
        const token = generateCsrfToken()
        expect(tokens.has(token)).toBe(false) // Should be unique
        tokens.add(token)
        expect(token).toMatch(/^[0-9a-f]{64}$/) // Should be valid hex
      }

      expect(tokens.size).toBe(100) // All tokens should be unique
    })

    it('should produce tokens that decode to exactly 32 bytes', () => {
      for (let i = 0; i < 10; i++) {
        const token = generateCsrfToken()
        const buffer = Buffer.from(token, 'hex')
        expect(buffer.length).toBe(32)
      }
    })
  })
})
