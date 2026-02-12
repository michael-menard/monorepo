/**
 * MSW Handlers for Upload Sessions
 *
 * Story INST-1105: Upload Instructions (Presigned >10MB)
 *
 * Provides mock handlers for:
 * - POST /instructions/mocs/:mocId/upload-sessions - Create upload session
 * - POST /instructions/mocs/:mocId/upload-sessions/:sessionId/complete - Complete session
 */

import { http, HttpResponse } from 'msw'

// Use wildcard to match any base URL (localhost or actual API)
const API_PATTERN = '*/instructions/mocs'

// Simulated session storage for testing
const activeSessions = new Map<
  string,
  {
    mocId: string
    filename: string
    fileSize: number
    fileType: string
    expiresAt: Date
    s3Key: string
  }
>()

/**
 * MSW handlers for presigned upload session endpoints
 */
export const uploadSessionHandlers = [
  /**
   * POST /instructions/mocs/:mocId/upload-sessions
   * Creates a presigned upload session for files >10MB
   */
  http.post(`${API_PATTERN}/:mocId/upload-sessions`, async ({ request, params }) => {
    const body = (await request.json()) as {
      filename?: string
      fileSize?: number
      fileType?: string
    }
    const { mocId } = params

    // AC2: Validate request fields
    if (!body.filename || !body.fileSize || !body.fileType) {
      return HttpResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Missing required fields' },
        { status: 400 },
      )
    }

    // AC3: File too small for presigned upload (should use direct upload)
    const MIN_PRESIGNED_SIZE = 10 * 1024 * 1024 // 10MB
    if (body.fileSize <= MIN_PRESIGNED_SIZE) {
      return HttpResponse.json(
        { error: 'FILE_TOO_SMALL', message: 'Use direct upload for files <=10MB' },
        { status: 400 },
      )
    }

    // AC4: File too large
    const MAX_PRESIGNED_SIZE = 50 * 1024 * 1024 // 50MB
    if (body.fileSize > MAX_PRESIGNED_SIZE) {
      return HttpResponse.json(
        { error: 'FILE_TOO_LARGE', message: 'File too large. Max 50MB.' },
        { status: 400 },
      )
    }

    // Generate session details (must be UUID format per schema)
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    const s3Key = `mocs/user-123/moc-${mocId}/instructions/${sessionId}.pdf`

    // Store session for completion verification
    activeSessions.set(sessionId, {
      mocId: mocId as string,
      filename: body.filename,
      fileSize: body.fileSize,
      fileType: body.fileType,
      expiresAt,
      s3Key,
    })

    // AC5: Return presigned URL and session details
    return HttpResponse.json(
      {
        sessionId,
        presignedUrl: `https://test-bucket.s3.amazonaws.com/${s3Key}?X-Amz-Signature=test-signature`,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 201 },
    )
  }),

  /**
   * POST /instructions/mocs/:mocId/upload-sessions/:sessionId/complete
   * Completes an upload session after successful S3 upload
   */
  http.post(`${API_PATTERN}/:mocId/upload-sessions/:sessionId/complete`, async ({ params }) => {
      const { mocId, sessionId } = params

      // Look up session
      const session = activeSessions.get(sessionId as string)

      // AC28: Session not found
      if (!session) {
        return HttpResponse.json(
          { error: 'SESSION_NOT_FOUND', message: 'Upload session not found or expired' },
          { status: 404 },
        )
      }

      // AC29: Session expired
      if (new Date() > session.expiresAt) {
        activeSessions.delete(sessionId as string)
        return HttpResponse.json(
          { error: 'EXPIRED_SESSION', message: 'Upload session has expired. Please try again.' },
          { status: 410 },
        )
      }

      // AC30: MOC mismatch
      if (session.mocId !== mocId) {
        return HttpResponse.json(
          { error: 'FORBIDDEN', message: 'Session does not belong to this MOC' },
          { status: 403 },
        )
      }

      // Clean up session
      activeSessions.delete(sessionId as string)

      // AC31: Return created file record (matching CompleteUploadSessionResponseSchema)
      return HttpResponse.json({
        id: crypto.randomUUID(),
        mocId,
        fileType: 'instruction',
        fileUrl: `https://cdn.example.com/${session.s3Key}`,
        originalFilename: session.filename,
        mimeType: session.fileType,
        fileSize: session.fileSize,
        createdAt: new Date().toISOString(),
        uploadedBy: 'test-user-id',
      })
    },
  ),
]

/**
 * Helper to clear all active sessions (for test cleanup)
 */
export function clearActiveSessions(): void {
  activeSessions.clear()
}

/**
 * Helper to get active session count (for test assertions)
 */
export function getActiveSessionCount(): number {
  return activeSessions.size
}

/**
 * Helper to create an expired session (for testing expiry scenarios)
 */
export function createExpiredSession(sessionId: string, mocId: string): void {
  activeSessions.set(sessionId, {
    mocId,
    filename: 'test.pdf',
    fileSize: 15 * 1024 * 1024,
    fileType: 'application/pdf',
    expiresAt: new Date(Date.now() - 1000), // Already expired
    s3Key: `mocs/user-123/moc-${mocId}/instructions/${sessionId}.pdf`,
  })
}
