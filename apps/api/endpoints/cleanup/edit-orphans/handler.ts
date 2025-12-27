/**
 * Edit Orphans Cleanup Lambda Function
 *
 * Story 3.1.38: S3 Cleanup for Failed Edit Uploads
 *
 * Schedule: Daily at 03:00 UTC (via EventBridge)
 *
 * Features:
 * - Lists objects in edit/ prefix older than 24 hours
 * - Uses S3 batch delete (up to 1000 objects per request)
 * - Logs each deleted file with correlationId
 * - Handles pagination for large buckets
 */

import { v4 as uuidv4 } from 'uuid'
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  type _Object,
} from '@aws-sdk/client-s3'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('edit-orphan-cleanup')

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ORPHAN_THRESHOLD_HOURS = 24
const MAX_DELETE_BATCH = 1000

// ─────────────────────────────────────────────────────────────────────────────
// S3 Client
// ─────────────────────────────────────────────────────────────────────────────

const s3Client = new S3Client({})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CleanupResult {
  correlationId: string
  scanned: number
  deleted: number
  errors: number
  durationMs: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

export const handler = async (): Promise<CleanupResult> => {
  const correlationId = uuidv4()
  const startTime = Date.now()

  const bucketName = process.env.LEGO_API_BUCKET_NAME
  const stage = process.env.STAGE || 'dev'

  logger.info('edit-orphan-cleanup.start', {
    correlationId,
    bucket: bucketName,
    stage,
    thresholdHours: ORPHAN_THRESHOLD_HOURS,
  })

  if (!bucketName) {
    logger.error('edit-orphan-cleanup.error', {
      correlationId,
      error: 'S3 bucket not configured',
    })
    return {
      correlationId,
      scanned: 0,
      deleted: 0,
      errors: 1,
      durationMs: Date.now() - startTime,
    }
  }

  try {
    // Calculate threshold timestamp
    const now = Date.now()
    const thresholdMs = ORPHAN_THRESHOLD_HOURS * 60 * 60 * 1000
    const threshold = new Date(now - thresholdMs)

    // List all objects in edit/ paths with pagination
    const allOrphans: _Object[] = []
    let continuationToken: string | undefined
    let totalScanned = 0

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `${stage}/moc-instructions/`,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })

      const response = await s3Client.send(listCommand)
      continuationToken = response.NextContinuationToken

      if (response.Contents) {
        totalScanned += response.Contents.length

        // Filter for edit/ paths older than threshold
        const orphans = response.Contents.filter(obj => {
          if (!obj.Key?.includes('/edit/')) return false
          if (!obj.LastModified) return false
          return obj.LastModified < threshold
        })

        allOrphans.push(...orphans)
      }
    } while (continuationToken)

    logger.info('edit-orphan-cleanup.found', {
      correlationId,
      totalScanned,
      orphanCount: allOrphans.length,
      thresholdDate: threshold.toISOString(),
    })

    if (allOrphans.length === 0) {
      logger.info('edit-orphan-cleanup.complete', {
        correlationId,
        scanned: totalScanned,
        deleted: 0,
        durationMs: Date.now() - startTime,
      })

      return {
        correlationId,
        scanned: totalScanned,
        deleted: 0,
        errors: 0,
        durationMs: Date.now() - startTime,
      }
    }

    // Batch delete orphans
    let deleted = 0
    let errors = 0

    for (let i = 0; i < allOrphans.length; i += MAX_DELETE_BATCH) {
      const batch = allOrphans.slice(i, i + MAX_DELETE_BATCH)

      try {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: batch.map(obj => ({ Key: obj.Key! })),
            Quiet: false, // Return deleted object info
          },
        })

        const deleteResult = await s3Client.send(deleteCommand)

        // Log each deleted object
        if (deleteResult.Deleted) {
          for (const deletedObj of deleteResult.Deleted) {
            const originalObj = batch.find(b => b.Key === deletedObj.Key)
            const ageHours = originalObj?.LastModified
              ? Math.round((now - originalObj.LastModified.getTime()) / (60 * 60 * 1000))
              : 0

            logger.info('edit-orphan-cleanup.deleted', {
              correlationId,
              s3Key: deletedObj.Key,
              ageHours,
            })
          }
          deleted += deleteResult.Deleted.length
        }

        // Log any errors
        if (deleteResult.Errors && deleteResult.Errors.length > 0) {
          for (const error of deleteResult.Errors) {
            logger.warn('edit-orphan-cleanup.delete-error', {
              correlationId,
              s3Key: error.Key,
              errorCode: error.Code,
              errorMessage: error.Message,
            })
          }
          errors += deleteResult.Errors.length
        }
      } catch (batchError) {
        logger.error('edit-orphan-cleanup.batch-error', {
          correlationId,
          batchStart: i,
          batchSize: batch.length,
          error: batchError instanceof Error ? batchError.message : 'Unknown',
        })
        errors += batch.length
      }
    }

    const durationMs = Date.now() - startTime

    logger.info('edit-orphan-cleanup.complete', {
      correlationId,
      scanned: totalScanned,
      deleted,
      errors,
      durationMs,
    })

    return {
      correlationId,
      scanned: totalScanned,
      deleted,
      errors,
      durationMs,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime

    logger.error('edit-orphan-cleanup.error', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      durationMs,
    })

    return {
      correlationId,
      scanned: 0,
      deleted: 0,
      errors: 1,
      durationMs,
    }
  }
}
