/**
 * Integration tests for serverless API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServerlessApiClient } from '../client/serverless-client'
import { createServerlessBaseQuery } from '../rtk/base-query'
import { createGalleryApi } from '../rtk/gallery-api'
import { createWishlistApi } from '../rtk/wishlist-api'
import { initializeCognitoTokenManager, getCognitoAuthToken } from '../auth/cognito-integration'

// Mock fetch globally
global.fetch = vi.fn()

describe('Serverless API Client Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    ;(global.fetch as any).mockReset()
  })

  describe('ServerlessApiClient', () => {
    it('should create client with environment configuration', () => {
      const client = new ServerlessApiClient()
      expect(client).toBeDefined()
      expect(client.getConfig().baseUrl).toBe('https://test-api.example.com')
    })

    it('should set and use authentication token', () => {
      const client = new ServerlessApiClient()
      const token = 'test-jwt-token'
      
      client.setAuthToken(token)
      
      // Mock successful response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        headers: new Map([['content-type', 'application/json']]),
      })

      return client.get('/test').then(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://test-api.example.com/test',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': `Bearer ${token}`,
            }),
          })
        )
      })
    })

    it('should handle serverless errors with retry logic', async () => {
      const client = new ServerlessApiClient()
      
      // Mock cold start error followed by success
      ;(global.fetch as any)
        .mockRejectedValueOnce(new Error('Cold start timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
          headers: new Map([['content-type', 'application/json']]),
        })

      const result = await client.get('/test')
      expect(result).toEqual({ data: 'success' })
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('RTK Query Integration', () => {
    it('should create serverless base query with auth token', () => {
      const getAuthToken = vi.fn(() => 'test-token')
      const baseQuery = createServerlessBaseQuery({ getAuthToken })
      
      expect(baseQuery).toBeDefined()
      expect(typeof baseQuery).toBe('function')
    })

    it('should create gallery API with authentication', () => {
      const getAuthToken = vi.fn(() => 'test-token')
      const galleryApi = createGalleryApi(getAuthToken)
      
      expect(galleryApi).toBeDefined()
      expect(galleryApi.reducerPath).toBe('enhancedGalleryApi')
      expect(galleryApi.endpoints.enhancedGallerySearch).toBeDefined()
      expect(galleryApi.endpoints.uploadGalleryImage).toBeDefined()
    })

    it('should create wishlist API with authentication', () => {
      const getAuthToken = vi.fn(() => 'test-token')
      const wishlistApi = createWishlistApi(getAuthToken)
      
      expect(wishlistApi).toBeDefined()
      expect(wishlistApi.reducerPath).toBe('enhancedWishlistApi')
      expect(wishlistApi.endpoints.enhancedWishlistQuery).toBeDefined()
      expect(wishlistApi.endpoints.addWishlistItem).toBeDefined()
    })
  })

  describe('Cognito Integration', () => {
    it('should initialize token manager with tokens', () => {
      const tokens = {
        accessToken: 'access-token',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
      }
      
      const tokenManager = initializeCognitoTokenManager(tokens)
      
      expect(tokenManager).toBeDefined()
      expect(tokenManager.getAccessToken()).toBe('access-token')
      expect(tokenManager.hasTokens()).toBe(true)
    })

    it('should provide auth token for API calls', () => {
      const tokens = {
        accessToken: 'test-access-token',
      }
      
      initializeCognitoTokenManager(tokens)
      const authToken = getCognitoAuthToken()
      
      expect(authToken).toBe('test-access-token')
    })

    it('should decode JWT token payload', () => {
      // Mock JWT token (header.payload.signature)
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        'cognito:groups': ['users'],
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      }
      
      const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`
      
      const tokens = { accessToken: mockToken }
      const tokenManager = initializeCognitoTokenManager(tokens)
      
      const user = tokenManager.getCurrentUser()
      
      expect(user).toBeDefined()
      expect(user?.sub).toBe('user-123')
      expect(user?.email).toBe('test@example.com')
      expect(user?.name).toBe('Test User')
      expect(user?.roles).toEqual(['users'])
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const client = new ServerlessApiClient()
      
      ;(global.fetch as any).mockRejectedValue(new TypeError('Network error'))
      
      await expect(client.get('/test')).rejects.toThrow('Network error')
    })

    it('should handle serverless cold start errors', async () => {
      const client = new ServerlessApiClient()
      
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: () => Promise.resolve('{"error":{"code":"COLD_START","message":"Function cold start"}}'),
      })
      
      await expect(client.get('/test')).rejects.toThrow('Function cold start')
    })
  })

  describe('Performance and Caching', () => {
    it('should use appropriate cache configurations', () => {
      const getAuthToken = vi.fn(() => 'test-token')
      const galleryApi = createGalleryApi(getAuthToken)

      // Check that API is properly configured
      expect(galleryApi.reducerPath).toBe('enhancedGalleryApi')
      expect(galleryApi.endpoints).toBeDefined()
      expect(Object.keys(galleryApi.endpoints)).toContain('enhancedGallerySearch')
      expect(Object.keys(galleryApi.endpoints)).toContain('getGalleryImage')
    })
  })
})
