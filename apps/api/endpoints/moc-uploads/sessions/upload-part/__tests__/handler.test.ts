/**
 * Upload Part Handler Tests
 *
 * Story 3.1.27: Deploy Multipart Upload Session Endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../handler'
import {
  createMockEvent,
  createUnauthorizedEvent,
  mockSessions,
  mockSessionFiles,
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
const mockDbInsert = vi.fn()
const mockDbUpdate = vi.fn()
vi.mock('@/core/database/client', () => ({
  getDbAsync: vi.fn(() =>
    Promise.resolve({
      select: mockDbSelect,
      insert: mockDbInsert,
      update: mockDbUpdate,
    }),
  ),
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

describe('upload-part handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set up query chain mocks
    let queryCount = 0
    mockDbSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            queryCount++
            // First query returns session, second returns file
            if (queryCount === 1) return Promise.resolve([mockSessions.activeSession])
            return Promise.resolve([mockSessionFiles.pendingFile])
          }),
        })),
      })),
    })

    mockDbInsert.mockReturnValue({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => Promise.resolve()),
      })),
    })

    mockDbUpdate.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })

    // Mock S3 UploadPart response
    mockS3Send.mockResolvedValue({ ETag: '"abc123"' })
  })

  describe('Authentication', () => {
    it('returns 401 when unauthenticated', async () => {
      const event = createUnauthorizedEvent({
        method: 'PUT',
        path: '/api/mocs/uploads/sessions/s1/files/f1/parts/1',
        pathParameters: { sessionId: 's1', fileId: 'f1', partNumber: '1' },
        body: Buffer.from('test data').toString('base64'),
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(401)
    })
  })

  describe('Request Validation', () => {
    it('returns 400 when sessionId is missing', async () => {
      const event = createMockEvent({
        method: 'PUT',
        path: '/api/mocs/uploads/sessions//files/f1/parts/1',
        pathParameters: { fileId: 'f1', partNumber: '1' },
        body: 'test data',
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)
    })

    it('returns 400 when fileId is missing', async () => {
      const event = createMockEvent({
        method: 'PUT',
        path: '/api/mocs/uploads/sessions/s1/files//parts/1',
        pathParameters: { sessionId: 's1', partNumber: '1' },
        body: 'test data',
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)
    })

    it('returns 400 when partNumber is invalid', async () => {
      const event = createMockEvent({
        method: 'PUT',
        path: '/api/mocs/uploads/sessions/s1/files/f1/parts/0',
        pathParameters: { sessionId: 's1', fileId: 'f1', partNumber: '0' },
        body: 'test data',
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.error.message).toContain('positive integer')
    })

    it('returns 400 when body is empty', async () => {
      const event = createMockEvent({
        method: 'PUT',
        path: '/api/mocs/uploads/sessions/s1/files/f1/parts/1',
        pathParameters: { sessionId: 's1', fileId: 'f1', partNumber: '1' },
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)
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
        method: 'PUT',
        path: '/api/mocs/uploads/sessions/nonexistent/files/f1/parts/1',
        pathParameters: { sessionId: 'nonexistent', fileId: 'f1', partNumber: '1' },
        body: 'test data',
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(404)
    })
  })

  describe('Success Cases', () => {
    it('returns 200 with partNumber and etag on success', async () => {
      const event = {
        ...createMockEvent({
          method: 'PUT',
          path: `/api/mocs/uploads/sessions/${SESSION_IDS.active}/files/${FILE_IDS.pending}/parts/1`,
          pathParameters: { sessionId: SESSION_IDS.active, fileId: FILE_IDS.pending, partNumber: '1' },
        }),
        body: Buffer.from('test chunk data').toString('base64'),
        isBase64Encoded: true,
      }

      const response = await handler(event as any)
      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      // Response structure: { data: { partNumber, etag } }
      expect(body.data.data).toHaveProperty('partNumber')
      expect(body.data.data).toHaveProperty('etag')
      expect(body.data.data.partNumber).toBe(1)
      expect(body.data.data.etag).toBe('"abc123"')
    })
  })
})

