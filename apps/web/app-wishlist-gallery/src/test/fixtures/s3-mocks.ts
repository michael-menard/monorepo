/**
 * S3 Upload Test Fixtures
 *
 * Reusable fixtures for MSW mocking of S3 presign and upload operations.
 * All fixtures validate against Zod schemas from @repo/api-client.
 *
 * Story: WISH-2011
 */

import { z } from 'zod'
import { PresignResponseSchema } from '@repo/api-client/schemas/wishlist'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PresignResponse = z.infer<typeof PresignResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Presign Response Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Successful presign response fixture.
 * Matches the PresignResponseSchema from @repo/api-client.
 */
export const mockPresignSuccess = {
  presignedUrl:
    'https://lego-moc-bucket.s3.amazonaws.com/uploads/test-uuid-12345.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=mock-signature',
  key: 'uploads/test-uuid-12345.jpg',
  expiresIn: 3600,
} satisfies PresignResponse

// Counter for unique presign response generation
let presignResponseCounter = 0

/**
 * Presign response with custom file name.
 * Use for testing specific file names in upload flows.
 */
export function createMockPresignResponse(fileName: string): PresignResponse {
  presignResponseCounter++
  const key = `uploads/${Date.now()}-${presignResponseCounter}-${fileName}`
  return {
    presignedUrl: `https://lego-moc-bucket.s3.amazonaws.com/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=mock-signature`,
    key,
    expiresIn: 3600,
  }
}

/**
 * Second presign response for concurrent upload testing.
 */
export const mockPresignSuccessSecond = {
  presignedUrl:
    'https://lego-moc-bucket.s3.amazonaws.com/uploads/test-uuid-67890.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=mock-signature-2',
  key: 'uploads/test-uuid-67890.jpg',
  expiresIn: 3600,
} satisfies PresignResponse

// ─────────────────────────────────────────────────────────────────────────────
// Error Response Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 500 Internal Server Error response for presign endpoint.
 */
export const mockPresign500Error = {
  error: 'Internal Server Error',
  message: 'Failed to generate presigned URL',
  statusCode: 500,
}

/**
 * 403 Forbidden response for S3 PUT operations.
 */
export const mockS3Forbidden = {
  error: 'Forbidden',
  message: 'Access denied to S3 bucket',
  statusCode: 403,
}

/**
 * Timeout simulation marker (used by MSW handler).
 */
export const MOCK_TIMEOUT_MARKER = 'TIMEOUT'

// ─────────────────────────────────────────────────────────────────────────────
// File Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock File object for testing.
 *
 * @param name - File name including extension
 * @param type - MIME type (e.g., 'image/jpeg')
 * @param size - File size in bytes (default 1024)
 * @returns File object suitable for upload testing
 */
export function createMockFile(name: string, type: string, size = 1024): File {
  // For small sizes, create actual content; for large sizes, use ArrayBuffer
  let blob: Blob
  if (size === 0) {
    blob = new Blob([], { type })
  } else if (size <= 10000) {
    // Small files: create string content
    const content = 'a'.repeat(size)
    blob = new Blob([content], { type })
  } else {
    // Large files: use ArrayBuffer to avoid memory issues
    const buffer = new ArrayBuffer(size)
    blob = new Blob([buffer], { type })
  }
  return new File([blob], name, { type, lastModified: Date.now() })
}

/**
 * Valid JPEG file for upload testing.
 */
export const mockJpegFile = createMockFile('test-image.jpg', 'image/jpeg', 2048)

/**
 * Valid PNG file for upload testing.
 */
export const mockPngFile = createMockFile('test-image.png', 'image/png', 2048)

/**
 * Valid WebP file for upload testing.
 */
export const mockWebpFile = createMockFile('test-image.webp', 'image/webp', 2048)

/**
 * Valid GIF file for upload testing.
 */
export const mockGifFile = createMockFile('test-image.gif', 'image/gif', 2048)

/**
 * Invalid text file for validation testing.
 * Should be rejected by file type validation.
 */
export const mockInvalidTextFile = createMockFile('document.txt', 'text/plain', 100)

/**
 * Zero-byte file for edge case testing.
 * Should be rejected by upload validation.
 */
export const mockZeroByteFile = createMockFile('empty.jpg', 'image/jpeg', 0)

/**
 * Creates a large file just under the 10MB limit (9.9MB).
 * Use for boundary testing.
 * Note: Created lazily to avoid memory issues during module load.
 */
export function createMockLargeFile(): File {
  return createMockFile('large-image.jpg', 'image/jpeg', Math.floor(9.9 * 1024 * 1024))
}

/**
 * Creates a file exceeding the 10MB limit (10.1MB).
 * Should be rejected by size validation.
 * Note: Created lazily to avoid memory issues during module load.
 */
export function createMockOversizedFile(): File {
  return createMockFile('oversized.jpg', 'image/jpeg', Math.floor(10.1 * 1024 * 1024))
}

// Legacy exports for backward compatibility (use lazy functions instead)
// These are created on-demand when accessed
let _mockLargeFile: File | null = null
let _mockOversizedFile: File | null = null

/**
 * @deprecated Use createMockLargeFile() instead
 */
export const mockLargeFile = {
  get name() {
    _mockLargeFile ??= createMockLargeFile()
    return _mockLargeFile.name
  },
  get type() {
    _mockLargeFile ??= createMockLargeFile()
    return _mockLargeFile.type
  },
  get size() {
    _mockLargeFile ??= createMockLargeFile()
    return _mockLargeFile.size
  },
}

/**
 * @deprecated Use createMockOversizedFile() instead
 */
export const mockOversizedFile = {
  get name() {
    _mockOversizedFile ??= createMockOversizedFile()
    return _mockOversizedFile.name
  },
  get type() {
    _mockOversizedFile ??= createMockOversizedFile()
    return _mockOversizedFile.type
  },
  get size() {
    _mockOversizedFile ??= createMockOversizedFile()
    return _mockOversizedFile.size
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Progress Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulated progress events for upload testing.
 */
export const mockProgressEvents = [
  { percent: 0, loaded: 0, total: 1000 },
  { percent: 25, loaded: 250, total: 1000 },
  { percent: 50, loaded: 500, total: 1000 },
  { percent: 75, loaded: 750, total: 1000 },
  { percent: 100, loaded: 1000, total: 1000 },
]

// ─────────────────────────────────────────────────────────────────────────────
// S3 Response Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Successful S3 PUT response.
 */
export const mockS3UploadSuccess = {
  status: 200,
  statusText: 'OK',
  headers: {
    'x-amz-request-id': 'mock-request-id',
    etag: '"mock-etag"',
  },
}

/**
 * Generates the final image URL from S3 key.
 */
export function getImageUrlFromKey(key: string): string {
  return `https://lego-moc-bucket.s3.amazonaws.com/${key}`
}

// ─────────────────────────────────────────────────────────────────────────────
// MSW Handler Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Error injection header for MSW handlers.
 * Set this header in tests to trigger specific error responses.
 *
 * @example
 * // In test:
 * server.use(
 *   http.post('/api/wishlist/images/presign', ({ request }) => {
 *     if (request.headers.get('x-mock-error') === '500') {
 *       return HttpResponse.json(mockPresign500Error, { status: 500 })
 *     }
 *     return HttpResponse.json(mockPresignSuccess)
 *   })
 * )
 */
export const MOCK_ERROR_HEADER = 'x-mock-error'

/**
 * Request counter for concurrent upload testing.
 * Increments on each presign request to generate unique keys.
 */
let presignRequestCounter = 0

/**
 * Resets the presign request counter.
 * Call in beforeEach() for test isolation.
 */
export function resetPresignCounter(): void {
  presignRequestCounter = 0
}

/**
 * Gets the next presign counter value and increments.
 */
export function getNextPresignCounter(): number {
  return ++presignRequestCounter
}
