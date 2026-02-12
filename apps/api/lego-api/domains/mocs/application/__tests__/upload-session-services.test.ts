/**
 * Upload Session Service Unit Tests - INST-1105
 *
 * Tests business logic for presigned upload sessions:
 * - createUploadSession: AC31-AC48
 * - completeUploadSession: AC49-AC65
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createUploadSessionService } from '../services.js'
import type {
  MocRepository,
  UploadSessionRepository,
  S3StoragePort,
  UploadSession,
  MocWithFiles,
  MocFile,
} from '../../ports/index.js'
import type { CreateUploadSessionRequest } from '../../types.js'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock crypto.randomUUID
const mockSessionId = '550e8400-e29b-41d4-a716-446655440000'
vi.stubGlobal(
  'crypto',
  Object.assign({}, crypto, {
    randomUUID: vi.fn(() => mockSessionId),
  }),
)

// Test data constants
const TEST_USER_ID = 'user-123'
const TEST_MOC_ID = '123e4567-e89b-12d3-a456-426614174000'
const TEST_S3_BUCKET = 'test-bucket'
const TEST_CLOUDFRONT_DOMAIN = 'test.cloudfront.net'

// File size constants (matching services.ts)
const MIN_PRESIGNED_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_PRESIGNED_SIZE = 50 * 1024 * 1024 // 50MB

// Valid test request (15MB PDF)
const validCreateRequest: CreateUploadSessionRequest = {
  filename: 'castle-instructions.pdf',
  fileSize: 15 * 1024 * 1024, // 15MB - valid size
  fileType: 'application/pdf',
}

// Mock MOC data
const mockMoc: MocWithFiles = {
  id: TEST_MOC_ID,
  userId: TEST_USER_ID,
  title: 'Castle MOC',
  description: 'A detailed medieval castle MOC',
  theme: 'Castle',
  tags: ['castle', 'medieval'],
  slug: 'castle-moc',
  type: 'moc',
  thumbnailUrl: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-02T00:00:00Z'),
  files: [],
  totalPieceCount: 1500,
}

// Mock upload session data
const mockSession: UploadSession = {
  id: mockSessionId,
  userId: TEST_USER_ID,
  mocInstructionId: TEST_MOC_ID,
  status: 'pending',
  partSizeBytes: validCreateRequest.fileSize,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
  originalFilename: validCreateRequest.filename,
  originalFileSize: validCreateRequest.fileSize,
  s3Key: `dev/moc-instructions/${TEST_USER_ID}/${TEST_MOC_ID}/instructions/${mockSessionId}-castle-instructions.pdf`,
  createdAt: new Date(),
  updatedAt: new Date(),
  finalizedAt: null,
  finalizingAt: null,
}

// Mock MocFile for completeUploadSession
const mockMocFile: MocFile = {
  id: 'file-new-1',
  mocId: TEST_MOC_ID,
  fileType: 'instruction',
  fileUrl: `https://${TEST_CLOUDFRONT_DOMAIN}/dev/moc-instructions/${TEST_USER_ID}/${TEST_MOC_ID}/instructions/${mockSessionId}-castle-instructions.pdf`,
  originalFilename: validCreateRequest.filename,
  mimeType: 'application/pdf',
  s3Key: `dev/moc-instructions/${TEST_USER_ID}/${TEST_MOC_ID}/instructions/${mockSessionId}-castle-instructions.pdf`,
  createdAt: new Date(),
  updatedAt: null,
}

// Factory for mock dependencies
function createMockDeps() {
  const mocRepo: MocRepository = {
    create: vi.fn(),
    findBySlug: vi.fn(),
    getMocById: vi.fn().mockResolvedValue(mockMoc),
    list: vi.fn(),
    updateMoc: vi.fn(),
    updateThumbnail: vi.fn(),
    getFileByIdAndMocId: vi.fn(),
  }

  const sessionRepo: UploadSessionRepository = {
    create: vi.fn().mockResolvedValue(mockSession),
    findById: vi.fn().mockResolvedValue(mockSession),
    findByIdAndUserId: vi.fn().mockResolvedValue(mockSession),
    markCompleted: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(undefined),
  }

  const s3Storage: S3StoragePort = {
    generatePresignedPutUrl: vi
      .fn()
      .mockResolvedValue('https://test-bucket.s3.amazonaws.com/presigned-put-url'),
    headObject: vi.fn().mockResolvedValue({
      ok: true,
      data: { contentLength: validCreateRequest.fileSize, contentType: 'application/pdf' },
    }),
    getPublicUrl: vi.fn().mockReturnValue(`https://${TEST_S3_BUCKET}.s3.amazonaws.com/test-key`),
  }

  const checkRateLimit = vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 99,
    currentCount: 1,
    limit: 100,
  })

  const incrementRateLimit = vi.fn().mockResolvedValue(undefined)

  const insertMocFile = vi.fn().mockResolvedValue(mockMocFile)

  return {
    mocRepo,
    sessionRepo,
    s3Storage,
    checkRateLimit,
    incrementRateLimit,
    insertMocFile,
    s3Bucket: TEST_S3_BUCKET,
    cloudfrontDomain: TEST_CLOUDFRONT_DOMAIN,
    presignTtlSeconds: 900,
  }
}

describe('UploadSessionService - INST-1105', () => {
  let deps: ReturnType<typeof createMockDeps>
  let service: ReturnType<typeof createUploadSessionService>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
    process.env.STAGE = 'dev'
    deps = createMockDeps()
    service = createUploadSessionService(deps)
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.STAGE
  })

  // ─────────────────────────────────────────────────────────────────────────
  // createUploadSession Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('createUploadSession', () => {
    describe('Happy Path', () => {
      it('AC47: creates session and returns presigned URL with valid request', async () => {
        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          validCreateRequest,
        )

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.sessionId).toBe(mockSessionId)
          expect(result.data.presignedUrl).toContain('https://')
          expect(result.data.expiresAt).toBeDefined()
          // Verify expiresAt is ~15 minutes from now
          const expiresAt = new Date(result.data.expiresAt)
          const expectedExpiry = new Date('2025-01-15T12:15:00Z')
          expect(expiresAt.getTime()).toBe(expectedExpiry.getTime())
        }
      })

      it('AC44: generates presigned PUT URL via S3 storage port', async () => {
        await service.createUploadSession(TEST_USER_ID, TEST_MOC_ID, validCreateRequest)

        expect(deps.s3Storage.generatePresignedPutUrl).toHaveBeenCalledWith(
          TEST_S3_BUCKET,
          expect.stringContaining(`${TEST_USER_ID}/${TEST_MOC_ID}/instructions/`),
          'application/pdf',
          900,
        )
      })

      it('AC42: generates correct S3 key pattern', async () => {
        await service.createUploadSession(TEST_USER_ID, TEST_MOC_ID, validCreateRequest)

        expect(deps.s3Storage.generatePresignedPutUrl).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringMatching(
            new RegExp(
              `dev/moc-instructions/${TEST_USER_ID}/${TEST_MOC_ID}/instructions/.*-castle-instructions.pdf`,
            ),
          ),
          expect.any(String),
          expect.any(Number),
        )
      })

      it('AC46: creates session record in repository', async () => {
        await service.createUploadSession(TEST_USER_ID, TEST_MOC_ID, validCreateRequest)

        expect(deps.sessionRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: TEST_USER_ID,
            mocInstructionId: TEST_MOC_ID,
            status: 'pending',
            originalFilename: validCreateRequest.filename,
            originalFileSize: validCreateRequest.fileSize,
          }),
        )
      })
    })

    describe('File Validation', () => {
      it('AC38: returns FILE_TOO_SMALL when fileSize <= 10MB', async () => {
        const smallFileRequest: CreateUploadSessionRequest = {
          filename: 'small.pdf',
          fileSize: MIN_PRESIGNED_SIZE, // Exactly 10MB (must be > 10MB)
          fileType: 'application/pdf',
        }

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          smallFileRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('FILE_TOO_SMALL')
        }
        expect(deps.sessionRepo.create).not.toHaveBeenCalled()
      })

      it('AC38: returns FILE_TOO_SMALL when fileSize is 1 byte', async () => {
        const tinyFileRequest: CreateUploadSessionRequest = {
          filename: 'tiny.pdf',
          fileSize: 1,
          fileType: 'application/pdf',
        }

        const result = await service.createUploadSession(TEST_USER_ID, TEST_MOC_ID, tinyFileRequest)

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('FILE_TOO_SMALL')
        }
      })

      it('AC39: returns FILE_TOO_LARGE when fileSize > 50MB', async () => {
        const largeFileRequest: CreateUploadSessionRequest = {
          filename: 'large.pdf',
          fileSize: MAX_PRESIGNED_SIZE + 1, // 50MB + 1 byte
          fileType: 'application/pdf',
        }

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          largeFileRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('FILE_TOO_LARGE')
        }
        expect(deps.sessionRepo.create).not.toHaveBeenCalled()
      })

      it('AC36: returns INVALID_MIME_TYPE when fileType is not application/pdf', async () => {
        const invalidTypeRequest: CreateUploadSessionRequest = {
          filename: 'image.png',
          fileSize: 15 * 1024 * 1024,
          fileType: 'image/png',
        }

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          invalidTypeRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('INVALID_MIME_TYPE')
        }
        expect(deps.sessionRepo.create).not.toHaveBeenCalled()
      })

      it('AC36: returns INVALID_MIME_TYPE for text/plain files', async () => {
        const textFileRequest: CreateUploadSessionRequest = {
          filename: 'readme.txt',
          fileSize: 15 * 1024 * 1024,
          fileType: 'text/plain',
        }

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          textFileRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('INVALID_MIME_TYPE')
        }
      })
    })

    describe('MOC Authorization', () => {
      it('AC35: returns MOC_NOT_FOUND when MOC does not exist', async () => {
        vi.mocked(deps.mocRepo.getMocById).mockResolvedValue(null)

        const result = await service.createUploadSession(
          TEST_USER_ID,
          'nonexistent-moc',
          validCreateRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('MOC_NOT_FOUND')
        }
        expect(deps.sessionRepo.create).not.toHaveBeenCalled()
      })

      it('AC35: returns MOC_NOT_FOUND when user does not own the MOC (FORBIDDEN)', async () => {
        // getMocById filters by userId, so returns null if user doesn't own it
        vi.mocked(deps.mocRepo.getMocById).mockResolvedValue(null)

        const result = await service.createUploadSession(
          'other-user',
          TEST_MOC_ID,
          validCreateRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('MOC_NOT_FOUND')
        }
        expect(deps.mocRepo.getMocById).toHaveBeenCalledWith(TEST_MOC_ID, 'other-user')
      })
    })

    describe('Rate Limiting', () => {
      it('AC40: returns RATE_LIMIT_EXCEEDED when rate limit check fails', async () => {
        vi.mocked(deps.checkRateLimit).mockResolvedValue({
          allowed: false,
          remaining: 0,
          currentCount: 100,
          limit: 100,
          retryAfterSeconds: 3600,
        })

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          validCreateRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('RATE_LIMIT_EXCEEDED')
        }
        expect(deps.sessionRepo.create).not.toHaveBeenCalled()
      })

      it('AC41: calls checkRateLimit with correct userId', async () => {
        await service.createUploadSession(TEST_USER_ID, TEST_MOC_ID, validCreateRequest)

        expect(deps.checkRateLimit).toHaveBeenCalledWith(TEST_USER_ID)
      })
    })

    describe('Error Handling', () => {
      it('returns DB_ERROR when MOC repository throws', async () => {
        vi.mocked(deps.mocRepo.getMocById).mockRejectedValue(new Error('Database connection lost'))

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          validCreateRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('DB_ERROR')
        }
      })

      it('returns DB_ERROR when rate limit check throws', async () => {
        vi.mocked(deps.checkRateLimit).mockRejectedValue(new Error('Redis connection failed'))

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          validCreateRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('DB_ERROR')
        }
      })

      it('returns S3_ERROR when presigned URL generation fails', async () => {
        vi.mocked(deps.s3Storage.generatePresignedPutUrl).mockRejectedValue(
          new Error('S3 access denied'),
        )

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          validCreateRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('S3_ERROR')
        }
      })

      it('returns DB_ERROR when session creation fails', async () => {
        vi.mocked(deps.sessionRepo.create).mockRejectedValue(new Error('Insert failed'))

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          validCreateRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('DB_ERROR')
        }
      })

      it('AC31: returns VALIDATION_ERROR for missing filename', async () => {
        const invalidRequest = {
          fileSize: 15 * 1024 * 1024,
          fileType: 'application/pdf',
        } as CreateUploadSessionRequest

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          invalidRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('VALIDATION_ERROR')
        }
      })

      it('AC31: returns VALIDATION_ERROR for empty filename', async () => {
        const invalidRequest: CreateUploadSessionRequest = {
          filename: '',
          fileSize: 15 * 1024 * 1024,
          fileType: 'application/pdf',
        }

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          invalidRequest,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('VALIDATION_ERROR')
        }
      })
    })

    describe('Edge Cases', () => {
      it('handles filename with special characters', async () => {
        const specialFilename: CreateUploadSessionRequest = {
          filename: 'Moc Instructions (v2) - Final.pdf',
          fileSize: 15 * 1024 * 1024,
          fileType: 'application/pdf',
        }

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          specialFilename,
        )

        expect(result.ok).toBe(true)
        // S3 key should be sanitized
        expect(deps.s3Storage.generatePresignedPutUrl).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('moc-instructions-v2-final.pdf'),
          expect.any(String),
          expect.any(Number),
        )
      })

      it('handles unicode filename', async () => {
        const unicodeFilename: CreateUploadSessionRequest = {
          filename: 'Instructions-Chateau.pdf',
          fileSize: 15 * 1024 * 1024,
          fileType: 'application/pdf',
        }

        const result = await service.createUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          unicodeFilename,
        )

        expect(result.ok).toBe(true)
      })

      it('handles fileSize at exactly 10MB + 1 byte (minimum valid)', async () => {
        const minValidRequest: CreateUploadSessionRequest = {
          filename: 'min.pdf',
          fileSize: MIN_PRESIGNED_SIZE + 1,
          fileType: 'application/pdf',
        }

        const result = await service.createUploadSession(TEST_USER_ID, TEST_MOC_ID, minValidRequest)

        expect(result.ok).toBe(true)
      })

      it('handles fileSize at exactly 50MB (maximum valid)', async () => {
        const maxValidRequest: CreateUploadSessionRequest = {
          filename: 'max.pdf',
          fileSize: MAX_PRESIGNED_SIZE,
          fileType: 'application/pdf',
        }

        const result = await service.createUploadSession(TEST_USER_ID, TEST_MOC_ID, maxValidRequest)

        expect(result.ok).toBe(true)
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // completeUploadSession Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('completeUploadSession', () => {
    describe('Happy Path', () => {
      it('AC61: completes session and returns file record', async () => {
        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.id).toBeDefined()
          expect(result.data.mocId).toBe(TEST_MOC_ID)
          expect(result.data.fileType).toBe('instruction')
          expect(result.data.fileUrl).toContain('https://')
          expect(result.data.originalFilename).toBe(validCreateRequest.filename)
          expect(result.data.mimeType).toBe('application/pdf')
          expect(result.data.fileSize).toBe(validCreateRequest.fileSize)
          expect(result.data.uploadedBy).toBe(TEST_USER_ID)
        }
      })

      it('AC53: verifies file exists in S3 via headObject', async () => {
        await service.completeUploadSession(TEST_USER_ID, TEST_MOC_ID, mockSessionId)

        expect(deps.s3Storage.headObject).toHaveBeenCalledWith(
          TEST_S3_BUCKET,
          expect.stringContaining(`${TEST_MOC_ID}/instructions/`),
        )
      })

      it('AC58: inserts moc_files record', async () => {
        await service.completeUploadSession(TEST_USER_ID, TEST_MOC_ID, mockSessionId)

        expect(deps.insertMocFile).toHaveBeenCalledWith({
          mocId: TEST_MOC_ID,
          fileType: 'instruction',
          fileUrl: expect.stringContaining('https://'),
          originalFilename: validCreateRequest.filename,
          mimeType: 'application/pdf',
          s3Key: expect.stringContaining(`${TEST_MOC_ID}/instructions/`),
        })
      })

      it('AC59: updates session status to completed', async () => {
        await service.completeUploadSession(TEST_USER_ID, TEST_MOC_ID, mockSessionId)

        expect(deps.sessionRepo.markCompleted).toHaveBeenCalledWith(mockSessionId, expect.any(Date))
      })

      it('increments rate limit counter on successful completion', async () => {
        await service.completeUploadSession(TEST_USER_ID, TEST_MOC_ID, mockSessionId)

        expect(deps.incrementRateLimit).toHaveBeenCalledWith(TEST_USER_ID)
      })

      it('uses CloudFront domain for fileUrl when configured', async () => {
        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.fileUrl).toContain(TEST_CLOUDFRONT_DOMAIN)
        }
      })
    })

    describe('Session Validation', () => {
      it('AC50: returns SESSION_NOT_FOUND when session does not exist', async () => {
        vi.mocked(deps.sessionRepo.findByIdAndUserId).mockResolvedValue(null)

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          'nonexistent-session',
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('SESSION_NOT_FOUND')
        }
        expect(deps.s3Storage.headObject).not.toHaveBeenCalled()
      })

      it('AC51: returns FORBIDDEN when user does not own session', async () => {
        const otherUserSession: UploadSession = {
          ...mockSession,
          userId: 'other-user',
        }
        vi.mocked(deps.sessionRepo.findByIdAndUserId).mockResolvedValue(otherUserSession)

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('FORBIDDEN')
        }
      })

      it('returns SESSION_NOT_FOUND when session mocId does not match', async () => {
        const differentMocSession: UploadSession = {
          ...mockSession,
          mocInstructionId: 'different-moc-id',
        }
        vi.mocked(deps.sessionRepo.findByIdAndUserId).mockResolvedValue(differentMocSession)

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('SESSION_NOT_FOUND')
        }
      })

      it('AC52: returns SESSION_ALREADY_COMPLETED when session status is completed', async () => {
        const completedSession: UploadSession = {
          ...mockSession,
          status: 'completed',
        }
        vi.mocked(deps.sessionRepo.findByIdAndUserId).mockResolvedValue(completedSession)

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('SESSION_ALREADY_COMPLETED')
        }
        // Should not attempt to verify file in S3 or insert record
        expect(deps.s3Storage.headObject).not.toHaveBeenCalled()
        expect(deps.insertMocFile).not.toHaveBeenCalled()
      })

      it('AC52: returns EXPIRED_SESSION when session has expired', async () => {
        const expiredSession: UploadSession = {
          ...mockSession,
          expiresAt: new Date('2025-01-15T11:00:00Z'), // 1 hour before current time
        }
        vi.mocked(deps.sessionRepo.findByIdAndUserId).mockResolvedValue(expiredSession)

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('EXPIRED_SESSION')
        }
      })
    })

    describe('S3 Verification', () => {
      it('AC54: returns FILE_NOT_IN_S3 when headObject returns not found', async () => {
        vi.mocked(deps.s3Storage.headObject).mockResolvedValue({
          ok: false,
          error: 'NOT_FOUND',
        })

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('FILE_NOT_IN_S3')
        }
      })

      it('returns S3_ERROR when headObject throws', async () => {
        vi.mocked(deps.s3Storage.headObject).mockRejectedValue(new Error('S3 access denied'))

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('S3_ERROR')
        }
      })

      it('AC55: returns SIZE_MISMATCH when S3 size differs by more than 5%', async () => {
        // Expected size: 15MB, tolerance: 5% = 750KB
        // Set S3 size to differ by more than 5%
        vi.mocked(deps.s3Storage.headObject).mockResolvedValue({
          ok: true,
          data: {
            contentLength: validCreateRequest.fileSize * 0.9, // 10% smaller
            contentType: 'application/pdf',
          },
        })

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('SIZE_MISMATCH')
        }
      })

      it('AC56: accepts file when S3 size is within 5% tolerance (smaller)', async () => {
        // Expected: 15MB, allow up to 5% smaller = 14.25MB
        vi.mocked(deps.s3Storage.headObject).mockResolvedValue({
          ok: true,
          data: {
            contentLength: Math.floor(validCreateRequest.fileSize * 0.96), // 4% smaller - within tolerance
            contentType: 'application/pdf',
          },
        })

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(true)
      })

      it('AC56: accepts file when S3 size is within 5% tolerance (larger)', async () => {
        // Expected: 15MB, allow up to 5% larger = 15.75MB
        vi.mocked(deps.s3Storage.headObject).mockResolvedValue({
          ok: true,
          data: {
            contentLength: Math.floor(validCreateRequest.fileSize * 1.04), // 4% larger - within tolerance
            contentType: 'application/pdf',
          },
        })

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(true)
      })

      it('returns SIZE_MISMATCH when S3 size is 6% larger', async () => {
        vi.mocked(deps.s3Storage.headObject).mockResolvedValue({
          ok: true,
          data: {
            contentLength: Math.floor(validCreateRequest.fileSize * 1.06), // 6% larger
            contentType: 'application/pdf',
          },
        })

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('SIZE_MISMATCH')
        }
      })
    })

    describe('Error Handling', () => {
      it('returns DB_ERROR when session lookup fails', async () => {
        vi.mocked(deps.sessionRepo.findByIdAndUserId).mockRejectedValue(
          new Error('Database error'),
        )

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('DB_ERROR')
        }
      })

      it('AC60: returns DB_ERROR when insertMocFile fails', async () => {
        vi.mocked(deps.insertMocFile).mockRejectedValue(new Error('Insert failed'))

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('DB_ERROR')
        }
      })

      it('returns DB_ERROR when markCompleted fails', async () => {
        vi.mocked(deps.sessionRepo.markCompleted).mockRejectedValue(
          new Error('Update status failed'),
        )

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('DB_ERROR')
        }
      })
    })

    describe('Edge Cases', () => {
      it('handles session with null originalFilename', async () => {
        const sessionWithNullFilename: UploadSession = {
          ...mockSession,
          originalFilename: null,
        }
        vi.mocked(deps.sessionRepo.findByIdAndUserId).mockResolvedValue(sessionWithNullFilename)

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.originalFilename).toBe('unknown')
        }
      })

      it('handles session with null originalFileSize (uses 0 for tolerance calc)', async () => {
        const sessionWithNullSize: UploadSession = {
          ...mockSession,
          originalFileSize: null,
        }
        vi.mocked(deps.sessionRepo.findByIdAndUserId).mockResolvedValue(sessionWithNullSize)

        // With expected size of 0 and tolerance of 0, any actual size will fail
        vi.mocked(deps.s3Storage.headObject).mockResolvedValue({
          ok: true,
          data: { contentLength: 100, contentType: 'application/pdf' },
        })

        const result = await service.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('SIZE_MISMATCH')
        }
      })

      it('uses S3 public URL when CloudFront domain is not configured', async () => {
        const depsWithoutCloudfront = {
          ...deps,
          cloudfrontDomain: undefined,
        }
        const serviceWithoutCloudfront = createUploadSessionService(depsWithoutCloudfront)

        const result = await serviceWithoutCloudfront.completeUploadSession(
          TEST_USER_ID,
          TEST_MOC_ID,
          mockSessionId,
        )

        expect(result.ok).toBe(true)
        expect(deps.s3Storage.getPublicUrl).toHaveBeenCalled()
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Integration-style Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('End-to-end Flow', () => {
    it('full create -> complete flow succeeds', async () => {
      // Step 1: Create session
      const createResult = await service.createUploadSession(
        TEST_USER_ID,
        TEST_MOC_ID,
        validCreateRequest,
      )

      expect(createResult.ok).toBe(true)
      if (!createResult.ok) return

      // Step 2: Complete session (simulating S3 upload happened)
      const completeResult = await service.completeUploadSession(
        TEST_USER_ID,
        TEST_MOC_ID,
        createResult.data.sessionId,
      )

      expect(completeResult.ok).toBe(true)
      if (completeResult.ok) {
        expect(completeResult.data.fileType).toBe('instruction')
        expect(completeResult.data.mimeType).toBe('application/pdf')
      }
    })
  })
})
