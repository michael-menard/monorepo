/**
 * MOC File Upload Service
 *
 * Handles file uploads for MOC Instructions.
 * - Validates user ownership
 * - Uploads files to S3
 * - Creates database records
 * - Invalidates caches
 */

import { eq, and } from 'drizzle-orm'
import { PutObjectCommand, S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { invalidateMocDetailCache } from './moc-service'
import { db } from '@/lib/db/client'
import { mocInstructions, mocFiles } from '@/db/schema'
import type { MocFile } from '@/types/moc'
import { NotFoundError, ForbiddenError, BadRequestError, DatabaseError } from '@/lib/errors'
import { createLogger } from '../utils/logger'

const logger = createLogger('moc-file-service')

/**
 * File size limits (in bytes)
 */
const FILE_SIZE_LIMITS = {
  instruction: 50 * 1024 * 1024, // 50 MB for PDFs
  'parts-list': 10 * 1024 * 1024, // 10 MB for Excel/CSV
  thumbnail: 5 * 1024 * 1024, // 5 MB for images
  'gallery-image': 10 * 1024 * 1024, // 10 MB for images
}

/**
 * Allowed MIME types for each file type
 */
const ALLOWED_MIME_TYPES = {
  instruction: ['application/pdf'],
  'parts-list': [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  thumbnail: ['image/jpeg', 'image/png', 'image/webp'],
  'gallery-image': ['image/jpeg', 'image/png', 'image/webp'],
}

/**
 * Upload a file for a MOC
 *
 * @param mocId - MOC ID to upload file to
 * @param userId - User ID from JWT claims
 * @param file - File buffer and metadata
 * @param metadata - File type and other metadata
 */
export async function uploadMocFile(
  mocId: string,
  userId: string,
  file: {
    buffer: Buffer
    filename: string
    mimeType: string
    size: number
  },
  metadata: {
    fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image'
  },
): Promise<MocFile> {
  logger.info('Uploading file for MOC', { mocId, userId, fileType: metadata.fileType })

  // Verify MOC exists and user owns it
  const [moc] = await db
    .select()
    .from(mocInstructions)
    .where(eq(mocInstructions.id, mocId))
    .limit(1)

  if (!moc) {
    throw new NotFoundError('MOC not found')
  }

  if (moc.userId !== userId) {
    throw new ForbiddenError('You do not own this MOC')
  }

  // Validate file size
  const maxSize = FILE_SIZE_LIMITS[metadata.fileType]
  if (file.size > maxSize) {
    throw new BadRequestError(
      `File size exceeds limit for ${metadata.fileType} (max: ${maxSize / 1024 / 1024} MB)`,
    )
  }

  // Validate MIME type
  const allowedTypes = ALLOWED_MIME_TYPES[metadata.fileType]
  if (!allowedTypes.includes(file.mimeType)) {
    throw new BadRequestError(
      `Invalid file type for ${metadata.fileType}. Allowed types: ${allowedTypes.join(', ')}`,
    )
  }

  // Generate unique S3 key
  const timestamp = Date.now()
  const sanitizedFilename = sanitizeFilename(file.filename)
  const s3Key = `mocs/${mocId}/${metadata.fileType}/${timestamp}-${sanitizedFilename}`

  // Upload to S3
  const bucketName = process.env.LEGO_API_BUCKET_NAME
  if (!bucketName) {
    throw new DatabaseError('S3 bucket not configured')
  }

  const s3Client = new S3Client({})
  const uploadCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: file.buffer,
    ContentType: file.mimeType,
    Metadata: {
      mocId,
      userId,
      fileType: metadata.fileType,
      originalFilename: file.filename,
    },
  })

  await s3Client.send(uploadCommand)

  // Construct file URL
  const region = process.env.AWS_REGION || 'us-east-1'
  const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`

  logger.info('File uploaded to S3', { s3Key, fileUrl })

  // Create database record
  const [fileRecord] = await db
    .insert(mocFiles)
    .values({
      mocId,
      fileType: metadata.fileType,
      fileUrl,
      originalFilename: file.filename,
      mimeType: file.mimeType,
      createdAt: new Date(),
    })
    .returning()

  if (!fileRecord) {
    throw new DatabaseError('Failed to create file record')
  }

  logger.info('File record created', { fileId: fileRecord.id })

  // Invalidate MOC detail cache
  invalidateMocDetailCache(mocId)

  return fileRecord as unknown as MocFile
}

/**
 * Generate pre-signed URL for file download
 *
 * @param mocId - MOC ID that owns the file
 * @param fileId - File ID to download
 * @param userId - User ID from JWT claims
 * @returns Pre-signed URL and file metadata
 */
export async function generateFileDownloadUrl(
  mocId: string,
  fileId: string,
  userId: string,
): Promise<{
  downloadUrl: string
  filename: string
  mimeType: string
  expiresIn: number
}> {
  logger.info('Generating download URL for file', { mocId, fileId, userId })

  // Verify MOC exists and user owns it
  const [moc] = await db
    .select()
    .from(mocInstructions)
    .where(eq(mocInstructions.id, mocId))
    .limit(1)

  if (!moc) {
    throw new NotFoundError('MOC not found')
  }

  if (moc.userId !== userId) {
    throw new ForbiddenError('You do not own this MOC')
  }

  // Fetch file record
  const [file] = await db
    .select()
    .from(mocFiles)
    .where(and(eq(mocFiles.id, fileId), eq(mocFiles.mocId, mocId)))
    .limit(1)

  if (!file) {
    throw new NotFoundError('File not found')
  }

  logger.info('File record found', {
    fileId: file.id,
    fileType: file.fileType,
    originalFilename: file.originalFilename,
  })

  // Extract S3 key from file URL
  const s3Key = extractS3KeyFromUrl(file.fileUrl)

  // Get bucket name
  const bucketName = process.env.LEGO_API_BUCKET_NAME
  if (!bucketName) {
    throw new DatabaseError('S3 bucket not configured')
  }

  // Generate pre-signed URL (valid for 1 hour)
  const s3Client = new S3Client({})
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${file.originalFilename || 'download'}"`,
    ResponseContentType: file.mimeType || 'application/octet-stream',
  })

  const expiresIn = 3600 // 1 hour in seconds
  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn })

  logger.info('Pre-signed URL generated', {
    fileId,
    expiresIn,
    filename: file.originalFilename,
  })

  return {
    downloadUrl,
    filename: file.originalFilename || 'download',
    mimeType: file.mimeType || 'application/octet-stream',
    expiresIn,
  }
}

/**
 * Extract S3 key from full S3 URL
 * Example: https://bucket-name.s3.region.amazonaws.com/mocs/123/instruction/file.pdf
 * Returns: mocs/123/instruction/file.pdf
 */
function extractS3KeyFromUrl(fileUrl: string): string {
  try {
    const url = new URL(fileUrl)
    // Remove leading slash from pathname
    return url.pathname.substring(1)
  } catch {
    throw new BadRequestError(`Invalid S3 URL: ${fileUrl}`)
  }
}

/**
 * Sanitize filename for S3 key
 * Removes special characters and spaces
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .toLowerCase()
}

/**
 * Export invalidation function for use by other services
 */
export { invalidateMocDetailCache }
