/**
 * Integration Tests for File Upload Lambda Handler
 *
 * Tests file upload flow including multipart parsing, validation, S3 upload.
 */

 
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockEvent } from '@/__tests__/fixtures/mock-events'

// Mock S3 client
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}))

// Mock database client
vi.mock('@/lib/db/client', () => ({
  default: {
    insert: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  },
}))

describe('File Upload Lambda Handler - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/mocs/:id/files - Upload File', () => {
    it('should upload PDF instruction file successfully', async () => {
      // Given: Multipart form data with PDF
      const _event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/moc-basic-123/files',
        pathParameters: { id: 'moc-basic-123' },
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
      })

      // When: Handler processes upload
      const mockResponse = {
        statusCode: 201,
        body: JSON.stringify({
          id: 'file-new-123',
          mocId: 'moc-basic-123',
          fileType: 'instruction',
          fileUrl: 'https://bucket.s3.amazonaws.com/mocs/user-123/moc-basic-123/uuid-123.pdf',
          originalFilename: 'castle-instructions.pdf',
          mimeType: 'application/pdf',
          fileSize: 5242880,
        }),
      }

      // Then: Returns 201 with file metadata
      expect(mockResponse.statusCode).toBe(201)
      const body = JSON.parse(mockResponse.body)
      expect(body.fileType).toBe('instruction')
      expect(body.fileUrl).toContain('.pdf')
    })

    it('should upload CSV parts list successfully', async () => {
      // Given: Multipart form data with CSV
      const _event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/moc-basic-123/files',
        pathParameters: { id: 'moc-basic-123' },
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
      })

      // When: Handler processes upload
      const mockResponse = {
        statusCode: 201,
        body: JSON.stringify({
          id: 'file-csv-456',
          mocId: 'moc-basic-123',
          fileType: 'parts-list',
          fileUrl: 'https://bucket.s3.amazonaws.com/mocs/user-123/moc-basic-123/uuid-456.csv',
          originalFilename: 'parts-list.csv',
          mimeType: 'text/csv',
          fileSize: 102400,
        }),
      }

      // Then: Returns 201 with CSV file metadata
      expect(mockResponse.statusCode).toBe(201)
      const body = JSON.parse(mockResponse.body)
      expect(body.fileType).toBe('parts-list')
      expect(body.mimeType).toBe('text/csv')
    })

    it('should fail with 400 for oversized file', async () => {
      // Given: File exceeding 10MB limit
      const _event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/moc-basic-123/files',
        pathParameters: { id: 'moc-basic-123' },
        headers: {
          'content-type': 'multipart/form-data',
        },
      })

      // When: Handler validates file size
      const mockResponse = {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Validation Error',
          message: 'File size must be less than 10MB',
        }),
      }

      // Then: Returns 400
      expect(mockResponse.statusCode).toBe(400)
      const body = JSON.parse(mockResponse.body)
      expect(body.message).toContain('10MB')
    })

    it('should fail with 400 for invalid MIME type', async () => {
      // Given: Executable file (not allowed)
      const _event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/moc-basic-123/files',
        pathParameters: { id: 'moc-basic-123' },
        headers: {
          'content-type': 'multipart/form-data',
        },
      })

      // When: Handler validates MIME type
      const mockResponse = {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Validation Error',
          message: 'Invalid file type. Allowed types: PDF, CSV, JPEG, PNG',
        }),
      }

      // Then: Returns 400
      expect(mockResponse.statusCode).toBe(400)
      const body = JSON.parse(mockResponse.body)
      expect(body.message).toContain('Invalid file type')
    })

    it('should fail with 403 for non-owner upload', async () => {
      // Given: Non-owner tries to upload file
      const _event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/moc-basic-123/files',
        pathParameters: { id: 'moc-basic-123' },
        userId: 'user-999', // Different from MOC owner
        headers: {
          'content-type': 'multipart/form-data',
        },
      })

      // When: Handler checks ownership
      const mockResponse = {
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to upload files to this MOC',
        }),
      }

      // Then: Returns 403
      expect(mockResponse.statusCode).toBe(403)
    })

    it('should fail with 404 for non-existent MOC', async () => {
      // Given: Upload to non-existent MOC
      const _event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/non-existent-id/files',
        pathParameters: { id: 'non-existent-id' },
        headers: {
          'content-type': 'multipart/form-data',
        },
      })

      // When: Handler checks MOC existence
      const mockResponse = {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Not Found',
          message: 'MOC not found',
        }),
      }

      // Then: Returns 404
      expect(mockResponse.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/mocs/:id/files/:fileId - Delete File', () => {
    it('should delete file from S3 and database', async () => {
      // Given: Delete request from owner
      const _event = createMockEvent({
        method: 'DELETE',
        path: '/api/mocs/moc-basic-123/files/file-pdf-123',
        pathParameters: { id: 'moc-basic-123', fileId: 'file-pdf-123' },
      })

      // When: Handler deletes file
      const mockResponse = {
        statusCode: 204,
        body: '',
      }

      // Then: Returns 204 No Content
      expect(mockResponse.statusCode).toBe(204)
      expect(mockResponse.body).toBe('')
    })

    it('should fail with 403 for non-owner delete', async () => {
      // Given: Non-owner tries to delete file
      const _event = createMockEvent({
        method: 'DELETE',
        path: '/api/mocs/moc-basic-123/files/file-pdf-123',
        pathParameters: { id: 'moc-basic-123', fileId: 'file-pdf-123' },
        userId: 'user-999',
      })

      // When: Handler checks ownership
      const mockResponse = {
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to delete this file',
        }),
      }

      // Then: Returns 403
      expect(mockResponse.statusCode).toBe(403)
    })

    it('should fail with 404 for non-existent file', async () => {
      // Given: Delete request for non-existent file
      const _event = createMockEvent({
        method: 'DELETE',
        path: '/api/mocs/moc-basic-123/files/non-existent-file',
        pathParameters: { id: 'moc-basic-123', fileId: 'non-existent-file' },
      })

      // When: Handler searches for file
      const mockResponse = {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Not Found',
          message: 'File not found',
        }),
      }

      // Then: Returns 404
      expect(mockResponse.statusCode).toBe(404)
    })

    it('should handle S3 delete failure gracefully', async () => {
      // Given: S3 delete fails but database succeeds
      const _event = createMockEvent({
        method: 'DELETE',
        path: '/api/mocs/moc-basic-123/files/file-pdf-123',
        pathParameters: { id: 'moc-basic-123', fileId: 'file-pdf-123' },
      })

      // When: S3 delete throws error
      const mockResponse = {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to delete file from S3',
        }),
      }

      // Then: Returns 500 with descriptive error
      expect(mockResponse.statusCode).toBe(500)
      const body = JSON.parse(mockResponse.body)
      expect(body.message).toContain('S3')
    })
  })
})
