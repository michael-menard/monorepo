/**
 * Write Merge Artifact Node
 *
 * Constructs MergeArtifact from graph state and writes MERGE.yaml atomically.
 *
 * Uses direct atomic filesystem write (write to temp file, then fs.rename() to final path)
 * per AC-18 — does NOT use YamlArtifactWriter (merge type is not registered).
 *
 * Runs on ALL terminal paths (MERGE_COMPLETE, MERGE_FAIL, MERGE_BLOCKED).
 * Sets mergeComplete: true when done.
 *
 * AC-11, AC-18, AC-17
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { logger } from '@repo/logger'
import { createMergeArtifact } from '../../artifacts/merge.js'
import type { MergeGraphState, MergeGraphConfig } from '../../graphs/merge.js'

// ============================================================================
// Node Factory (AC-11, AC-18)
// ============================================================================

/**
 * Creates the write-merge-artifact node function.
 *
 * Writes MERGE.yaml using atomic temp+rename pattern (AC-18).
 * Does NOT use YamlArtifactWriter.
 */
export function createWriteMergeArtifactNode(
  config: MergeGraphConfig,
  opts: {
    /** Override write path for testing */
    outputDir?: string
  } = {},
): (state: MergeGraphState) => Promise<Partial<MergeGraphState>> {
  return async (state: MergeGraphState): Promise<Partial<MergeGraphState>> => {
    const startTime = Date.now()
    const {
      storyId,
      mergeVerdict,
      prNumber,
      prUrl,
      mergeCommitSha,
      ciStatus,
      ciPollCount,
      ciStartTime,
      rebaseSuccess,
      worktreeCleanedUp,
      learningsPersisted,
      errors,
    } = state

    // Calculate CI duration from ciStartTime
    const ciDurationMs = ciStartTime ? Date.now() - ciStartTime : 0

    // Extract block reason from errors if verdict is MERGE_BLOCKED
    const blockReason =
      mergeVerdict === 'MERGE_BLOCKED' && errors.length > 0 ? errors[0] : null

    // Extract first error if verdict is MERGE_FAIL
    const errorMsg =
      mergeVerdict === 'MERGE_FAIL' && errors.length > 0 ? errors[0] : null

    // Construct MergeArtifact
    const artifact = createMergeArtifact({
      storyId,
      verdict: mergeVerdict ?? 'MERGE_FAIL',
      prNumber: prNumber ?? null,
      prUrl: prUrl ?? null,
      mergeCommitSha: mergeCommitSha ?? null,
      ciStatus: ciStatus === 'pass' || ciStatus === 'fail' || ciStatus === 'timeout' ? ciStatus : null,
      ciPollCount: ciPollCount ?? 0,
      ciDurationMs,
      rebaseSuccess: rebaseSuccess ?? null,
      worktreeCleanedUp: worktreeCleanedUp ?? false,
      learningsPersisted: learningsPersisted ?? false,
      blockReason,
      error: errorMsg,
    })

    // Determine output directory
    const outputDir =
      opts.outputDir ??
      path.join(config.featureDir, 'in-progress', storyId)

    const finalPath = path.join(outputDir, 'MERGE.yaml')
    const tmpPath = path.join(outputDir, `MERGE.yaml.tmp.${Date.now()}`)

    try {
      // Ensure directory exists
      await fs.mkdir(outputDir, { recursive: true })

      // Atomic write: write to temp then rename (AC-18)
      const yamlContent = yaml.stringify(artifact)
      await fs.writeFile(tmpPath, yamlContent, 'utf-8')
      await fs.rename(tmpPath, finalPath)

      logger.info('merge_artifact_written', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        verdict: artifact.verdict,
        path: finalPath,
      })

      return {
        mergeComplete: true,
        mergeArtifact: artifact,
      }
    } catch (error) {
      const errorMessage = `Failed to write MERGE.yaml: ${error instanceof Error ? error.message : String(error)}`

      logger.warn('merge_artifact_written', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        error: errorMessage,
      })

      // Clean up temp file if it exists
      try {
        await fs.unlink(tmpPath)
      } catch {
        // Ignore cleanup error
      }

      return {
        mergeComplete: false,
        errors: [errorMessage],
      }
    }
  }
}
