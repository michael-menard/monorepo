/**
 * Evidence Production Node
 *
 * Writes EVIDENCE.yaml to the story feature directory using EvidenceSchema
 * helpers (createEvidence, addTouchedFile, addCommandRun) and
 * yaml-artifact-writer for filesystem persistence.
 *
 * Handles empty/partial change loop state gracefully (completedChanges may be []).
 *
 * Logs: evidence_written event with storyId, attemptNumber, durationMs.
 *
 * TODO(APIP-1032): Add evidence-write failure recovery path if yaml-artifact-writer
 * fails (e.g. retry with backoff or deferred EVIDENCE.yaml write).
 *
 * APIP-1031 AC-9
 */

import * as path from 'path'
import * as fs from 'fs/promises'
import * as yaml from 'yaml'
import { logger } from '@repo/logger'
import {
  createEvidence,
  addTouchedFile,
  addCommandRun,
  EvidenceSchema,
} from '../artifacts/evidence.js'
import type { ImplementationGraphState } from '../graphs/implementation.js'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Resolves the EVIDENCE.yaml output path within the story feature directory.
 */
function resolveEvidencePath(featureDir: string, storyId: string): string {
  return path.join(featureDir, 'in-progress', storyId, '_implementation', 'EVIDENCE.yaml')
}

/**
 * Writes content to a file, creating parent directories as needed.
 */
async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })

  // Atomic: write to temp, then rename
  const tempPath = `${filePath}.${Math.random().toString(36).slice(2)}.tmp`
  try {
    await fs.writeFile(tempPath, content, 'utf-8')
    await fs.rename(tempPath, filePath)
  } catch (error) {
    // Clean up temp file on failure
    try {
      await fs.unlink(tempPath)
    } catch {
      // ignore
    }
    throw error
  }
}

// ============================================================================
// Node implementation
// ============================================================================

/**
 * evidence-production node.
 *
 * Builds an EvidenceSchema-conformant object from current state and writes
 * EVIDENCE.yaml to the story's _implementation directory.
 *
 * Handles partial/empty change loop state gracefully — completedChanges: []
 * is valid and produces an evidence file with empty touched_files.
 */
export async function evidenceProductionNode(
  state: ImplementationGraphState,
): Promise<Partial<ImplementationGraphState>> {
  const startTime = Date.now()
  const { storyId, attemptNumber, featureDir, completedChanges } = state

  const evidencePath = resolveEvidencePath(featureDir, storyId)

  // Build evidence object using EvidenceSchema helpers
  let evidence = createEvidence(storyId)

  // Add touched files from completed changes (graceful with empty array)
  for (const change of completedChanges ?? []) {
    for (const filePath of change.touchedFiles ?? []) {
      evidence = addTouchedFile(evidence, {
        path: filePath,
        action: 'modified',
        description: `From change: ${change.changeSpecId} — ${change.commitMessage}`,
      })
    }
  }

  // Record the implementation attempt as a command run
  evidence = addCommandRun(evidence, {
    command: `implementation:${storyId}:attempt:${attemptNumber}`,
    result: completedChanges.length > 0 ? 'SUCCESS' : 'SKIPPED',
    output: `${completedChanges.length} change(s) completed`,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
  })

  // Validate against EvidenceSchema before writing
  const validated = EvidenceSchema.parse(evidence)
  const yamlContent = yaml.stringify(validated, { indent: 2 })

  try {
    await writeFileAtomic(evidencePath, yamlContent)
  } catch (error) {
    // TODO(APIP-1032): Add evidence-write failure recovery path
    const errMsg = error instanceof Error ? error.message : String(error)
    logger.warn('evidence_write_failed', {
      storyId,
      stage: 'implementation',
      durationMs: Date.now() - startTime,
      attemptNumber,
      evidencePath,
      error: errMsg,
    })

    return {
      evidencePath: null,
      evidenceWritten: false,
      warnings: [`Failed to write EVIDENCE.yaml: ${errMsg}`],
    }
  }

  const durationMs = Date.now() - startTime

  logger.info('evidence_written', {
    storyId,
    stage: 'implementation',
    durationMs,
    attemptNumber,
    evidencePath,
    completedChanges: completedChanges.length,
  })

  return {
    evidencePath,
    evidenceWritten: true,
  }
}
