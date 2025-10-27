import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchCSRFToken,
  getCSRFToken,
  refreshCSRFToken,
  clearCSRFToken,
  hasCSRFToken,
  initializeCSRF,
  getCSRFHeaders,
  isCSRFError,
} from '../csrf'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
})

describe('CSRF Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCSRFToken()
    document.cookie = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchCSRFToken', () => {
    it('should fetch CSRF token successfully', async () => {
      const mockToken = 'test-csrf-token-123'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: mockToken }),
      })

      const token = await fetchCSRFToken()

      expect(token).toBe(mockToken)
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/csrf'), {
        method: 'GET',
        credentials: 'include',
      })
    })

    it('should use custom base URL when provided', async () => {
      const mockToken = 'test-csrf-token-123'
      const customBaseUrl = 'https://api.example.com'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: mockToken }),
      })

      await fetchCSRFToken(customBaseUrl)

      expect(mockFetch).toHaveBeenCalledWith(`${customBaseUrl}/api/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
      })
    })

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(fetchCSRFToken()).rejects.toThrow(
        'CSRF token fetch failed: 500 Internal Server Error',
      )
    })

    it('should throw error when token is missing from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await expect(fetchCSRFToken()).rejects.toThrow('CSRF token not found in response')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchCSRFToken()).rejects.toThrow('Network error')
    })
  })

  describe('getCSRFToken', () => {
    it('should return token from cookie when available', async () => {
      const mockToken = 'cookie-csrf-token'
      document.cookie = `XSRF-TOKEN=${encodeURIComponent(mockToken)}`

      const token = await getCSRFToken()

      expect(token).toBe(mockToken)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should fetch token when not in cookie', async () => {
      const mockToken = 'fetched-csrf-token'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: mockToken }),
      })

      const token = await getCSRFToken()

      expect(token).toBe(mockToken)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should handle malformed cookie gracefully', async () => {
      document.cookie = 'XSRF-TOKEN=invalid%cookie'
      const mockToken = 'fetched-csrf-token'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: mockToken }),
      })

      const token = await getCSRFToken()

      expect(token).toBe(mockToken)
    })
  })

  describe('refreshCSRFToken', () => {
    it('should clear cached token and fetch new one', async () => {
      const mockToken = 'new-csrf-token'

      // First set a token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'old-token' }),
      })
      await fetchCSRFToken()

      // Then refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: mockToken }),
      })

      const token = await refreshCSRFToken()

      expect(token).toBe(mockToken)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('clearCSRFToken', () => {
    it('should clear the cached token', async () => {
      // Set a token first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      })
      await fetchCSRFToken()
      expect(hasCSRFToken()).toBe(true)

      clearCSRFToken()
      expect(hasCSRFToken()).toBe(false)
    })
  })

  describe('hasCSRFToken', () => {
    it('should return false initially', () => {
      expect(hasCSRFToken()).toBe(false)
    })

    it('should return true after fetching token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      })

      await fetchCSRFToken()
      expect(hasCSRFToken()).toBe(true)
    })
  })

  describe('initializeCSRF', () => {
    it('should initialize CSRF token successfully', async () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'init-token' }),
      })

      await initializeCSRF()

      expect(consoleSpy).toHaveBeenCalledWith('CSRF initialized successfully')
      expect(hasCSRFToken()).toBe(true)

      consoleSpy.mockRestore()
    })

    it('should handle initialization errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockRejectedValueOnce(new Error('Init failed'))

      await initializeCSRF()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize CSRF:', expect.any(Error))
      expect(hasCSRFToken()).toBe(false)

      consoleSpy.mockRestore()
    })
  })

  describe('getCSRFHeaders', () => {
    it('should return headers with CSRF token', async () => {
      const mockToken = 'header-csrf-token'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: mockToken }),
      })

      const headers = await getCSRFHeaders()

      expect(headers).toEqual({
        'X-CSRF-Token': mockToken,
      })
    })

    it('should return empty headers when token fetch fails', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockFetch.mockRejectedValueOnce(new Error('Token fetch failed'))

      const headers = await getCSRFHeaders()

      expect(headers).toEqual({})
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get CSRF token for headers:',
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })
  })

  describe('isCSRFError', () => {
    it('should identify CSRF errors correctly', () => {
      const csrfError = {
        status: 403,
        data: { code: 'CSRF_FAILED' },
      }

      expect(isCSRFError(csrfError)).toBe(true)
    })

    it('should identify CSRF errors by message', () => {
      const csrfError = {
        status: 403,
        data: { message: 'CSRF validation failed' },
      }

      expect(isCSRFError(csrfError)).toBe(true)
    })

    it('should return false for non-CSRF errors', () => {
      const regularError = {
        status: 400,
        data: { message: 'Bad request' },
      }

      expect(isCSRFError(regularError)).toBe(false)
    })

    it('should return false for non-403 errors', () => {
      const serverError = {
        status: 500,
        data: { code: 'CSRF_FAILED' },
      }

      expect(isCSRFError(serverError)).toBe(false)
    })

    it('should handle undefined/null errors', () => {
      expect(isCSRFError(undefined)).toBe(false)
      expect(isCSRFError(null)).toBe(false)
    })
  })
})
