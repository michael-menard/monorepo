import type { Result } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import { fileTypeFromBuffer } from 'file-type'
import type {
  MocRepository,
  Moc,
  MocWithFiles,
  MocListResult,
  MocImageStorage,
} from '../ports/index.js'
import type { CreateMocRequest, ListMocsQuery } from '../types.js'
import { CreateMocRequestSchema, ListMocsQuerySchema } from '../types.js'

/**
 * MOC Service Dependencies
 */
export interface MocServiceDeps {
  mocRepo: MocRepository
  imageStorage?: MocImageStorage
}

/**
 * Create the MOC Service
 */
export function createMocService(deps: MocServiceDeps) {
  const { mocRepo, imageStorage } = deps

  return {
    /**
     * Create a new MOC
     */
    async createMoc(
      userId: string,
      data: CreateMocRequest,
    ): Promise<Result<Moc, 'VALIDATION_ERROR' | 'DUPLICATE_TITLE' | 'DB_ERROR'>> {
      // Validate with Zod
      const validated = CreateMocRequestSchema.safeParse(data)
      if (!validated.success) {
        logger.warn('MOC validation failed', undefined, {
          userId,
          errors: validated.error.flatten(),
        })
        return err('VALIDATION_ERROR')
      }

      try {
        const moc = await mocRepo.create(userId, validated.data)
        logger.info('MOC created successfully', undefined, {
          userId,
          mocId: moc.id,
          title: moc.title,
        })
        return ok(moc)
      } catch (error: any) {
        // Check for unique constraint violation on (userId, title)
        if (error.code === '23505' && error.constraint === 'moc_instructions_user_title_unique') {
          logger.warn('Duplicate MOC title', undefined, { userId, title: data.title })
          return err('DUPLICATE_TITLE')
        }

        logger.error('Failed to create MOC', error, { userId, title: data.title })
        return err('DB_ERROR')
      }
    },

    /**
     * Get MOC by ID with authorization check
     * Returns null if MOC doesn't exist or user is not authorized
     * (INST-1101: AC-12, AC-16, AC-21)
     */
    async getMoc(userId: string, mocId: string): Promise<Result<MocWithFiles | null, 'DB_ERROR'>> {
      try {
        // Repository enforces authorization via userId filter
        const moc = await mocRepo.getMocById(mocId, userId)

        if (moc) {
          logger.info('MOC retrieved successfully', undefined, { userId, mocId })
        } else {
          // Don't log as error - could be 404 or unauthorized access
          logger.debug('MOC not found or unauthorized', undefined, { userId, mocId })
        }

        return ok(moc)
      } catch (error: any) {
        logger.error('Failed to retrieve MOC', error, { userId, mocId })
        return err('DB_ERROR')
      }
    },

    /**
     * List MOCs for a user with pagination and filters
     * (INST-1102: Gallery listing)
     */
    async listMocs(
      userId: string,
      query: ListMocsQuery,
    ): Promise<Result<MocListResult & { query: ListMocsQuery }, 'VALIDATION_ERROR' | 'DB_ERROR'>> {
      // Validate query params
      const validated = ListMocsQuerySchema.safeParse(query)
      if (!validated.success) {
        logger.warn('Invalid list query', undefined, { userId, errors: validated.error.flatten() })
        return err('VALIDATION_ERROR')
      }

      try {
        const result = await mocRepo.list(userId, validated.data)
        logger.info('MOCs listed successfully', undefined, {
          userId,
          count: result.items.length,
          total: result.total,
          page: validated.data.page,
        })
        return ok({ ...result, query: validated.data })
      } catch (error: any) {
        logger.error('Failed to list MOCs', error, { userId })
        return err('DB_ERROR')
      }
    },

    /**
     * Upload thumbnail for a MOC
     * (INST-1103: AC49-AC52, AC24-AC28, AC34)
     *
     * Business logic:
     * 1. Verify user owns the MOC (AC21)
     * 2. Validate file type and size (AC24-AC28)
     * 3. Upload to S3 with WebP conversion (AC57)
     * 4. Delete old thumbnail if exists (AC32)
     * 5. Update database with new URL (AC34: transaction safety)
     */
    async uploadThumbnail(
      userId: string,
      mocId: string,
      file: { buffer: Buffer; filename: string; mimetype: string; size: number },
    ): Promise<
      Result<
        { thumbnailUrl: string },
        | 'MOC_NOT_FOUND'
        | 'FORBIDDEN'
        | 'INVALID_MIME_TYPE'
        | 'FILE_TOO_LARGE'
        | 'FILE_TOO_SMALL'
        | 'IMAGE_TOO_LARGE'
        | 'INVALID_IMAGE'
        | 'UPLOAD_FAILED'
        | 'DB_ERROR'
      >
    > {
      if (!imageStorage) {
        logger.error('Image storage not configured', undefined, { userId, mocId })
        return err('UPLOAD_FAILED')
      }

      // AC21: Verify user owns the MOC
      const mocResult = await this.getMoc(userId, mocId)
      if (!mocResult.ok) {
        return err('DB_ERROR')
      }
      if (!mocResult.data) {
        logger.warn('MOC not found or forbidden', undefined, { userId, mocId })
        return err('MOC_NOT_FOUND')
      }

      const moc = mocResult.data

      // AC24-AC25: Validate MIME type with file-type library
      const detectedType = await fileTypeFromBuffer(file.buffer)
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

      if (!detectedType || !allowedMimeTypes.includes(detectedType.mime)) {
        // AC35: Security logging for rejected uploads
        logger.warn('Rejected upload: invalid MIME type', undefined, {
          userId,
          mocId,
          declaredMime: file.mimetype,
          detectedMime: detectedType?.mime || 'unknown',
        })
        return err('INVALID_MIME_TYPE')
      }

      // AC27: Validate file size (1 byte <= size <= 10MB)
      const MAX_SIZE = 10 * 1024 * 1024 // 10MB
      const MIN_SIZE = 1

      if (file.size > MAX_SIZE) {
        logger.warn('Rejected upload: file too large', undefined, {
          userId,
          mocId,
          size: file.size,
          max: MAX_SIZE,
        })
        return err('FILE_TOO_LARGE')
      }

      if (file.size < MIN_SIZE) {
        logger.warn('Rejected upload: file too small', undefined, {
          userId,
          mocId,
          size: file.size,
        })
        return err('FILE_TOO_SMALL')
      }

      // Upload to S3 (includes WebP conversion, EXIF stripping, high-res validation)
      const uploadResult = await imageStorage.uploadThumbnail(userId, mocId, file)

      if (!uploadResult.ok) {
        // AC36: Log S3 upload failures
        logger.error('S3 upload failed', undefined, { userId, mocId, error: uploadResult.error })
        return err(uploadResult.error)
      }

      const { key, url } = uploadResult.data

      // AC32: Delete old thumbnail if exists (non-blocking)
      if (moc.thumbnailUrl) {
        const oldKey = imageStorage.extractKeyFromUrl(moc.thumbnailUrl)
        if (oldKey) {
          // Fire and forget - don't block on deletion
          imageStorage.deleteThumbnail(oldKey).catch(error => {
            // AC37: Log deletion failures without blocking
            logger.warn('Failed to delete old thumbnail (non-blocking)', error, {
              userId,
              mocId,
              oldKey,
            })
          })
        }
      }

      // AC34: Update database with thumbnail URL
      try {
        await mocRepo.updateThumbnail(mocId, userId, url)
        logger.info('Thumbnail uploaded successfully', undefined, { userId, mocId, key, url })
        return ok({ thumbnailUrl: url })
      } catch (error: any) {
        // Rollback: Try to delete the uploaded file
        await imageStorage.deleteThumbnail(key).catch(rollbackError => {
          logger.error('Rollback failed: could not delete uploaded thumbnail', rollbackError, {
            userId,
            mocId,
            key,
          })
        })

        logger.error('Failed to update thumbnail in database', error, { userId, mocId })
        return err('DB_ERROR')
      }
    },
  }
}
