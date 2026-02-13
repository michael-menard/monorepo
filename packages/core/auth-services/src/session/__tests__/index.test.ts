import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '@repo/logger'

import {
  setAuthSession,
  refreshAuthSession,
  clearAuthSession,
  getSessionStatus,
} from '../index'

const MOCK_BASE_URL = 'https://api.example.com'
const MOCK_ID_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test-token'

// Mock import.meta.env
vi.stubEnv('VITE_SERVERLESS_API_BASE_URL', MOCK_BASE_URL)

describe('session service', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.stubEnv('VITE_SERVERLESS_API_BASE_URL', MOCK_BASE_URL)
  })

  describe('setAuthSession', () => {
    it('sends POST with idToken and returns session response', async () => {
      const mockResponse = { success: true, message: 'Session created', user: { userId: 'u1' } }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await setAuthSession(MOCK_ID_TOKEN)

      expect(mockFetch).toHaveBeenCalledWith(`${MOCK_BASE_URL}/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken: MOCK_ID_TOKEN }),
      })
      expect(result).toEqual(mockResponse)
      expect(logger.debug).toHaveBeenCalledWith('Auth session set successfully')
    })

    it('throws on 401 error response', async () => {
      const errorResponse = { error: 'Unauthorized', message: 'Invalid token' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(errorResponse),
      })

      await expect(setAuthSession(MOCK_ID_TOKEN)).rejects.toThrow('Invalid token')
      expect(logger.error).toHaveBeenCalledWith('Failed to set auth session:', errorResponse)
    })

    it('throws on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(setAuthSession(MOCK_ID_TOKEN)).rejects.toThrow('Network error')
      expect(logger.error).toHaveBeenCalledWith('Session sync failed:', expect.any(Error))
    })

    it('sends credentials: include for httpOnly cookie support', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'OK' }),
      })

      await setAuthSession(MOCK_ID_TOKEN)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'include' }),
      )
    })
  })

  describe('refreshAuthSession', () => {
    it('sends POST to refresh endpoint and returns response', async () => {
      const mockResponse = { success: true, message: 'Session refreshed' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await refreshAuthSession(MOCK_ID_TOKEN)

      expect(mockFetch).toHaveBeenCalledWith(`${MOCK_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken: MOCK_ID_TOKEN }),
      })
      expect(result).toEqual(mockResponse)
      expect(logger.debug).toHaveBeenCalledWith('Auth session refreshed successfully')
    })

    it('throws on error response', async () => {
      const errorResponse = { error: 'Forbidden', message: 'Token expired' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(errorResponse),
      })

      await expect(refreshAuthSession(MOCK_ID_TOKEN)).rejects.toThrow('Token expired')
      expect(logger.error).toHaveBeenCalledWith('Failed to refresh auth session:', errorResponse)
    })

    it('throws on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      await expect(refreshAuthSession(MOCK_ID_TOKEN)).rejects.toThrow('Connection refused')
      expect(logger.error).toHaveBeenCalledWith('Session refresh failed:', expect.any(Error))
    })
  })

  describe('clearAuthSession', () => {
    it('sends POST to logout endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await clearAuthSession()

      expect(mockFetch).toHaveBeenCalledWith(`${MOCK_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      expect(logger.debug).toHaveBeenCalledWith('Auth session cleared successfully')
    })

    it('logs warning but does not throw on error response', async () => {
      const errorResponse = { error: 'ServerError', message: 'Logout failed' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(errorResponse),
      })

      await expect(clearAuthSession()).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalledWith('Backend logout may have failed:', errorResponse)
    })

    it('logs warning but does not throw on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(clearAuthSession()).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalledWith(
        'Session clear request failed:',
        expect.any(Error),
      )
    })
  })

  describe('getSessionStatus', () => {
    it('returns authenticated status with user info', async () => {
      const mockData = { authenticated: true, user: { userId: 'u1', email: 'user@test.com' } }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      })

      const result = await getSessionStatus()

      expect(mockFetch).toHaveBeenCalledWith(`${MOCK_BASE_URL}/auth/status`, {
        method: 'GET',
        credentials: 'include',
      })
      expect(result).toEqual(mockData)
    })

    it('returns unauthenticated status', async () => {
      const mockData = { authenticated: false }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      })

      const result = await getSessionStatus()

      expect(result).toEqual({ authenticated: false })
    })

    it('returns unauthenticated on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getSessionStatus()

      expect(result).toEqual({ authenticated: false })
      expect(logger.error).toHaveBeenCalledWith(
        'Session status check failed:',
        expect.any(Error),
      )
    })
  })

  describe('environment variable handling', () => {
    it('throws when VITE_SERVERLESS_API_BASE_URL is not set', async () => {
      vi.stubEnv('VITE_SERVERLESS_API_BASE_URL', '')

      await expect(setAuthSession(MOCK_ID_TOKEN)).rejects.toThrow(
        'VITE_SERVERLESS_API_BASE_URL environment variable is required',
      )
    })
  })

  describe('request headers', () => {
    it('sends Content-Type: application/json for setAuthSession', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'OK' }),
      })

      await setAuthSession(MOCK_ID_TOKEN)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })

    it('sends Content-Type: application/json for refreshAuthSession', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'OK' }),
      })

      await refreshAuthSession(MOCK_ID_TOKEN)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })
  })

  describe('edge cases', () => {
    it('handles empty token string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'OK' }),
      })

      await setAuthSession('')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ idToken: '' }),
        }),
      )
    })

    it('handles malformed backend response gracefully in getSessionStatus', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ unexpected: 'data' }),
      })

      const result = await getSessionStatus()

      // Zod parse will fail, caught by try/catch, returns unauthenticated
      expect(result).toEqual({ authenticated: false })
    })
  })
})
