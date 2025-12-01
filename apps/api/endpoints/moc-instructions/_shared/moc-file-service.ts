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
import { randomUUID } from 'crypto'
import {
  validateFile,
  validateMagicBytes,
  createLegoInstructionValidationConfig,
  createLegoPartsListValidationConfig,
  createImageValidationConfig,
} from '@repo/file-validator'
import type { FileValidationConfig, FileValidator } from '@repo/file-validator'
import { invalidateMocDetailCache } from './moc-service'
import { db } from '@/core/database/client'
import { mocInstructions, mocFiles } from '@/core/database/schema'
import type { MocFile } from '@/endpoints/moc-instructions/_shared/types'
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  DatabaseError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'

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
 * Custom validator for magic bytes verification
 * Validates file signatures to prevent spoofed file types
 */
const magicBytesValidator: FileValidator = {
  name: 'magic-bytes-validator',
  validate: (file: any) => {
    // Only validate if buffer is available
    if (!('buffer' in file) || !file.buffer) {
      return null // Skip validation if no buffer
    }

    const mimeType = 'mimetype' in file ? file.mimetype : file.type
    const fileName = 'originalname' in file ? file.originalname : file.name

    // Validate magic bytes
    const isValid = validateMagicBytes(file.buffer, mimeType)

    if (!isValid) {
      return {
        code: 'INVALID_FILE_SIGNATURE',
        message: `File signature validation failed for ${fileName}. File may be corrupted or spoofed (claimed type: ${mimeType})`,
        file,
      }
    }

    return null
  },
}

/**
 * Get validation configuration based on file type
 * Uses @monorepo/file-validator for magic bytes validation
 *
 * @param fileType - Type of file being uploaded
 * @returns Validation configuration with magic bytes support
 */
function getValidationConfig(
  fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
): FileValidationConfig {
  let config: FileValidationConfig

  switch (fileType) {
    case 'instruction':
      config = createLegoInstructionValidationConfig()
      break

    case 'parts-list':
      config = createLegoPartsListValidationConfig()
      break

    case 'thumbnail':
    case 'gallery-image':
      config = createImageValidationConfig(FILE_SIZE_LIMITS[fileType])
      break

    default:
      throw new BadRequestError(`Unknown file type: ${fileType}`)
  }

  // Add magic bytes validator to all configs
  return {
    ...config,
    customValidators: [...(config.customValidators || []), magicBytesValidator],
  }
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

  // Validate file using @monorepo/file-validator (includes magic bytes validation)
  const validationConfig = getValidationConfig(metadata.fileType)
  const validationResult = validateFile(
    {
      originalname: file.filename,
      mimetype: file.mimeType,
      size: file.size,
      buffer: file.buffer,
      fieldname: 'file',
      encoding: '7bit',
    } as any,
    validationConfig,
    { environment: 'node' },
  )

  if (!validationResult.isValid) {
    const errorMessages = validationResult.errors.map(e => e.message).join('; ')
    throw new BadRequestError(`File validation failed: ${errorMessages}`)
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
  const downloadUrl = await getSignedUrl(s3Client as any, command, { expiresIn })

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
 * File upload result for individual file in parallel upload
 */
export interface FileUploadResult {
  filename: string
  success: boolean
  fileId?: string
  s3Url?: string
  fileSize?: number
  fileType?: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image'
  error?: string
}

/**
 * Upload multiple files in parallel for a MOC
 *
 * Each file is validated and uploaded independently.
 * Returns results for both successful and failed uploads.
 *
 * @param mocId - MOC ID to upload files to
 * @param userId - User ID from JWT claims
 * @param files - Array of files to upload
 * @param fileTypeMapping - Maps file fieldname to fileType
 * @returns Array of upload results (success + failures)
 */
export async function uploadMocFilesParallel(
  mocId: string,
  userId: string,
  files: Array<{
    buffer: Buffer
    filename: string
    mimetype: string
    fieldname: string
  }>,
  fileTypeMapping: Record<string, string>,
): Promise<FileUploadResult[]> {
  logger.info('Starting parallel file upload', {
    mocId,
    userId,
    fileCount: files.length,
  })

  // Verify MOC exists and user owns it (once, not per file)
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

  // Upload all files in parallel
  const uploadPromises = files.map(async (file): Promise<FileUploadResult> => {
    try {
      // Get fileType from mapping (from form fields)
      const fileType = fileTypeMapping[file.fieldname] as
        | 'instruction'
        | 'parts-list'
        | 'thumbnail'
        | 'gallery-image'

      if (!fileType) {
        return {
          filename: file.filename,
          success: false,
          error: 'File type not specified',
        }
      }

      // Validate file using @monorepo/file-validator (includes magic bytes validation)
      const validationConfig = getValidationConfig(fileType)
      const validationResult = validateFile(
        {
          originalname: file.filename,
          mimetype: file.mimetype,
          size: file.buffer.length,
          buffer: file.buffer,
          fieldname: 'file',
          encoding: '7bit',
        } as any,
        validationConfig,
        { environment: 'node' },
      )

      if (!validationResult.isValid) {
        const errorMessages = validationResult.errors.map(e => e.message).join('; ')
        return {
          filename: file.filename,
          success: false,
          error: errorMessages,
        }
      }

      // Generate unique S3 key
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(7)
      const sanitizedFilename = sanitizeFilename(file.filename)
      const s3Key = `mocs/${mocId}/${fileType}/${timestamp}-${randomSuffix}-${sanitizedFilename}`

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
        ContentType: file.mimetype,
        Metadata: {
          mocId,
          userId,
          fileType,
          originalFilename: file.filename,
        },
      })

      await s3Client.send(uploadCommand)

      // Construct file URL
      const region = process.env.AWS_REGION || 'us-east-1'
      const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`

      // Generate UUID for database record
      const fileId = randomUUID()

      logger.info('File uploaded to S3', {
        filename: file.filename,
        s3Key,
        fileId,
      })

      return {
        filename: file.filename,
        success: true,
        fileId,
        s3Url: fileUrl,
        fileSize: file.buffer.length,
        fileType,
      }
    } catch (error) {
      logger.error('File upload failed', error, {
        filename: file.filename,
      })

      return {
        filename: file.filename,
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  })

  // Execute all uploads in parallel
  const results = await Promise.all(uploadPromises)

  logger.info('Parallel upload completed', {
    total: results.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
  })

  return results
}

/**
 * Insert successful file uploads to database in a transaction
 *
 * Only inserts files that were successfully uploaded to S3.
 * Uses a transaction to ensure atomicity.
 *
 * @param mocId - MOC ID
 * @param uploadResults - Results from uploadMocFilesParallel
 * @returns Array of created file records
 */
export async function insertFileRecordsBatch(
  mocId: string,
  uploadResults: FileUploadResult[],
): Promise<MocFile[]> {
  // Filter only successful uploads
  const successfulUploads = uploadResults.filter(r => r.success)

  if (successfulUploads.length === 0) {
    logger.info('No successful uploads to insert')
    return []
  }

  logger.info('Inserting file records in batch', {
    count: successfulUploads.length,
  })

  // Use transaction for atomicity
  const insertedRecords = await db.transaction(async tx => {
    const fileRecords = successfulUploads.map(result => ({
      id: result.fileId!,
      mocId: mocId,
      fileType: result.fileType!,
      fileUrl: result.s3Url!,
      originalFilename: result.filename,
      mimeType: getMimeTypeFromFilename(result.filename),
      createdAt: new Date(),
    }))

    // Batch insert
    const inserted = await tx.insert(mocFiles).values(fileRecords).returning()

    logger.info('File records inserted', { count: inserted.length })

    return inserted
  })

  // Invalidate cache after successful insert
  invalidateMocDetailCache(mocId)

  return insertedRecords as unknown as MocFile[]
}

/**
 * Helper: Get MIME type from filename extension
 */
function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    csv: 'text/csv',
    xml: 'text/xml',
    json: 'application/json',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}
