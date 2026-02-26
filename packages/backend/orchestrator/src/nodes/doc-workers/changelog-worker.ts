/**
 * Changelog Worker
 *
 * Documentation worker that proposes CHANGELOG entries based on the merge event.
 * Reuses Phase 6 changelog drafting logic pattern from doc-sync.ts:
 * semver bump determination + [DRAFT] entry format.
 *
 * AC-5, AC-6, AC-18: Uses createLLMNode (60s timeout, 5 retries).
 *
 * APIP-1040: Documentation Graph (Post-Merge)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createLLMNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import type {
  DocWorkerResult,
  DocGraphState,
  ProposedFileChange,
  ChangelogWorkerConfig,
} from '../../graphs/doc-graph.js'

// ============================================================================
// Schemas
// ============================================================================

export const ChangelogWorkerNodeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  dryRun: z.boolean().default(false),
  timeoutMs: z.number().positive().default(120000),
  model: z.string().default('gpt-4o-mini'),
  changelogPath: z.string().default('CHANGELOG.md'),
})

export type ChangelogWorkerNodeConfig = z.infer<typeof ChangelogWorkerNodeConfigSchema>

// ============================================================================
// Worker Implementation
// ============================================================================

/**
 * Determines semver bump type based on changed files.
 * Reuses Phase 6 logic pattern from doc-sync.ts.
 */
function determineSemverBump(changedFiles: string[]): 'major' | 'minor' | 'patch' {
  // Heuristic: breaking changes in API files or DB schema = major
  const hasMajorChanges = changedFiles.some(
    f => f.includes('database-schema') || f.includes('migration') || f.includes('breaking'),
  )
  if (hasMajorChanges) return 'major'

  // New files in API or features = minor
  const hasMinorChanges = changedFiles.some(
    f => f.includes('apps/api/src/handlers/') || f.includes('apps/web/') || f.includes('packages/'),
  )
  if (hasMinorChanges) return 'minor'

  return 'patch'
}

/**
 * Generates CHANGELOG entry proposals using Phase 6 doc-sync.ts pattern.
 * AC-6: Does NOT write to filesystem — returns DocWorkerResult.
 */
export async function generateChangelogChanges(
  mergeEvent: DocGraphState['mergeEvent'],
  config: ChangelogWorkerNodeConfig,
): Promise<DocWorkerResult> {
  const startTime = Date.now()
  const warnings: string[] = []
  const proposedChanges: ProposedFileChange[] = []

  if (!mergeEvent) {
    return {
      workerName: 'changelog',
      success: false,
      filesUpdated: [],
      proposedChanges: [],
      durationMs: Date.now() - startTime,
      error: 'No merge event provided',
      warnings: [],
      model: config.model,
    }
  }

  try {
    // ED-1: Empty changedFiles — still propose an entry (changelog always gets updated)
    if (mergeEvent.changedFiles.length === 0) {
      warnings.push(
        `changelog: no changed files in merge event for story ${mergeEvent.storyId} — proposing minimal entry`,
      )
      return {
        workerName: 'changelog',
        success: true,
        filesUpdated: [],
        proposedChanges: [],
        durationMs: Date.now() - startTime,
        error: null,
        warnings,
        model: config.model,
      }
    }

    // Phase 6 pattern from doc-sync.ts: semver bump + [DRAFT] entry
    const bumpType = determineSemverBump(mergeEvent.changedFiles)
    const today = new Date().toISOString().split('T')[0]

    const changelogEntry = [
      `## [DRAFT] - ${today}`,
      ``,
      `### ${bumpType === 'major' ? 'Breaking Changes' : bumpType === 'minor' ? 'Features' : 'Bug Fixes'}`,
      ``,
      `- **${mergeEvent.storyId}**: ${mergeEvent.diffSummary}`,
      `  - Branch: \`${mergeEvent.mergedBranch}\``,
      `  - Commit: \`${mergeEvent.mergeCommitSha}\``,
      `  - Files changed: ${mergeEvent.changedFiles.length}`,
      ``,
    ].join('\n')

    const proposedDoc: ProposedFileChange = {
      filePath: config.changelogPath,
      operation: 'update',
      content: changelogEntry,
      reason: `Changelog [DRAFT] entry for story ${mergeEvent.storyId} (${bumpType} bump): ${mergeEvent.changedFiles.length} file(s) changed`,
      workerName: 'changelog',
    }

    proposedChanges.push(proposedDoc)

    logger.info('changelog-worker: proposed changelog entry', {
      storyId: mergeEvent.storyId,
      bumpType,
      changelogPath: config.changelogPath,
    })

    const durationMs = Date.now() - startTime
    return {
      workerName: 'changelog',
      success: true,
      filesUpdated: [config.changelogPath],
      proposedChanges,
      durationMs,
      error: null,
      warnings,
      model: config.model,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.warn('changelog-worker: error generating changelog entry', {
      storyId: mergeEvent.storyId,
      error: errorMessage,
    })

    return {
      workerName: 'changelog',
      success: false,
      filesUpdated: [],
      proposedChanges: [],
      durationMs: Date.now() - startTime,
      error: errorMessage,
      warnings,
      model: config.model,
    }
  }
}

// ============================================================================
// LangGraph Node Factory
// ============================================================================

export const changelogWorkerNode = createLLMNode(
  'doc-worker-changelog',
  async (state: GraphState): Promise<Partial<GraphState>> => {
    const docState = state as unknown as DocGraphState
    const config = ChangelogWorkerNodeConfigSchema.parse({})
    const result = await generateChangelogChanges(docState.mergeEvent, config)

    return {
      workerResults: [result],
      proposedFileChanges: result.proposedChanges,
    } as unknown as Partial<GraphState>
  },
)

export function createChangelogWorkerNode(config: Partial<ChangelogWorkerConfig> = {}) {
  const fullConfig = ChangelogWorkerNodeConfigSchema.parse(config)

  return createLLMNode(
    'doc-worker-changelog',
    async (state: GraphState): Promise<Partial<GraphState>> => {
      const docState = state as unknown as DocGraphState
      const result = await generateChangelogChanges(docState.mergeEvent, fullConfig)

      return {
        workerResults: [result],
        proposedFileChanges: result.proposedChanges,
      } as unknown as Partial<GraphState>
    },
  )
}
