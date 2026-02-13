import type { Result } from '@repo/api-core'
import type { CreateMocRequest, ListMocsQuery } from '../types.js'

export interface Moc {
  id: string
  userId: string
  title: string
  description: string | null
  theme: string | null
  tags: string[] | null
  slug: string | null
  type: string
  thumbnailUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface MocListItem extends Moc {
  // Additional fields for list view
  mocId: string | null
  author: string | null
  partsCount: number | null
  minifigCount: number | null
  themeId: number | null
  subtheme: string | null
  uploadedDate: Date | null
  brand: string | null
  setNumber: string | null
  releaseYear: number | null
  retired: boolean | null
  designer: unknown | null
  dimensions: unknown | null
  instructionsMetadata: unknown | null
  features: unknown | null
  descriptionHtml: string | null
  shortDescription: string | null
  difficulty: string | null
  buildTimeHours: number | null
  ageRecommendation: string | null
  status: string
  visibility: string
  isFeatured: boolean
  isVerified: boolean
  thumbnailUrl: string | null
  totalPieceCount: number | null
  publishedAt: Date | null
}

export interface MocListResult {
  items: MocListItem[]
  total: number
}

export interface MocFile {
  id: string
  mocId: string
  fileType: string
  fileUrl: string
  originalFilename: string | null
  mimeType: string | null
  s3Key: string
  createdAt: Date
  updatedAt: Date | null
}

export interface MocWithFiles extends Moc {
  files: MocFile[]
  totalPieceCount: number | null
}

export interface MocRepository {
  create(userId: string, data: CreateMocRequest): Promise<Moc>
  findBySlug(slug: string, userId: string): Promise<Moc | null>
  getMocById(id: string, userId: string): Promise<MocWithFiles | null>
  list(userId: string, query: ListMocsQuery): Promise<MocListResult>
  updateMoc(mocId: string, userId: string, data: Partial<CreateMocRequest>): Promise<Moc>
  updateThumbnail(mocId: string, userId: string, thumbnailUrl: string): Promise<void>
  getFileByIdAndMocId(fileId: string, mocId: string): Promise<MocFile | null>
}

/**
 * MOC Image Storage Port
 * (INST-1103: AC54)
 */
export interface MocImageStorage {
  /**
   * Upload a thumbnail image
   * @param userId - User ID for S3 key pattern
   * @param mocId - MOC ID for S3 key pattern
   * @param file - File buffer and metadata
   * @returns S3 key of uploaded file
   */
  uploadThumbnail(
    userId: string,
    mocId: string,
    file: { buffer: Buffer; filename: string; mimetype: string },
  ): Promise<
    Result<{ key: string; url: string }, 'UPLOAD_FAILED' | 'INVALID_IMAGE' | 'IMAGE_TOO_LARGE'>
  >

  /**
   * Delete a thumbnail from S3
   * @param key - S3 key of the file to delete
   */
  deleteThumbnail(key: string): Promise<Result<void, 'DELETE_FAILED'>>

  /**
   * Extract S3 key from a CloudFront or S3 URL
   * @param url - The URL to extract the key from
   */
  extractKeyFromUrl(url: string): string | null
}

// ─────────────────────────────────────────────────────────────────────────
// Upload Session Types (INST-1105)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Upload Session entity
 */
export interface UploadSession {
  id: string
  userId: string
  mocInstructionId: string | null
  status: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled'
  partSizeBytes: number
  expiresAt: Date
  originalFilename: string | null
  originalFileSize: number | null
  s3Key?: string
  createdAt: Date
  updatedAt: Date
  finalizedAt: Date | null
  finalizingAt: Date | null
}

/**
 * Upload Session Repository Port
 * (INST-1105: AC86)
 *
 * CRUD operations for upload_sessions table.
 */
export interface UploadSessionRepository {
  /**
   * Create a new upload session
   * @param data - Session data including userId, mocId, s3Key, expiry
   * @returns Created session
   */
  create(data: {
    userId: string
    mocInstructionId: string
    status: string
    partSizeBytes: number
    expiresAt: Date
    originalFilename: string
    originalFileSize: number
    s3Key?: string
  }): Promise<UploadSession>

  /**
   * Find a session by ID
   * @param sessionId - Session UUID
   * @returns Session or null if not found
   */
  findById(sessionId: string): Promise<UploadSession | null>

  /**
   * Find a session by ID with user ownership check
   * @param sessionId - Session UUID
   * @param userId - User ID for ownership check
   * @returns Session or null if not found or not owned by user
   */
  findByIdAndUserId(sessionId: string, userId: string): Promise<UploadSession | null>

  /**
   * Update session status to completed
   * @param sessionId - Session UUID
   * @param completedAt - Completion timestamp
   */
  markCompleted(sessionId: string, completedAt: Date): Promise<void>

  /**
   * Update session status
   * @param sessionId - Session UUID
   * @param status - New status
   */
  updateStatus(sessionId: string, status: string): Promise<void>
}

/**
 * S3 Storage Port
 * (INST-1105: AC87)
 *
 * S3 operations for presigned URLs and file verification.
 */
export interface S3StoragePort {
  /**
   * Generate a presigned PUT URL for direct S3 upload
   * @param bucket - S3 bucket name
   * @param key - S3 object key
   * @param contentType - MIME type for the upload
   * @param expiresIn - TTL in seconds
   * @returns Presigned URL string
   */
  generatePresignedPutUrl(
    bucket: string,
    key: string,
    contentType: string,
    expiresIn: number,
  ): Promise<string>

  /**
   * Check if an object exists in S3 and get metadata
   * @param bucket - S3 bucket name
   * @param key - S3 object key
   * @returns Object metadata including content length
   */
  headObject(
    bucket: string,
    key: string,
  ): Promise<Result<{ contentLength: number; contentType?: string }, 'NOT_FOUND' | 'S3_ERROR'>>

  /**
   * Get the public URL for an S3 object (via CloudFront if configured)
   * @param bucket - S3 bucket name
   * @param key - S3 object key
   * @returns Public URL string
   */
  getPublicUrl(bucket: string, key: string): string
}
