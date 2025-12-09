/**
 * Complete File Handler Tests
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
  mockSessionFiles,
  mockSessionParts,
  SESSION_IDS,
  FILE_IDS,
} from '../../_shared/__tests__/fixtures'

// Mock S3 client
const mockS3Send = vi.fn()
vi.mock('@/core/storage/s3', () => ({
  getS3Client: vi.fn(() => Promise.resolve({ send: mockS3Send })),
}))

// Mock database
const mockDbSelect = vi.fn()
const mockDbUpdate = vi.fn()
vi.mock('@/core/database/client', () => ({
  getDbAsync: vi.fn(() =>
    Promise.resolve({
      select: mockDbSelect,
      update: mockDbUpdate,
    }),
  ),
}))

vi.mock('@/core/utils/env', () => ({
  getEnv: vi.fn(() => ({ STAGE: 'dev', S3_BUCKET: 'test-bucket', AWS_REGION: 'us-east-1' })),
}))

vi.mock('@/core/observability/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('complete-file handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set up query chain mocks for multiple select calls
    let queryCount = 0
    mockDbSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            queryCount++
            if (queryCount === 1) return Promise.resolve([mockSessions.activeSession])
            if (queryCount === 2) return Promise.resolve([mockSessionFiles.uploadingFile])
            return Promise.resolve([])
          }),
          orderBy: vi.fn(() => Promise.resolve([mockSessionParts.part1, mockSessionParts.part2])),
        })),
      })),
    })

    mockDbUpdate.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })

    // Mock S3 CompleteMultipartUpload response
    mockS3Send.mockResolvedValue({ Location: 'https://bucket.s3.amazonaws.com/file.pdf' })
  })

  describe('Authentication', () => {
    it('returns 401 when unauthenticated', async () => {
      const event = createUnauthorizedEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions/s1/files/f1/complete',
        pathParameters: { sessionId: 's1', fileId: 'f1' },
        body: validRequests.completeFile,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(401)
    })
  })

  describe('Request Validation', () => {
    it('returns 400 when sessionId is missing', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions//files/f1/complete',
        pathParameters: { fileId: 'f1' },
        body: validRequests.completeFile,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)
    })

    it('returns 400 when fileId is missing', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions/s1/files//complete',
        pathParameters: { sessionId: 's1' },
        body: validRequests.completeFile,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)
    })

    it('returns 400 when body is missing', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions/s1/files/f1/complete',
        pathParameters: { sessionId: 's1', fileId: 'f1' },
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)
    })

    it('returns 422 when parts array is invalid', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions/s1/files/f1/complete',
        pathParameters: { sessionId: 's1', fileId: 'f1' },
        body: { parts: [{ partNumber: 0, etag: '"abc"' }] },
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
        path: '/api/mocs/uploads/sessions/nonexistent/files/f1/complete',
        pathParameters: { sessionId: 'nonexistent', fileId: 'f1' },
        body: validRequests.completeFile,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(404)
    })
  })

  describe('Success Cases', () => {
    it('returns 200 with fileId and fileUrl on success', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: `/api/mocs/uploads/sessions/${SESSION_IDS.active}/files/${FILE_IDS.uploading}/complete`,
        pathParameters: { sessionId: SESSION_IDS.active, fileId: FILE_IDS.uploading },
        body: validRequests.completeFile,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      // Response structure: { data: { fileId, fileUrl } }
      expect(body.data.data).toHaveProperty('fileId')
      expect(body.data.data).toHaveProperty('fileUrl')
    })
  })
})

