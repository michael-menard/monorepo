/**
 * Parts List Service
 *
 * Handles S3 uploads for parts list files.
 */

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { DatabaseError } from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('parts-list-service')

/**
 * Upload parts list file to S3
 *
 * @param mocId - MOC ID
 * @param userId - User ID from JWT
 * @param file - File buffer and metadata
 * @returns S3 key of uploaded file
 */
export async function uploadPartsListToS3(
  mocId: string,
  userId: string,
  file: {
    buffer: Buffer
    filename: string
    mimeType: string
    size: number
  },
): Promise<string> {
  logger.info('Uploading parts list to S3', {
    mocId,
    userId,
    filename: file.filename,
    size: file.size,
  })

  // Generate unique S3 key
  const timestamp = Date.now()
  const sanitizedFilename = sanitizeFilename(file.filename)
  const s3Key = `mocs/${mocId}/parts-list/${timestamp}-${sanitizedFilename}`

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
      fileType: 'parts-list',
      originalFilename: file.filename,
    },
  })

  await s3Client.send(uploadCommand)

  logger.info('Parts list uploaded to S3', { s3Key })

  return s3Key
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
