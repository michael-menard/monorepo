/**
 * No-Op KB Writer
 *
 * Fallback writer used when KB dependencies are not configured.
 * Returns failure results but does not throw errors or crash workflow.
 *
 * @see LNGG-0050 AC-3
 */

import { logger } from '@repo/logger'
import type {
  KbLessonRequest,
  KbDecisionRequest,
  KbConstraintRequest,
  KbRunbookRequest,
  KbNoteRequest,
  KbWriteRequest,
  KbWriteResult,
  KbBatchWriteResult,
} from './__types__/index.js'

const KB_UNAVAILABLE_ERROR = 'KB dependencies not configured'

/**
 * No-op KB Writer that gracefully handles missing KB dependencies
 */
export class NoOpKbWriter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addLesson(_request: KbLessonRequest): Promise<KbWriteResult> {
    logger.warn('KB write skipped - dependencies not configured', {
      entryType: 'lesson',
    })
    return {
      success: false,
      skipped: false,
      error: KB_UNAVAILABLE_ERROR,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addDecision(_request: KbDecisionRequest): Promise<KbWriteResult> {
    logger.warn('KB write skipped - dependencies not configured', {
      entryType: 'decision',
    })
    return {
      success: false,
      skipped: false,
      error: KB_UNAVAILABLE_ERROR,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addConstraint(_request: KbConstraintRequest): Promise<KbWriteResult> {
    logger.warn('KB write skipped - dependencies not configured', {
      entryType: 'constraint',
    })
    return {
      success: false,
      skipped: false,
      error: KB_UNAVAILABLE_ERROR,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addRunbook(_request: KbRunbookRequest): Promise<KbWriteResult> {
    logger.warn('KB write skipped - dependencies not configured', {
      entryType: 'runbook',
    })
    return {
      success: false,
      skipped: false,
      error: KB_UNAVAILABLE_ERROR,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addNote(_request: KbNoteRequest): Promise<KbWriteResult> {
    logger.warn('KB write skipped - dependencies not configured', {
      entryType: 'note',
    })
    return {
      success: false,
      skipped: false,
      error: KB_UNAVAILABLE_ERROR,
    }
  }

  async addMany(requests: KbWriteRequest[]): Promise<KbBatchWriteResult> {
    logger.warn('Batch KB write skipped - dependencies not configured', {
      totalRequests: requests.length,
    })

    return {
      totalRequests: requests.length,
      successCount: 0,
      skippedCount: 0,
      errorCount: requests.length,
      results: requests.map(() => ({
        success: false as const,
        skipped: false as const,
        error: KB_UNAVAILABLE_ERROR,
      })),
      errors: Array(requests.length).fill(KB_UNAVAILABLE_ERROR),
    }
  }
}
