/**
 * evidence_collector Node (dev-implement-v2) — DETERMINISTIC
 *
 * Reads executorOutcome and assembles the final evidence record.
 * Only meaningful when executorOutcome.verdict === 'complete'.
 *
 * Optionally verifies that listed files exist on disk (via readFile adapter).
 *
 * Never fails hard.
 */

import { logger } from '@repo/logger'
import type { DevImplementV2State } from '../../state/dev-implement-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export type ReadFileFn = (path: string) => Promise<string>

// ============================================================================
// Config
// ============================================================================

export type EvidenceCollectorConfig = {
  readFile?: ReadFileFn
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the evidence_collector LangGraph node.
 *
 * DETERMINISTIC — collects and verifies evidence from executorOutcome.
 */
export function createEvidenceCollectorNode(config: EvidenceCollectorConfig = {}) {
  return async (state: DevImplementV2State): Promise<Partial<DevImplementV2State>> => {
    const { storyId, executorOutcome } = state

    logger.info(`evidence_collector: starting for story ${storyId}`)

    if (!executorOutcome || executorOutcome.verdict !== 'complete') {
      logger.warn(
        'evidence_collector: no complete executorOutcome — skipping to postcondition_gate',
      )
      return { devImplementV2Phase: 'postcondition_gate' }
    }

    // Optionally verify files exist on disk
    const allFiles = [...executorOutcome.filesCreated, ...executorOutcome.filesModified]
    const verifiedFiles: string[] = []

    if (config.readFile) {
      for (const file of allFiles) {
        try {
          await config.readFile(file)
          verifiedFiles.push(file)
        } catch {
          // Non-fatal — file may not be readable in test environments
          logger.debug(`evidence_collector: could not read ${file}`)
        }
      }
    }

    logger.info('evidence_collector: complete', {
      storyId,
      filesTotal: allFiles.length,
      filesVerified: verifiedFiles.length,
      acVerified: executorOutcome.acVerification.filter(a => a.verified).length,
      acTotal: executorOutcome.acVerification.length,
    })

    return { devImplementV2Phase: 'postcondition_gate' }
  }
}
