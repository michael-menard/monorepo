/**
 * CSRF Service Tests
 * 
 * Comprehensive tests for CSRF token management, double-submit cookie pattern,
 * and retry logic implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  fetchCSRFToken,
  getCSRFToken,
  refreshCSRFToken,
  clearCSRFToken,
  hasCSRFToken,
  initializeCSRF,
  getCSRFHeaders
} from '../csrfService'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: ''
})

describe('CSRF Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCSRFToken()
    document.cookie = ''
    
    // Mock successful CSRF token fetch by default
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        token: 'mock-csrf-token-123'
      })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    clearCSRFToken()
    document.cookie = ''
  })

  describe('fetchCSRFToken', () => {
    it('should fetch CSRF token from correct endpoint', async () => {
      const token = await fetchCSRFToken()

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include'
      })
      expect(token).toBe('mock-csrf-token-123')
    })

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(fetchCSRFToken()).rejects.toThrow(
        'CSRF token fetch failed: 500 Internal Server Error'
      )
    })

    it('should handle missing token in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          message: 'No token'
        })
      })

      await expect(fetchCSRFToken()).rejects.toThrow(
        'CSRF token not found in response'
      )
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchCSRFToken()).rejects.toThrow('Network error')
    })
  })

  describe('getCSRFToken', () => {
    it('should return token from cookie if available', async () => {
      // Set cookie with CSRF token
      document.cookie = 'XSRF-TOKEN=cookie-csrf-token-456; path=/'

      const token = await getCSRFToken()

      expect(token).toBe('cookie-csrf-token-456')
      // Should not make fetch request if cookie token exists
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should fetch token if no cookie available', async () => {
      const token = await getCSRFToken()

      expect(mockFetch).toHaveBeenCalled()
      expect(token).toBe('mock-csrf-token-123')
    })

    it('should handle URL-encoded cookie values', async () => {
      // Set encoded cookie
      document.cookie = 'XSRF-TOKEN=encoded%2Btoken%3D123; path=/'

      const token = await getCSRFToken()

      expect(token).toBe('encoded+token=123')
    })

    it('should throw error if token unavailable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })

      await expect(getCSRFToken()).rejects.toThrow(
        'CSRF token fetch failed: 500 Server Error'
      )
    })
  })

  describe('refreshCSRFToken', () => {
    it('should clear cached token and fetch new one', async () => {
      // Set initial token
      await getCSRFToken()
      expect(hasCSRFToken()).toBe(true)

      // Mock new token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          token: 'refreshed-csrf-token-789'
        })
      })

      const newToken = await refreshCSRFToken()

      expect(newToken).toBe('refreshed-csrf-token-789')
      expect(mockFetch).toHaveBeenCalledTimes(2) // Initial + refresh
    })
  })

  describe('clearCSRFToken', () => {
    it('should clear cached CSRF token', async () => {
      // Set token first
      await getCSRFToken()
      expect(hasCSRFToken()).toBe(true)

      clearCSRFToken()

      expect(hasCSRFToken()).toBe(false)
    })
  })

  describe('hasCSRFToken', () => {
    it('should return false initially', () => {
      expect(hasCSRFToken()).toBe(false)
    })

    it('should return true after token is fetched', async () => {
      await getCSRFToken()
      expect(hasCSRFToken()).toBe(true)
    })

    it('should return false after token is cleared', async () => {
      await getCSRFToken()
      clearCSRFToken()
      expect(hasCSRFToken()).toBe(false)
    })
  })

  describe('initializeCSRF', () => {
    it('should initialize CSRF token on startup', async () => {
      await initializeCSRF()

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include'
      })
      expect(hasCSRFToken()).toBe(true)
    })

    it('should not throw error if initialization fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Should not throw
      await expect(initializeCSRF()).resolves.toBeUndefined()
      expect(hasCSRFToken()).toBe(false)
    })
  })

  describe('getCSRFHeaders', () => {
    it('should return headers with CSRF token', async () => {
      const headers = await getCSRFHeaders()

      expect(headers).toEqual({
        'X-CSRF-Token': 'mock-csrf-token-123',
        'Content-Type': 'application/json'
      })
    })

    it('should return basic headers if token fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const headers = await getCSRFHeaders()

      expect(headers).toEqual({
        'Content-Type': 'application/json'
      })
    })

    it('should use cached token if available', async () => {
      // Fetch token first
      await getCSRFToken()
      vi.clearAllMocks() // Clear previous calls

      const headers = await getCSRFHeaders()

      expect(headers).toEqual({
        'X-CSRF-Token': 'mock-csrf-token-123',
        'Content-Type': 'application/json'
      })
      // Should not make additional fetch calls
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Double-Submit Cookie Pattern', () => {
    it('should prefer cookie token over cached token', async () => {
      // First, cache a token from fetch
      await getCSRFToken()
      expect(hasCSRFToken()).toBe(true)

      // Then set a different cookie token
      document.cookie = 'XSRF-TOKEN=cookie-token-different; path=/'
      
      // Should return cookie token, not cached one
      const token = await getCSRFToken()
      expect(token).toBe('cookie-token-different')
    })

    it('should handle malformed cookie gracefully', async () => {
      // Set malformed cookie
      document.cookie = 'XSRF-TOKEN=; path=/'

      const token = await getCSRFToken()

      // Should fall back to fetch
      expect(mockFetch).toHaveBeenCalled()
      expect(token).toBe('mock-csrf-token-123')
    })

    it('should handle cookie parsing errors', async () => {
      // Mock document.cookie to throw an error
      Object.defineProperty(document, 'cookie', {
        get: () => {
          throw new Error('Cookie access denied')
        }
      })

      const token = await getCSRFToken()

      // Should fall back to fetch despite cookie error
      expect(token).toBe('mock-csrf-token-123')
    })
  })

  describe('Error Scenarios', () => {
    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      })

      await expect(fetchCSRFToken()).rejects.toThrow('Invalid JSON')
    })

    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204, // No content
        json: vi.fn().mockResolvedValue(null)
      })

      await expect(fetchCSRFToken()).rejects.toThrow()
    })

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      await expect(fetchCSRFToken()).rejects.toThrow(
        'CSRF token fetch failed: 429 Too Many Requests'
      )
    })

    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(fetchCSRFToken()).rejects.toThrow(
        'CSRF token fetch failed: 401 Unauthorized'
      )
    })
  })

  describe('Concurrent Requests', () => {
    it('should handle multiple simultaneous token requests', async () => {
      // Clear any cached tokens
      clearCSRFToken()

      // Make multiple concurrent requests
      const promises = [
        getCSRFToken(),
        getCSRFToken(),
        getCSRFToken()
      ]

      const tokens = await Promise.all(promises)

      // All should return the same token
      expect(tokens[0]).toBe('mock-csrf-token-123')
      expect(tokens[1]).toBe('mock-csrf-token-123')
      expect(tokens[2]).toBe('mock-csrf-token-123')
    })
  })
})
