import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { csrf } from '../middleware/csrf'

// Mock response object
const createMockResponse = () => {
  const res = {} as Response
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

// Mock request object
const createMockRequest = (overrides: Partial<Request> = {}): Request => {
  const req = {
    method: 'GET',
    get: vi.fn().mockReturnValue(undefined),
    cookies: {},
    ...overrides,
  } as unknown as Request
  return req
}

describe('CSRF Middleware', () => {
  let mockNext: NextFunction
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    mockNext = vi.fn()
    originalNodeEnv = process.env.NODE_ENV
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('Safe HTTP Methods', () => {
    it('should allow GET requests without CSRF validation', () => {
      const req = createMockRequest({ method: 'GET' })
      const res = createMockResponse()

      csrf(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it('should allow OPTIONS requests without CSRF validation', () => {
      const req = createMockRequest({ method: 'OPTIONS' })
      const res = createMockResponse()

      csrf(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it('should allow HEAD requests without CSRF validation', () => {
      const req = createMockRequest({ method: 'HEAD' })
      const res = createMockResponse()

      csrf(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('State-Changing HTTP Methods', () => {
    const statChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

    statChangingMethods.forEach(method => {
      describe(`${method} requests`, () => {
        it(`should reject ${method} requests without CSRF tokens`, () => {
          const req = createMockRequest({
            method,
            get: vi.fn().mockReturnValue(undefined),
            cookies: {},
          })
          const res = createMockResponse()

          csrf(req, res, mockNext)

          expect(res.status).toHaveBeenCalledWith(403)
          expect(res.json).toHaveBeenCalledWith({
            success: false,
            code: 'CSRF_FAILED',
            message: 'CSRF validation failed',
          })
          expect(mockNext).not.toHaveBeenCalled()
        })

        it(`should reject ${method} requests with missing cookie token`, () => {
          const req = createMockRequest({
            method,
            get: vi.fn().mockReturnValue('header-token'),
            cookies: {},
          })
          const res = createMockResponse()

          csrf(req, res, mockNext)

          expect(res.status).toHaveBeenCalledWith(403)
          expect(res.json).toHaveBeenCalledWith({
            success: false,
            code: 'CSRF_FAILED',
            message: 'CSRF validation failed',
          })
          expect(mockNext).not.toHaveBeenCalled()
        })

        it(`should reject ${method} requests with missing header token`, () => {
          const req = createMockRequest({
            method,
            get: vi.fn().mockReturnValue(undefined),
            cookies: { 'XSRF-TOKEN': 'cookie-token' },
          })
          const res = createMockResponse()

          csrf(req, res, mockNext)

          expect(res.status).toHaveBeenCalledWith(403)
          expect(res.json).toHaveBeenCalledWith({
            success: false,
            code: 'CSRF_FAILED',
            message: 'CSRF validation failed',
          })
          expect(mockNext).not.toHaveBeenCalled()
        })

        it(`should reject ${method} requests with mismatched tokens`, () => {
          const req = createMockRequest({
            method,
            get: vi.fn().mockReturnValue('different-header-token'),
            cookies: { 'XSRF-TOKEN': 'cookie-token' },
          })
          const res = createMockResponse()

          csrf(req, res, mockNext)

          expect(res.status).toHaveBeenCalledWith(403)
          expect(res.json).toHaveBeenCalledWith({
            success: false,
            code: 'CSRF_FAILED',
            message: 'CSRF validation failed',
          })
          expect(mockNext).not.toHaveBeenCalled()
        })

        it(`should allow ${method} requests with matching tokens`, () => {
          const token = 'valid-csrf-token'
          const req = createMockRequest({
            method,
            get: vi.fn().mockReturnValue(token),
            cookies: { 'XSRF-TOKEN': token },
          })
          const res = createMockResponse()

          csrf(req, res, mockNext)

          expect(mockNext).toHaveBeenCalledOnce()
          expect(res.status).not.toHaveBeenCalled()
          expect(res.json).not.toHaveBeenCalled()
        })
      })
    })
  })

  describe('Origin Validation in Production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      process.env.APP_ORIGIN = 'https://example.com'
      process.env.FRONTEND_URL = 'https://frontend.com'
    })

    it('should reject requests from invalid origins in production', () => {
      const req = createMockRequest({
        method: 'POST',
        get: vi.fn((header: string) => {
          if (header === 'origin') return 'https://malicious.com'
          if (header === 'x-csrf-token') return 'token'
          return undefined
        }) as any,
        cookies: { 'XSRF-TOKEN': 'token' },
      })
      const res = createMockResponse()

      csrf(req, res, mockNext)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        code: 'CSRF_FAILED',
        message: 'Invalid origin',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow requests from valid APP_ORIGIN in production', () => {
      const token = 'valid-token'
      const req = createMockRequest({
        method: 'POST',
        get: vi.fn((header: string) => {
          if (header === 'origin') return 'https://example.com'
          if (header === 'x-csrf-token') return token
          return undefined
        }) as any,
        cookies: { 'XSRF-TOKEN': token },
      })
      const res = createMockResponse()

      csrf(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it('should allow requests from valid FRONTEND_URL in production', () => {
      const token = 'valid-token'
      const req = createMockRequest({
        method: 'POST',
        get: vi.fn((header: string) => {
          if (header === 'origin') return 'https://frontend.com'
          if (header === 'x-csrf-token') return token
          return undefined
        }) as any,
        cookies: { 'XSRF-TOKEN': token },
      })
      const res = createMockResponse()

      csrf(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it('should allow requests from localhost in production', () => {
      const token = 'valid-token'
      const req = createMockRequest({
        method: 'POST',
        get: vi.fn((header: string) => {
          if (header === 'origin') return 'http://localhost:5173'
          if (header === 'x-csrf-token') return token
          return undefined
        }) as any,
        cookies: { 'XSRF-TOKEN': token },
      })
      const res = createMockResponse()

      csrf(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it('should allow requests with no origin header in production', () => {
      const token = 'valid-token'
      const req = createMockRequest({
        method: 'POST',
        get: vi.fn((header: string) => {
          if (header === 'origin') return ''
          if (header === 'referer') return ''
          if (header === 'x-csrf-token') return token
          return undefined
        }) as any,
        cookies: { 'XSRF-TOKEN': token },
      })
      const res = createMockResponse()

      csrf(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('Development Mode Origin Handling', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should skip origin validation in development mode', () => {
      const token = 'valid-token'
      const req = createMockRequest({
        method: 'POST',
        get: vi.fn((header: string) => {
          if (header === 'origin') return 'https://any-origin.com'
          if (header === 'x-csrf-token') return token
          return undefined
        }) as any,
        cookies: { 'XSRF-TOKEN': token },
      })
      const res = createMockResponse()

      csrf(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('Case Insensitive Method Handling', () => {
    it('should handle lowercase method names', () => {
      const token = 'valid-token'
      const req = createMockRequest({
        method: 'post', // lowercase
        get: vi.fn().mockReturnValue(token),
        cookies: { 'XSRF-TOKEN': token },
      })
      const res = createMockResponse()

      csrf(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should handle mixed case method names', () => {
      const token = 'valid-token'
      const req = createMockRequest({
        method: 'PaTcH', // mixed case
        get: vi.fn().mockReturnValue(token),
        cookies: { 'XSRF-TOKEN': token },
      })
      const res = createMockResponse()

      csrf(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
    })
  })
})
