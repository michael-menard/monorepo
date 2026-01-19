/**
 * Register File Handler Tests
 *
 * Story 3.1.27: Deploy Multipart Upload Session Endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../handler'
import {
  createMockEvent,
  createUnauthorizedEvent,
  validRequests,
  mockSessions,
  SESSION_IDS,
} from '../../_shared/__tests__/fixtures'

// Mock S3 client
const mockS3Send = vi.fn()
vi.mock('@/core/storage/s3', () => ({
  getS3Client: vi.fn(() => Promise.resolve({ send: mockS3Send })),
}))

// Mock database
const mockDbSelect = vi.fn()
const mockDbInsert = vi.fn()
vi.mock('@/core/database/client', () => ({
  getDbAsync: vi.fn(() =>
    Promise.resolve({
      select: mockDbSelect,
      insert: mockDbInsert,
    }),
  ),
}))

vi.mock('@/core/config/upload', () => ({
  getUploadConfig: vi.fn(() => ({
    pdfMaxBytes: 50 * 1024 * 1024,
    partsListMaxBytes: 5 * 1024 * 1024,
    imageMaxBytes: 10 * 1024 * 1024,
  })),
  isMimeTypeAllowed: vi.fn(() => true),
  getAllowedMimeTypes: vi.fn(() => ['application/pdf']),
}))

vi.mock('@/core/utils/env', () => ({
  getEnv: vi.fn(() => ({ STAGE: 'dev', S3_BUCKET: 'test-bucket' })),
}))

vi.mock('@/core/observability/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('register-file handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: session exists and is active
    mockDbSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockSessions.activeSession])),
        })),
      })),
    })

    mockDbInsert.mockReturnValue({
      values: vi.fn(() => Promise.resolve()),
    })

    // Mock S3 CreateMultipartUpload response
    mockS3Send.mockResolvedValue({ UploadId: 'upload-id-123' })
  })

  describe('Authentication', () => {
    it('returns 401 when unauthenticated', async () => {
      const event = createUnauthorizedEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions/session-123/files',
        pathParameters: { sessionId: 'session-123' },
        body: validRequests.registerFile,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(401)
    })
  })

  describe('Request Validation', () => {
    it('returns 400 when sessionId is missing', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions//files',
        pathParameters: {},
        body: validRequests.registerFile,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)
    })

    it('returns 400 when body is missing', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions/session-123/files',
        pathParameters: { sessionId: 'session-123' },
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)
    })

    it('returns 422 when body is invalid', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions/session-123/files',
        pathParameters: { sessionId: 'session-123' },
        body: { category: 'invalid' },
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(422) // ValidationError
    })
  })

  describe('Session Validation', () => {
    it('returns 404 when session not found', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })

      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions/nonexistent/files',
        pathParameters: { sessionId: 'nonexistent' },
        body: validRequests.registerFile,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(404)
    })

    it('returns 400 when session is expired', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([mockSessions.expiredSession])),
          })),
        })),
      })

      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions/session-expired/files',
        pathParameters: { sessionId: 'session-expired' },
        body: validRequests.registerFile,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.error.message).toContain('expired')
    })
  })

  describe('Success Cases', () => {
    it('returns 201 with fileId and uploadId on success', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: `/api/mocs/uploads/sessions/${SESSION_IDS.active}/files`,
        pathParameters: { sessionId: SESSION_IDS.active },
        body: validRequests.registerFile,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      // Response structure: { data: { fileId, uploadId } }
      expect(body.data.data).toHaveProperty('fileId')
      expect(body.data.data).toHaveProperty('uploadId')
      expect(body.data.data.uploadId).toBe('upload-id-123')
    })
  })
})

