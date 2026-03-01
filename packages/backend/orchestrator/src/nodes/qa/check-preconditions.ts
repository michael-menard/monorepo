/**
 * QA check-preconditions node
 *
 * Reads review and evidence from state. Sets BLOCKED verdict if:
 * - review.verdict === 'FAIL'
 * - evidence is null or fails safeParse
 *
 * Uses createToolNode factory. Emits qa_preconditions_check structured log.
 *
 * AC-3: BLOCKED when review FAIL, BLOCKED when evidence null/invalid
 * AC-16: Lifecycle logging with storyId, stage:'qa', durationMs
 */

import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { EvidenceSchema } from '../../artifacts/evidence.js'
import type { QAGraphState } from '../../graphs/qa.js'

/**
 * Creates the check-preconditions node.
 *
 * Returns a node that validates review and evidence before proceeding with QA.
 */
export function createCheckPreconditionsNode() {
  return createToolNode(
    'qa_check_preconditions',
    async (state: GraphState): Promise<any> => {
      const qaState = state as unknown as QAGraphState
      const startTime = Date.now()

      const storyId = qaState.config?.storyId ?? 'unknown'

      logger.info('qa_preconditions_check', {
        storyId,
        stage: 'qa',
        event: 'check_preconditions_started',
      })

      // Check review verdict
      const review = qaState.review
      if (!review) {
        const durationMs = Date.now() - startTime
        logger.warn('qa_preconditions_check', {
          storyId,
          stage: 'qa',
          event: 'check_preconditions_complete',
          result: 'BLOCKED',
          reason: 'review is null',
          durationMs,
        })
        return {
          preconditionsPassed: false,
          qaVerdict: 'BLOCKED',
          warnings: [`Preconditions BLOCKED: review is null`],
        }
      }

      if (review.verdict === 'FAIL') {
        const durationMs = Date.now() - startTime
        logger.warn('qa_preconditions_check', {
          storyId,
          stage: 'qa',
          event: 'check_preconditions_complete',
          result: 'BLOCKED',
          reason: 'review.verdict is FAIL',
          durationMs,
        })
        return {
          preconditionsPassed: false,
          qaVerdict: 'BLOCKED',
          warnings: [
            `Preconditions BLOCKED: review verdict is FAIL (${review.total_errors} errors)`,
          ],
        }
      }

      // Check evidence validity using safeParse
      const evidence = qaState.evidence
      if (!evidence) {
        const durationMs = Date.now() - startTime
        logger.warn('qa_preconditions_check', {
          storyId,
          stage: 'qa',
          event: 'check_preconditions_complete',
          result: 'BLOCKED',
          reason: 'evidence is null',
          durationMs,
        })
        return {
          preconditionsPassed: false,
          qaVerdict: 'BLOCKED',
          warnings: [`Preconditions BLOCKED: evidence is null`],
        }
      }

      const evidenceParse = EvidenceSchema.safeParse(evidence)
      if (!evidenceParse.success) {
        const durationMs = Date.now() - startTime
        logger.warn('qa_preconditions_check', {
          storyId,
          stage: 'qa',
          event: 'check_preconditions_complete',
          result: 'BLOCKED',
          reason: 'evidence failed schema validation',
          durationMs,
        })
        return {
          preconditionsPassed: false,
          qaVerdict: 'BLOCKED',
          warnings: [`Preconditions BLOCKED: evidence schema invalid: ${evidenceParse.error.message}`],
        }
      }

      const durationMs = Date.now() - startTime
      logger.info('qa_preconditions_check', {
        storyId,
        stage: 'qa',
        event: 'check_preconditions_complete',
        result: 'PASS',
        durationMs,
      })

      return {
        preconditionsPassed: true,
      }
    },
  )
}
