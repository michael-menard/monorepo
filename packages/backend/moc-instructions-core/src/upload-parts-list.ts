/**
 * Upload Parts List Core Function
 *
 * Platform-agnostic business logic for uploading and parsing a parts list file.
 * Parses CSV/XML files, calculates total piece count, and updates MOC record.
 *
 * Follows ports & adapters pattern - all infrastructure is injected via deps.
 *
 * STORY-016: MOC File Upload Management
 */

import type { UploadPartsListDeps, UploadPartsListResult } from './__types__/index.js'

/**
 * Upload and parse a parts list file
 *
 * Business rules:
 * 1. MOC must exist
 * 2. User must own the MOC
 * 3. File is uploaded to S3
 * 4. File is parsed (CSV or XML)
 * 5. moc_files record is created with type 'parts-list'
 * 6. moc_parts_lists record is created with parsed data
 * 7. MOC's totalPieceCount is updated
 *
 * @param mocId - MOC ID
 * @param userId - Authenticated user ID
 * @param file - File data (buffer, filename, mimeType)
 * @param deps - Injected dependencies
 * @returns Result with file record, parts list, and parsing summary
 */
export async function uploadPartsList(
  mocId: string,
  userId: string,
  file: {
    buffer: Buffer
    filename: string
    mimeType: string
  },
  deps: UploadPartsListDeps,
): Promise<UploadPartsListResult> {
  // Verify MOC exists and ownership
  const moc = await deps.db.getMoc(mocId)

  if (!moc) {
    return {
      success: false,
      error: 'NOT_FOUND',
      message: 'MOC not found',
    }
  }

  if (moc.userId !== userId) {
    return {
      success: false,
      error: 'FORBIDDEN',
      message: 'You do not own this MOC',
    }
  }

  // Parse the parts list file
  const parseResult = await deps.parsePartsListFile(file.filename, file.mimeType, file.buffer)

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: 'PARSE_ERROR',
      message: 'Failed to parse parts list file',
      details: {
        errors: parseResult.errors,
      },
    }
  }

  const { totalPieceCount, parts, format } = parseResult.data

  // Upload file to S3
  const sanitizedFilename = deps.sanitizeFilename(file.filename)
  const fileId = deps.generateUuid()
  const stage = process.env.STAGE || 'dev'

  // Extract extension
  const lastDot = sanitizedFilename.lastIndexOf('.')
  const extension = lastDot > 0 ? sanitizedFilename.substring(lastDot + 1) : ''
  const fileKey = extension ? `${fileId}.${extension}` : fileId

  const s3Key = `${stage}/moc-instructions/${userId}/${mocId}/parts-list/${fileKey}`

  let fileUrl: string
  try {
    fileUrl = await deps.uploadToS3(deps.s3Bucket, s3Key, file.buffer, file.mimeType)
  } catch (error) {
    return {
      success: false,
      error: 'S3_ERROR',
      message: error instanceof Error ? error.message : 'Failed to upload file to S3',
    }
  }

  // Create database records
  try {
    // Create file record
    const fileRecord = await deps.db.createMocFile({
      mocId,
      fileType: 'parts-list',
      fileUrl,
      originalFilename: file.filename,
      mimeType: file.mimeType,
    })

    // Create parts list record
    const partsListRecord = await deps.db.createPartsList({
      mocId,
      fileId: fileRecord.id,
      title: `Parts List - ${file.filename}`,
      description: `Parsed ${format.toUpperCase()} parts list with ${totalPieceCount} total pieces`,
      totalPartsCount: totalPieceCount.toString(),
    })

    // Update MOC with total piece count
    const updatedMoc = await deps.db.updateMocPieceCount(mocId, totalPieceCount)

    return {
      success: true,
      data: {
        file: fileRecord,
        partsList: partsListRecord,
        parsing: {
          totalPieceCount,
          uniqueParts: parts.length,
          format,
          success: true as const,
        },
        moc: {
          id: updatedMoc.id,
          totalPieceCount: updatedMoc.partsCount,
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Database error',
    }
  }
}
