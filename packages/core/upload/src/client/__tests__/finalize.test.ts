/**
 * Story 3.1.19: Finalize Client Tests
 *
 * Tests for finalizeSession API calls, error handling, and response parsing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { finalizeSession, FinalizeError, type FinalizeRequest } from '../finalize'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('finalizeSession', () => {
  const mockRequest: FinalizeRequest = {
    uploadSessionId: '123e4567-e89b-12d3-a456-426614174000',
    title: 'My Cool MOC',
    description: 'A great MOC',
    tags: ['technic', 'car'],
    theme: 'Technic',
  }

  let originalFetch: typeof global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('success responses', () => {
    it('should return success data on 201 response', async () => {
      const mockResponse = {
        data: {
          id: 'moc-123',
          title: 'My Cool MOC',
          slug: 'my-cool-moc',
          description: 'A great MOC',
          status: 'private',
          pdfKey: 'mocs/123/instruction.pdf',
          imageKeys: ['mocs/123/image1.jpg'],
          partsKeys: [],
          tags: ['technic', 'car'],
          theme: 'Technic',
          createdAt: '2024-01-01T00:00:00Z',
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'X-Request-Id': 'req-123' }),
        json: () => Promise.resolve(mockResponse),
      })

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('moc-123')
        expect(result.data.slug).toBe('my-cool-moc')
        expect(result.data.title).toBe('My Cool MOC')
      }
    })

    it('should return idempotent flag on 200 response', async () => {
      const mockResponse = {
        data: {
          id: 'moc-123',
          title: 'My Cool MOC',
          slug: 'my-cool-moc',
          description: null,
          status: 'private',
          pdfKey: 'mocs/123/instruction.pdf',
          imageKeys: [],
          partsKeys: [],
          tags: null,
          theme: null,
          createdAt: '2024-01-01T00:00:00Z',
          idempotent: true,
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve(mockResponse),
      })

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.idempotent).toBe(true)
      }
    })
  })

  describe('409 Conflict handling', () => {
    it('should return conflict error with suggestedSlug', async () => {
      const mockResponse = {
        success: false,
        error: {
          type: 'CONFLICT',
          message: 'A MOC with this title already exists',
        },
        details: {
          title: 'My Cool MOC',
          suggestedSlug: 'my-cool-moc-2',
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        headers: new Headers({ 'X-Request-Id': 'req-123' }),
        json: () => Promise.resolve(mockResponse),
      })

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(FinalizeError)
        expect(result.error.isConflict).toBe(true)
        expect(result.error.suggestedSlug).toBe('my-cool-moc-2')
        expect(result.error.httpStatus).toBe(409)
        expect(result.error.code).toBe('CONFLICT')
      }
    })

    it('should handle 409 without suggestedSlug', async () => {
      const mockResponse = {
        success: false,
        error: {
          type: 'CONFLICT',
          message: 'A MOC with this title already exists',
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        headers: new Headers(),
        json: () => Promise.resolve(mockResponse),
      })

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.isConflict).toBe(true)
        expect(result.error.suggestedSlug).toBeUndefined()
      }
    })
  })

  describe('429 Rate Limit handling', () => {
    it('should return rate limit error with retryAfterSeconds from header', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({
          'Retry-After': '120',
          'X-Request-Id': 'req-123',
        }),
        json: () =>
          Promise.resolve({
            success: false,
            error: {
              type: 'RATE_LIMIT',
              message: 'Too many requests',
            },
          }),
      })

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(FinalizeError)
        expect(result.error.isRateLimit).toBe(true)
        expect(result.error.retryAfterSeconds).toBe(120)
        expect(result.error.httpStatus).toBe(429)
        expect(result.error.code).toBe('RATE_LIMIT')
      }
    })

    it('should default to 60 seconds if Retry-After header is missing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            success: false,
            error: {
              type: 'RATE_LIMIT',
              message: 'Too many requests',
            },
          }),
      })

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.isRateLimit).toBe(true)
        expect(result.error.retryAfterSeconds).toBe(60)
      }
    })
  })

  describe('400 File Validation Error handling', () => {
    it('should return file validation errors', async () => {
      const mockResponse = {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'File validation failed',
          details: {
            files: [
              {
                fileId: 'file-1',
                filename: 'instructions.pdf',
                reason: 'magic-bytes',
                message: 'File content does not match PDF format',
              },
              {
                fileId: 'file-2',
                filename: 'image.jpg',
                reason: 'type',
                message: 'Unsupported image format',
              },
            ],
          },
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: () => Promise.resolve(mockResponse),
      })

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(FinalizeError)
        expect(result.error.hasFileErrors).toBe(true)
        expect(result.error.fileErrors).toHaveLength(2)
        expect(result.error.fileErrors![0].fileId).toBe('file-1')
        expect(result.error.fileErrors![0].reason).toBe('magic-bytes')
        expect(result.error.fileErrors![1].fileId).toBe('file-2')
        expect(result.error.fileErrors![1].reason).toBe('type')
        expect(result.error.code).toBe('FILE_VALIDATION_ERROR')
      }
    })

    it('should handle 400 without file errors as generic error', async () => {
      const mockResponse = {
        success: false,
        error: {
          type: 'BAD_REQUEST',
          message: 'Missing required field',
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: () => Promise.resolve(mockResponse),
      })

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.hasFileErrors).toBe(false)
        expect(result.error.code).toBe('BAD_REQUEST')
        expect(result.error.message).toBe('Missing required field')
      }
    })
  })

  describe('Network and other errors', () => {
    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(FinalizeError)
        expect(result.error.code).toBe('NETWORK_ERROR')
        expect(result.error.httpStatus).toBe(0)
      }
    })

    it('should handle abort errors', async () => {
      const abortError = new Error('AbortError')
      abortError.name = 'AbortError'
      global.fetch = vi.fn().mockRejectedValue(abortError)

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('CANCELED')
      }
    })

    it('should handle 500 server errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            success: false,
            error: {
              type: 'SERVER_ERROR',
              message: 'Internal server error',
            },
          }),
      })

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.httpStatus).toBe(500)
        expect(result.error.code).toBe('SERVER_ERROR')
      }
    })

    it('should handle 401 unauthorized errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            success: false,
            error: {
              type: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          }),
      })

      const result = await finalizeSession(mockRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.httpStatus).toBe(401)
        expect(result.error.code).toBe('UNAUTHORIZED')
      }
    })
  })

  describe('request configuration', () => {
    it('should send POST request with JSON body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            data: {
              id: 'moc-123',
              title: 'My Cool MOC',
              slug: 'my-cool-moc',
              description: null,
              status: 'private',
              pdfKey: '',
              imageKeys: [],
              partsKeys: [],
              tags: null,
              theme: null,
              createdAt: '2024-01-01T00:00:00Z',
            },
          }),
      })

      await finalizeSession(mockRequest)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/mocs/uploads/finalize'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify(mockRequest),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
        }),
      )
    })

    it('should include CSRF token if provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            data: {
              id: 'moc-123',
              title: 'My Cool MOC',
              slug: 'my-cool-moc',
              description: null,
              status: 'private',
              pdfKey: '',
              imageKeys: [],
              partsKeys: [],
              tags: null,
              theme: null,
              createdAt: '2024-01-01T00:00:00Z',
            },
          }),
      })

      await finalizeSession(mockRequest, { csrfToken: 'csrf-token-123' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': 'csrf-token-123',
          }),
        }),
      )
    })

    it('should use custom baseUrl if provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            data: {
              id: 'moc-123',
              title: 'My Cool MOC',
              slug: 'my-cool-moc',
              description: null,
              status: 'private',
              pdfKey: '',
              imageKeys: [],
              partsKeys: [],
              tags: null,
              theme: null,
              createdAt: '2024-01-01T00:00:00Z',
            },
          }),
      })

      await finalizeSession(mockRequest, { baseUrl: 'https://api.example.com' })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/mocs/uploads/finalize',
        expect.any(Object),
      )
    })
  })
})

describe('FinalizeError', () => {
  it('should have isConflict getter for 409 status', () => {
    const error = new FinalizeError('Conflict', 409, 'CONFLICT')
    expect(error.isConflict).toBe(true)
    expect(error.isRateLimit).toBe(false)
  })

  it('should have isRateLimit getter for 429 status', () => {
    const error = new FinalizeError('Rate limited', 429, 'RATE_LIMIT')
    expect(error.isRateLimit).toBe(true)
    expect(error.isConflict).toBe(false)
  })

  it('should have hasFileErrors getter when fileErrors present', () => {
    const error = new FinalizeError('Validation failed', 400, 'FILE_VALIDATION_ERROR', {
      fileErrors: [
        { fileId: 'file-1', filename: 'test.pdf', reason: 'magic-bytes', message: 'Invalid' },
      ],
    })
    expect(error.hasFileErrors).toBe(true)
  })

  it('should have hasFileErrors false when no fileErrors', () => {
    const error = new FinalizeError('Bad request', 400, 'BAD_REQUEST')
    expect(error.hasFileErrors).toBe(false)
  })
})
