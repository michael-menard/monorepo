/**
 * OpenSearch Non-Blocking Indexing with Retry
 *
 * Implements non-blocking indexing for OpenSearch with:
 * - Automatic retry on transient failures
 * - Fire-and-forget pattern (doesn't block main operation)
 * - Eventual consistency is acceptable for search
 * - Comprehensive error logging for monitoring
 *
 * Usage:
 * ```typescript
 * import { indexDocumentNonBlocking } from '@/core/search/retry'
 *
 * // Index asynchronously (doesn't block response)
 * indexDocumentNonBlocking({
 *   index: 'moc-instructions',
 *   id: mocId,
 *   body: { title, description, tags }
 * })
 * ```
 */

import { retryWithBackoff } from '@/core/utils/retry'
import { SearchError } from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { indexDocument, deleteDocument } from '@/core/search/opensearch'

const logger = createLogger('opensearch-retry')

/**
 * Index document in OpenSearch with retry (non-blocking)
 *
 * This function:
 * - Does NOT block the main operation
 * - Retries on failure with exponential backoff
 * - Logs errors but doesn't throw (eventual consistency acceptable)
 * - Returns immediately (fire-and-forget pattern)
 *
 * @param params - Index parameters
 * @param context - Optional context for logging
 *
 * @example
 * ```typescript
 * // Main operation
 * const moc = await db.insert(mocInstructions).values(data).returning()
 *
 * // Non-blocking indexing (fire-and-forget)
 * indexDocumentNonBlocking({
 *   index: 'moc-instructions',
 *   id: moc.id,
 *   body: { title: moc.title, description: moc.description }
 * }, 'createMOC')
 *
 * // Return response immediately (don't wait for indexing)
 * return successResponse(201, moc)
 * ```
 */
export function indexDocumentNonBlocking(
  params: {
    index: string
    id: string
    body: Record<string, unknown>
  },
  context?: string,
): void {
  // Fire-and-forget: Don't await, don't block
  void indexDocumentWithRetry(params, context)
}

/**
 * Internal function that performs the actual retry logic
 * This runs asynchronously in the background
 */
async function indexDocumentWithRetry(
  params: {
    index: string
    id: string
    body: Record<string, unknown>
  },
  context?: string,
): Promise<void> {
  try {
    await retryWithBackoff(
      async () => {
        try {
          logger.info('Indexing document in OpenSearch', {
            context,
            index: params.index,
            id: params.id,
          })

          await indexDocument(params)

          logger.info('Document indexed successfully', {
            context,
            index: params.index,
            id: params.id,
          })
        } catch (error) {
          const isRetryable = isOpenSearchErrorRetryable(error)

          logger.warn('OpenSearch indexing failed', {
            context,
            index: params.index,
            id: params.id,
            isRetryable,
            errorMessage: error instanceof Error ? error.message : String(error),
          })

          throw new SearchError(
            `Failed to index document: ${error instanceof Error ? error.message : 'Unknown error'}`,
            {
              context,
              index: params.index,
              id: params.id,
            },
          )
        }
      },
      {
        maxAttempts: 2, // Fewer retries since non-critical
        baseDelay: 300,
        maxDelay: 2000,
        jitter: true,
        context: context ? `opensearch:${context}` : 'opensearch',
      },
    )
  } catch (error) {
    // Log final failure but don't throw (non-blocking)
    // Eventual consistency is acceptable for search
    logger.error('OpenSearch indexing failed after retries (non-blocking)', {
      context,
      index: params.index,
      id: params.id,
      error: error instanceof Error ? error.message : String(error),
      note: 'Document not indexed - search may be temporarily inconsistent',
    })

    // TODO: Consider adding to dead letter queue for manual reprocessing
    // or triggering a CloudWatch alarm for monitoring
  }
}

/**
 * Delete document from OpenSearch with retry (non-blocking)
 *
 * @param params - Delete parameters
 * @param context - Optional context for logging
 */
export function deleteDocumentNonBlocking(
  params: {
    index: string
    id: string
  },
  context?: string,
): void {
  // Fire-and-forget: Don't await, don't block
  void deleteDocumentWithRetry(params, context)
}

/**
 * Internal function for delete with retry
 */
async function deleteDocumentWithRetry(
  params: {
    index: string
    id: string
  },
  context?: string,
): Promise<void> {
  try {
    await retryWithBackoff(
      async () => {
        try {
          await deleteDocument(params)

          logger.info('Document deleted from OpenSearch', {
            context,
            index: params.index,
            id: params.id,
          })
        } catch (error) {
          throw new SearchError(
            `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`,
            {
              context,
              index: params.index,
              id: params.id,
            },
          )
        }
      },
      {
        maxAttempts: 2,
        baseDelay: 300,
        maxDelay: 2000,
        jitter: true,
        context: context ? `opensearch-delete:${context}` : 'opensearch-delete',
      },
    )
  } catch (error) {
    logger.error('OpenSearch delete failed after retries (non-blocking)', {
      context,
      index: params.index,
      id: params.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Determine if an OpenSearch error is retryable
 *
 * @param error - The error to check
 * @returns true if error should be retried
 */
function isOpenSearchErrorRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  // Check for retryable patterns
  const retryablePatterns = [
    'timeout',
    'connection',
    'network',
    'unavailable',
    'throttl',
    'too many requests',
    '429',
    '503',
    '500',
    'temporary',
    'transient',
  ]

  return retryablePatterns.some(pattern => message.includes(pattern) || name.includes(pattern))
}

/**
 * Blocking version of index with retry
 * Use this only when you need to wait for indexing to complete
 *
 * @param params - Index parameters
 * @param context - Optional context for logging
 * @returns Promise that resolves when indexing completes
 */
export async function indexDocumentWithRetryBlocking(
  params: {
    index: string
    id: string
    body: Record<string, unknown>
  },
  context?: string,
): Promise<void> {
  return await indexDocumentWithRetry(params, context)
}
