/**
 * KB Sync Worker
 *
 * Documentation worker that syncs story learnings to the Knowledge Base.
 * Implements mandatory deduplication guard from persist-learnings.ts:
 * - Calls kbSearchFn before any kbAddFn call
 * - Skips entries with similarity >= 0.85 (dedup threshold)
 * - Tags all proposed entries with ['auto-generated', 'source:{storyId}']
 * - NEVER proposes deletion (append-only)
 *
 * AC-5, AC-6, AC-7, AC-18: Uses createToolNode (10s timeout) since this
 * worker does NOT call an LLM — it calls KB search/add APIs.
 *
 * APIP-1040: Documentation Graph (Post-Merge)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import type {
  DocWorkerResult,
  DocGraphState,
  ProposedFileChange,
  KbSyncWorkerConfig,
} from '../../graphs/doc-graph.js'

// ============================================================================
// KB Types (matching persist-learnings.ts pattern)
// ============================================================================

type KbSearchInput = {
  query: string
  limit?: number
}

type KbSearchResult = {
  results: Array<{
    id: string
    content: string
    tags: string[] | null
    relevance_score?: number
  }>
}

type KbAddInput = {
  content: string
  tags: string[]
}

type KbAddResult = {
  id: string
  success: boolean
  error?: string
}

// ============================================================================
// Schemas
// ============================================================================

export const KbSyncWorkerNodeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  dryRun: z.boolean().default(false),
  /** AC-18: createToolNode uses 10s timeout since no LLM call */
  timeoutMs: z.number().positive().default(10000),
  model: z.string().default('none'),
  /** Injectable KB search function for testability (from persist-learnings.ts pattern) */
  kbSearchFn: z.function().optional(),
  /** Injectable KB add function for testability */
  kbAddFn: z.function().optional(),
  /** Similarity threshold for deduplication (0.85 per persist-learnings.ts) */
  dedupeThreshold: z.number().min(0).max(1).default(0.85),
})

export type KbSyncWorkerNodeConfig = z.infer<typeof KbSyncWorkerNodeConfigSchema>

// ============================================================================
// Worker Implementation
// ============================================================================

/**
 * Generates KB entry content from merge event data.
 */
function generateKbEntryContent(mergeEvent: NonNullable<DocGraphState['mergeEvent']>): string {
  return [
    `Story ${mergeEvent.storyId} merged on ${mergeEvent.mergedAt}`,
    ``,
    `Branch: ${mergeEvent.mergedBranch}`,
    `Commit: ${mergeEvent.mergeCommitSha}`,
    ``,
    `Summary: ${mergeEvent.diffSummary}`,
    ``,
    `Files changed (${mergeEvent.changedFiles.length}):`,
    mergeEvent.changedFiles.map((f: string) => `- ${f}`).join('\n'),
  ].join('\n')
}

/**
 * AC-7: KB Sync Worker with mandatory dedup guard.
 * Replicates the persist-learnings.ts pattern exactly:
 * - kbSearchFn called before kbAddFn
 * - Skip if relevance_score >= 0.85
 * - Tag with ['auto-generated', 'source:{storyId}']
 * - Never propose deletion (append-only)
 *
 * AC-6: Does NOT write to filesystem. Returns DocWorkerResult with success:true/false.
 */
export async function generateKbSyncChanges(
  mergeEvent: DocGraphState['mergeEvent'],
  config: KbSyncWorkerNodeConfig,
): Promise<DocWorkerResult> {
  const startTime = Date.now()
  const warnings: string[] = []
  const proposedChanges: ProposedFileChange[] = []

  if (!mergeEvent) {
    return {
      workerName: 'kb-sync',
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
    // ED-1: Empty changedFiles — return success with empty proposedChanges + warning
    if (mergeEvent.changedFiles.length === 0) {
      warnings.push(
        `kb-sync: no changed files in merge event for story ${mergeEvent.storyId}`,
      )
      return {
        workerName: 'kb-sync',
        success: true,
        filesUpdated: [],
        proposedChanges: [],
        durationMs: Date.now() - startTime,
        error: null,
        warnings,
        model: config.model,
      }
    }

    const entryContent = generateKbEntryContent(mergeEvent)
    const autoTags = ['auto-generated', `source:${mergeEvent.storyId}`]

    // AC-7: Mandatory dedup guard — kbSearchFn MUST be called before kbAddFn
    if (config.kbSearchFn) {
      const kbSearch = config.kbSearchFn as (input: KbSearchInput) => Promise<KbSearchResult>

      const existing = await kbSearch({
        query: entryContent,
        limit: 5,
      })

      // Check if any existing entry is too similar (>= dedupeThreshold)
      const tooSimilar = existing.results.some(
        r => (r.relevance_score ?? 0) >= config.dedupeThreshold,
      )

      if (tooSimilar) {
        // EC-2: Dedup skip — similar entry exists, skip with warning
        const highestScore = Math.max(...existing.results.map(r => r.relevance_score ?? 0))
        warnings.push(
          `kb-sync: entry skipped — similar content exists (similarity: ${highestScore.toFixed(2)} >= ${config.dedupeThreshold})`,
        )
        logger.debug('kb-sync-worker: dedup guard triggered — skipping entry', {
          storyId: mergeEvent.storyId,
          similarity: highestScore,
          threshold: config.dedupeThreshold,
        })

        return {
          workerName: 'kb-sync',
          success: true,
          filesUpdated: [],
          proposedChanges: [],
          durationMs: Date.now() - startTime,
          error: null,
          warnings,
          model: config.model,
        }
      }

      // Not a duplicate — call kbAddFn if available
      if (config.kbAddFn) {
        const kbAdd = config.kbAddFn as (input: KbAddInput) => Promise<KbAddResult>
        const addResult = await kbAdd({
          content: entryContent,
          tags: autoTags,
        })

        if (!addResult.success) {
          warnings.push(`kb-sync: kbAddFn reported failure: ${addResult.error ?? 'unknown'}`)
        } else {
          logger.info('kb-sync-worker: added entry to KB', {
            storyId: mergeEvent.storyId,
            kbId: addResult.id,
            tags: autoTags,
          })
        }
      }
    } else {
      // No kbSearchFn — propose a file-based KB sync record as fallback
      // Note: 'delete' operation is intentionally NOT included (append-only)
      const proposedDoc: ProposedFileChange = {
        filePath: `docs/kb/auto-sync/${mergeEvent.storyId}.md`,
        operation: 'create',
        content: [
          `---`,
          `tags: [${autoTags.map(t => `'${t}'`).join(', ')}]`,
          `storyId: ${mergeEvent.storyId}`,
          `mergedAt: ${mergeEvent.mergedAt}`,
          `---`,
          ``,
          entryContent,
        ].join('\n'),
        reason: `KB sync record for story ${mergeEvent.storyId} — auto-generated`,
        workerName: 'kb-sync',
      }
      proposedChanges.push(proposedDoc)
      warnings.push('kb-sync: no kbSearchFn configured — falling back to file-based sync')
    }

    logger.info('kb-sync-worker: completed', {
      storyId: mergeEvent.storyId,
      proposedChangesCount: proposedChanges.length,
      warningsCount: warnings.length,
    })

    const durationMs = Date.now() - startTime
    return {
      workerName: 'kb-sync',
      success: true,
      filesUpdated: proposedChanges.map(c => c.filePath),
      proposedChanges,
      durationMs,
      error: null,
      warnings,
      model: config.model,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.warn('kb-sync-worker: error during KB sync', {
      storyId: mergeEvent.storyId,
      error: errorMessage,
    })

    return {
      workerName: 'kb-sync',
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
// LangGraph Node Factory (createToolNode — 10s timeout per AC-18)
// ============================================================================

/**
 * AC-18: KB Sync Worker uses createToolNode (not createLLMNode) because
 * it does not call an LLM — it calls KB search/add APIs.
 */
export const kbSyncWorkerNode = createToolNode(
  'doc-worker-kb-sync',
  async (state: GraphState): Promise<Partial<GraphState>> => {
    const docState = state as unknown as DocGraphState
    const config = KbSyncWorkerNodeConfigSchema.parse({})
    const result = await generateKbSyncChanges(docState.mergeEvent, config)

    return {
      workerResults: [result],
      proposedFileChanges: result.proposedChanges,
    } as unknown as Partial<GraphState>
  },
)

export function createKbSyncWorkerNode(config: Partial<KbSyncWorkerConfig> = {}) {
  const fullConfig = KbSyncWorkerNodeConfigSchema.parse(config)

  return createToolNode(
    'doc-worker-kb-sync',
    async (state: GraphState): Promise<Partial<GraphState>> => {
      const docState = state as unknown as DocGraphState
      const result = await generateKbSyncChanges(docState.mergeEvent, fullConfig)

      return {
        workerResults: [result],
        proposedFileChanges: result.proposedChanges,
      } as unknown as Partial<GraphState>
    },
  )
}
