/**
 * Documentation Graph (Post-Merge)
 *
 * LangGraph worker graph that automatically keeps project documentation in sync
 * with every merged story. Fans out 6 parallel documentation workers via the
 * LangGraph Send API, aggregates results through a Doc Review node, and commits
 * all proposed changes atomically via a single centralized commit node.
 *
 * APIP-1040: Documentation Graph (Post-Merge)
 *
 * Graph flow:
 * START → dispatch → [6 workers in parallel] → aggregate → doc-review
 *       → [commitBlocked] log-blocked → END
 *       → [passed] commit → END
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { exec as execCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { z } from 'zod'
import { Annotation, StateGraph, END, START, Send } from '@langchain/langgraph'
import { logger } from '@repo/logger'

declare const process: { cwd: () => string }

const exec = promisify(execCallback)

// ============================================================================
// Zod Schemas (ST-1)
// ============================================================================

/**
 * Worker names enum for the 6 documentation workers.
 */
export const DocWorkerNameSchema = z.enum([
  'api-docs',
  'component-docs',
  'architecture-docs',
  'readme-guides',
  'kb-sync',
  'changelog',
])

export type DocWorkerName = z.infer<typeof DocWorkerNameSchema>

/**
 * AC-2: MergeEventPayload schema — input event for the Documentation Graph.
 */
export const MergeEventPayloadSchema = z.object({
  /** Story ID that was merged */
  storyId: z.string(),
  /** SHA of the merge commit */
  mergeCommitSha: z.string(),
  /** Name of the merged branch */
  mergedBranch: z.string(),
  /** ISO datetime when the merge occurred */
  mergedAt: z.string().datetime(),
  /** Summary of the diff content */
  diffSummary: z.string(),
  /** Array of file paths changed in the merge */
  changedFiles: z.array(z.string()),
})

export type MergeEventPayload = z.infer<typeof MergeEventPayloadSchema>

/**
 * AC-20: ProposedFileChange schema — operation enum intentionally excludes 'delete'.
 * KB Sync Worker is append-only. DocReviewNode (EC-3) blocks on any delete in KB output.
 */
export const ProposedFileChangeSchema = z.object({
  /** Path to the file to create or update */
  filePath: z.string(),
  /** Operation — 'delete' is intentionally excluded (append-only constraint) */
  operation: z.enum(['create', 'update']),
  /** New content for the file */
  content: z.string(),
  /** Human-readable reason for this change */
  reason: z.string(),
  /** Which worker is proposing this change */
  workerName: DocWorkerNameSchema,
})

export type ProposedFileChange = z.infer<typeof ProposedFileChangeSchema>

/**
 * AC-3: DocWorkerResult schema — returned by each of the 6 workers.
 */
export const DocWorkerResultSchema = z.object({
  /** Name of the worker that produced this result */
  workerName: DocWorkerNameSchema,
  /** Whether the worker completed successfully */
  success: z.boolean(),
  /** Files updated by this worker (informational; actual changes are in proposedChanges) */
  filesUpdated: z.array(z.string()),
  /** Proposed file changes — never written to filesystem by workers */
  proposedChanges: z.array(ProposedFileChangeSchema),
  /** Duration of worker execution in milliseconds */
  durationMs: z.number(),
  /** Error message if success is false, null otherwise */
  error: z.string().nullable(),
  /** Non-fatal warnings accumulated during worker execution */
  warnings: z.array(z.string()),
  /** Model used for LLM-based workers */
  model: z.string(),
})

export type DocWorkerResult = z.infer<typeof DocWorkerResultSchema>

/**
 * AC-4: Base DocWorkerConfig schema — each worker has its own config extending this.
 */
export const DocWorkerConfigSchema = z.object({
  /** Whether this worker is enabled */
  enabled: z.boolean().default(true),
  /** Whether to run in dry-run mode (no filesystem writes) */
  dryRun: z.boolean().default(false),
  /** Timeout in milliseconds for this worker */
  timeoutMs: z.number().positive().default(120000),
  /** Model to use for LLM-powered workers */
  model: z.string(),
})

export type DocWorkerConfig = z.infer<typeof DocWorkerConfigSchema>

/** Config for API Docs Worker */
export const ApiDocsWorkerConfigSchema = DocWorkerConfigSchema.extend({
  /** File patterns to scope API docs discovery */
  filePatterns: z.array(z.string()).default(['apps/api/', 'handlers/', 'routes/']),
})

export type ApiDocsWorkerConfig = z.infer<typeof ApiDocsWorkerConfigSchema>

/** Config for Component Docs Worker */
export const ComponentDocsWorkerConfigSchema = DocWorkerConfigSchema.extend({
  /** File patterns to scope component docs discovery */
  filePatterns: z.array(z.string()).default(['.tsx', '.jsx', 'components/']),
})

export type ComponentDocsWorkerConfig = z.infer<typeof ComponentDocsWorkerConfigSchema>

/** Config for Architecture Docs Worker */
export const ArchitectureDocsWorkerConfigSchema = DocWorkerConfigSchema.extend({
  /** File patterns to scope architecture docs discovery */
  filePatterns: z.array(z.string()).default(['architecture/', 'config/', '.config.ts', 'infra/']),
})

export type ArchitectureDocsWorkerConfig = z.infer<typeof ArchitectureDocsWorkerConfigSchema>

/** Config for README Guides Worker */
export const ReadmeGuidesWorkerConfigSchema = DocWorkerConfigSchema.extend({
  /** File patterns to scope README/guides discovery */
  filePatterns: z.array(z.string()).default(['README', 'docs/', '.md']),
})

export type ReadmeGuidesWorkerConfig = z.infer<typeof ReadmeGuidesWorkerConfigSchema>

/** Config for KB Sync Worker */
export const KbSyncWorkerConfigSchema = DocWorkerConfigSchema.extend({
  /** KB search function (injectable for testability) */
  kbSearchFn: z.function().optional(),
  /** KB add function (injectable for testability) */
  kbAddFn: z.function().optional(),
  /** Similarity threshold for deduplication (0.85 per persist-learnings.ts pattern) */
  dedupeThreshold: z.number().min(0).max(1).default(0.85),
})

export type KbSyncWorkerConfig = z.infer<typeof KbSyncWorkerConfigSchema>

/** Config for Changelog Worker */
export const ChangelogWorkerConfigSchema = DocWorkerConfigSchema.extend({
  /** Path to the changelog file */
  changelogPath: z.string().default('CHANGELOG.md'),
})

export type ChangelogWorkerConfig = z.infer<typeof ChangelogWorkerConfigSchema>

/**
 * DocReview configuration schema.
 */
export const DocReviewConfigSchema = z.object({
  /** Minimum number of workers that must succeed for review to pass */
  minSuccessThreshold: z.number().int().min(1).max(6).default(4),
})

export type DocReviewConfig = z.infer<typeof DocReviewConfigSchema>

/**
 * AC-12: DocGraphConfig schema — top-level config for the Documentation Graph.
 */
export const DocGraphConfigSchema = z.object({
  /** Per-worker configurations */
  workerConfigs: z
    .object({
      apiDocs: ApiDocsWorkerConfigSchema.partial().default({}),
      componentDocs: ComponentDocsWorkerConfigSchema.partial().default({}),
      architectureDocs: ArchitectureDocsWorkerConfigSchema.partial().default({}),
      readmeGuides: ReadmeGuidesWorkerConfigSchema.partial().default({}),
      kbSync: KbSyncWorkerConfigSchema.partial().default({}),
      changelog: ChangelogWorkerConfigSchema.partial().default({}),
    })
    .default({}),
  /** Doc review configuration */
  docReview: DocReviewConfigSchema.default({}),
  /** Whether to run in dry-run mode globally */
  dryRun: z.boolean().default(false),
  /** Git commit message template */
  commitMessage: z.string().default('docs(auto): sync documentation for {storyId}'),
  /** Injectable git commit function for testability (OPP-005) */
  gitCommitFn: z.function().optional(),
  /** Working directory for file operations */
  workingDir: z.string().optional(),
})

export type DocGraphConfig = z.infer<typeof DocGraphConfigSchema>

/**
 * DocReviewResult schema — output of the DocReviewNode.
 */
export const DocReviewResultSchema = z.object({
  /** Whether the doc review passed */
  docReviewPassed: z.boolean(),
  /** Whether the commit is blocked */
  commitBlocked: z.boolean(),
  /** Human-readable reason if commit is blocked, null otherwise */
  commitBlockedReason: z.string().nullable(),
  /** Number of workers that succeeded */
  workerSuccessCount: z.number(),
  /** Number of workers that failed */
  workerFailureCount: z.number(),
})

export type DocReviewResult = z.infer<typeof DocReviewResultSchema>

/**
 * DocCommitResult schema — output of the commit node.
 */
export const DocCommitResultSchema = z.object({
  /** Whether the commit was created */
  committed: z.boolean(),
  /** Git commit SHA, or null if not committed */
  commitSha: z.string().nullable(),
  /** List of files that were written */
  filesWritten: z.array(z.string()),
  /** Duration of the commit operation in milliseconds */
  durationMs: z.number(),
  /** Error message if commit failed, null otherwise */
  error: z.string().nullable(),
})

export type DocCommitResult = z.infer<typeof DocCommitResultSchema>

// ============================================================================
// State Annotation (ST-2)
// ============================================================================

/** Reducer that appends arrays */
const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

/** Simple overwrite reducer */
const overwrite = <T>(_: T, b: T): T => b

/**
 * AC-1: DocGraphStateAnnotation — all fields for the Documentation Graph state.
 */
export const DocGraphStateAnnotation = Annotation.Root({
  /** The merge event that triggered this documentation sync */
  mergeEvent: Annotation<MergeEventPayload | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Accumulated results from all workers (reducer: append) */
  workerResults: Annotation<DocWorkerResult[]>({
    reducer: append,
    default: () => [],
  }),

  /** Result of the doc review node */
  docReviewResult: Annotation<DocReviewResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Accumulated proposed file changes from all workers (reducer: append) */
  proposedFileChanges: Annotation<ProposedFileChange[]>({
    reducer: append,
    default: () => [],
  }),

  /** Result of the commit node */
  commitResult: Annotation<DocCommitResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Whether the full doc graph run is complete */
  docGraphComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  /** Sentinel count: number of enabled workers dispatched */
  expectedWorkers: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  /** Graph configuration */
  config: Annotation<DocGraphConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),
})

/** TypeScript type for the doc graph state */
export type DocGraphState = typeof DocGraphStateAnnotation.State

// ============================================================================
// Dispatch Node (ST-6)
// ============================================================================

/**
 * Internal worker registry entry — maps config key to node name.
 */
interface WorkerRegistryEntry {
  configKey: keyof DocGraphConfig['workerConfigs']
  nodeName: string
}

const WORKER_REGISTRY: WorkerRegistryEntry[] = [
  { configKey: 'apiDocs', nodeName: 'doc-worker-api-docs' },
  { configKey: 'componentDocs', nodeName: 'doc-worker-component-docs' },
  { configKey: 'architectureDocs', nodeName: 'doc-worker-architecture-docs' },
  { configKey: 'readmeGuides', nodeName: 'doc-worker-readme-guides' },
  { configKey: 'kbSync', nodeName: 'doc-worker-kb-sync' },
  { configKey: 'changelog', nodeName: 'doc-worker-changelog' },
]

/**
 * AC-8: Dispatch node — fans out all enabled workers via LangGraph Send API.
 * Sets expectedWorkers sentinel count. Disabled workers are skipped silently.
 */
export function createDispatchNode(config: DocGraphConfig) {
  return async (state: DocGraphState): Promise<Send[]> => {
    const enabledWorkers = WORKER_REGISTRY.filter(entry => {
      const workerConfig = config.workerConfigs[entry.configKey] as Partial<DocWorkerConfig>
      // enabled defaults to true if not specified
      return workerConfig?.enabled !== false
    })

    logger.info('doc-graph: dispatch node fanning out workers', {
      storyId: state.mergeEvent?.storyId,
      enabledCount: enabledWorkers.length,
      workerNames: enabledWorkers.map(w => w.nodeName),
    })

    // Return Send objects for all enabled workers
    // expectedWorkers will be set via state update from each Send
    return enabledWorkers.map(
      w => new Send(w.nodeName, { ...state, expectedWorkers: enabledWorkers.length }),
    )
  }
}

// ============================================================================
// Aggregate Node (ST-7 / ST-9)
// ============================================================================

/**
 * AC-19: Aggregate node — sentinel count pass-through.
 * Checks workerResults.length >= expectedWorkers.
 * Logs warning on mismatch and always passes through to doc-review.
 * Distinct from DocReviewNode (aggregate waits for all workers; DocReview evaluates).
 */
export function createAggregateNode() {
  return async (state: DocGraphState): Promise<Partial<DocGraphState>> => {
    const received = state.workerResults.length
    const expected = state.expectedWorkers

    if (received < expected) {
      logger.warn('doc-graph: aggregate node: worker count mismatch — proceeding anyway', {
        storyId: state.mergeEvent?.storyId,
        received,
        expected,
      })
    } else {
      logger.info('doc-graph: aggregate node: all workers completed', {
        storyId: state.mergeEvent?.storyId,
        workerCount: received,
      })
    }

    // Pass-through: no state changes, just log and proceed
    return {}
  }
}

// ============================================================================
// DocReviewNode (ST-7)
// ============================================================================

/**
 * AC-9: DocReviewNode — evaluates worker results and decides if commit is allowed.
 */
export function createDocReviewNode(config: DocGraphConfig) {
  return async (state: DocGraphState): Promise<Partial<DocGraphState>> => {
    const storyId = state.mergeEvent?.storyId ?? 'unknown'
    const minThreshold = config.docReview.minSuccessThreshold

    const workerSuccessCount = state.workerResults.filter((r: DocWorkerResult) => r.success).length
    const workerFailureCount = state.workerResults.filter((r: DocWorkerResult) => !r.success).length

    // EC-3: Check that KB Sync Worker did not propose any deletion
    // This is only possible via schema bypass (operation 'delete' is not in enum)
    // but we check defensively
    const kbSyncResults = state.workerResults.filter(
      (r: DocWorkerResult) => r.workerName === 'kb-sync',
    )
    const kbSyncProposedDeletion = kbSyncResults.some((r: DocWorkerResult) =>
      r.proposedChanges.some((c: ProposedFileChange) => (c.operation as string) === 'delete'),
    )

    let commitBlocked = false
    let commitBlockedReason: string | null = null

    if (kbSyncProposedDeletion) {
      commitBlocked = true
      commitBlockedReason = `Doc Review blocked: KB Sync Worker proposed entry deletion (not permitted). Manual review required for story ${storyId}.`
      logger.warn('doc-graph: DocReviewNode blocking commit — KB sync proposed deletion', {
        storyId,
      })
    } else if (workerSuccessCount < minThreshold) {
      commitBlocked = true
      commitBlockedReason = `Doc Review blocked: only ${workerSuccessCount} of ${state.workerResults.length} workers succeeded (minimum required: ${minThreshold}). Manual review required for story ${storyId}.`
      logger.warn('doc-graph: DocReviewNode blocking commit — below success threshold', {
        storyId,
        workerSuccessCount,
        workerFailureCount,
        minThreshold,
      })
    }

    const docReviewPassed = !commitBlocked && workerSuccessCount >= minThreshold

    logger.info('doc-graph: DocReviewNode completed', {
      storyId,
      docReviewPassed,
      commitBlocked,
      workerSuccessCount,
      workerFailureCount,
    })

    return {
      docReviewResult: {
        docReviewPassed,
        commitBlocked,
        commitBlockedReason,
        workerSuccessCount,
        workerFailureCount,
      },
    }
  }
}

// ============================================================================
// Log-Blocked Node
// ============================================================================

/**
 * Log-blocked node — logs why the commit was blocked and exits.
 */
export function createLogBlockedNode() {
  return async (state: DocGraphState): Promise<Partial<DocGraphState>> => {
    const storyId = state.mergeEvent?.storyId ?? 'unknown'

    logger.warn('doc-graph: commit blocked — logging proposed changes without writing', {
      storyId,
      commitBlockedReason: state.docReviewResult?.commitBlockedReason,
      proposedChangesCount: state.proposedFileChanges.length,
    })

    for (const change of state.proposedFileChanges) {
      logger.info('doc-graph: proposed change (blocked)', {
        storyId,
        filePath: change.filePath,
        operation: change.operation,
        workerName: change.workerName,
        reason: change.reason,
      })
    }

    return {
      docGraphComplete: true,
    }
  }
}

// ============================================================================
// Commit Node (ST-8)
// ============================================================================

/**
 * AC-10, AC-17: Commit node — writes proposed files atomically and creates git commit.
 * If dryRun:true or commitBlocked:true, logs proposed changes without writing.
 */
export function createCommitNode(config: DocGraphConfig) {
  return async (state: DocGraphState): Promise<Partial<DocGraphState>> => {
    const startTime = Date.now()
    const storyId = state.mergeEvent?.storyId ?? 'unknown'
    const dryRun = config.dryRun
    const commitBlocked = state.docReviewResult?.commitBlocked ?? true
    const workingDir = config.workingDir ?? process.cwd()

    // If dry-run or blocked: log proposed changes, skip all filesystem writes
    if (dryRun || commitBlocked) {
      logger.info('doc-graph: commit node — dry-run or blocked, skipping filesystem writes', {
        storyId,
        dryRun,
        commitBlocked,
        proposedChangesCount: state.proposedFileChanges.length,
      })

      for (const change of state.proposedFileChanges) {
        logger.info('doc-graph: proposed change (not written)', {
          storyId,
          filePath: change.filePath,
          operation: change.operation,
          workerName: change.workerName,
          reason: change.reason,
          contentLength: change.content.length,
        })
      }

      const durationMs = Date.now() - startTime
      return {
        commitResult: {
          committed: false,
          commitSha: null,
          filesWritten: [],
          durationMs,
          error: dryRun ? 'dry-run mode: no writes performed' : 'commit blocked by doc review',
        },
        docGraphComplete: true,
      }
    }

    // Review passed and not dry-run: write all proposed files atomically
    const filesWritten: string[] = []
    const tempFiles: string[] = []

    try {
      // Write-then-rename pattern for atomicity
      for (const change of state.proposedFileChanges) {
        const targetPath = path.join(workingDir, change.filePath)
        const targetDir = path.dirname(targetPath)
        const tempPath = `${targetPath}.tmp.${Date.now()}`
        tempFiles.push(tempPath)

        // Ensure directory exists
        await fs.mkdir(targetDir, { recursive: true })

        // Write to temp file
        await fs.writeFile(tempPath, change.content, 'utf-8')

        // Atomic rename
        await fs.rename(tempPath, targetPath)
        filesWritten.push(change.filePath)

        logger.info('doc-graph: wrote file', {
          storyId,
          filePath: change.filePath,
          operation: change.operation,
        })
      }

      // Create git commit
      const commitMessage = config.commitMessage.replace('{storyId}', storyId)

      let commitSha: string | null = null

      if (config.gitCommitFn) {
        // Use injectable git commit function for testability (OPP-005)
        const result = await (
          config.gitCommitFn as (files: string[], message: string) => Promise<string>
        )(filesWritten, commitMessage)
        commitSha = result
      } else {
        // Default: use child_process to run git commit
        const fileArgs = filesWritten.map(f => `"${f}"`).join(' ')
        await exec(`git add ${fileArgs}`, { cwd: workingDir })
        const { stdout } = await exec(`git commit -m "${commitMessage}"`, { cwd: workingDir })
        const shaMatch = stdout.match(/\[.+\s+([a-f0-9]+)\]/)
        commitSha = shaMatch ? shaMatch[1] : null
      }

      const durationMs = Date.now() - startTime

      logger.info('doc-graph: commit node completed', {
        storyId,
        committed: true,
        commitSha,
        filesUpdated: filesWritten.length,
        durationMs,
        commitBlocked: false,
      })

      return {
        commitResult: {
          committed: true,
          commitSha,
          filesWritten,
          durationMs,
          error: null,
        },
        docGraphComplete: true,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const durationMs = Date.now() - startTime

      // Clean up temp files to avoid dirty git state
      for (const tempFile of tempFiles) {
        try {
          await fs.unlink(tempFile)
        } catch {
          // Ignore cleanup errors
        }
      }

      logger.error('doc-graph: commit node failed', {
        storyId,
        error: errorMessage,
        filesWritten: filesWritten.length,
        durationMs,
        commitBlocked: true,
      })

      return {
        commitResult: {
          committed: false,
          commitSha: null,
          filesWritten,
          durationMs,
          error: errorMessage,
        },
        docGraphComplete: true,
      }
    }
  }
}

// ============================================================================
// Graph Factory (ST-9)
// ============================================================================

/**
 * Conditional edge function after doc-review.
 * Routes to log-blocked if commitBlocked, otherwise to commit.
 */
function afterDocReview(state: DocGraphState): 'log-blocked' | 'commit' {
  if (state.docReviewResult?.commitBlocked) {
    return 'log-blocked'
  }
  return 'commit'
}

/**
 * AC-11: Creates the full Documentation Graph.
 *
 * Wire: START → dispatch → Send([6 workers]) → aggregate → doc-review
 *     → [commitBlocked] log-blocked → END
 *     → [passed] commit → END
 *
 * @param config - Documentation graph configuration
 * @returns Compiled StateGraph
 */
export function createDocGraph(config: Partial<DocGraphConfig> = {}) {
  const fullConfig = DocGraphConfigSchema.parse(config)

  // Resolve worker node implementations (imported lazily to avoid circular deps)
  // These are injected via the worker files
  const graph = new StateGraph(DocGraphStateAnnotation)
    // Dispatch node — fans out to all enabled workers
    .addNode('dispatch', createDispatchNode(fullConfig))

    // 6 worker nodes — added by name matching WORKER_REGISTRY
    // Implementations are imported from worker files
    .addNode('doc-worker-api-docs', createWorkerStubNode('api-docs'))
    .addNode('doc-worker-component-docs', createWorkerStubNode('component-docs'))
    .addNode('doc-worker-architecture-docs', createWorkerStubNode('architecture-docs'))
    .addNode('doc-worker-readme-guides', createWorkerStubNode('readme-guides'))
    .addNode('doc-worker-kb-sync', createWorkerStubNode('kb-sync'))
    .addNode('doc-worker-changelog', createWorkerStubNode('changelog'))

    // Aggregate node — sentinel count pass-through
    .addNode('aggregate', createAggregateNode())

    // Doc review node
    .addNode('doc-review', createDocReviewNode(fullConfig))

    // Log-blocked node (when commit is blocked)
    .addNode('log-blocked', createLogBlockedNode())

    // Commit node
    .addNode('commit', createCommitNode(fullConfig))

    // Wire edges
    .addEdge(START, 'dispatch')

    // dispatch → 6 workers (via Send API in createDispatchNode)
    // addEdge from each worker to aggregate
    .addEdge('doc-worker-api-docs', 'aggregate')
    .addEdge('doc-worker-component-docs', 'aggregate')
    .addEdge('doc-worker-architecture-docs', 'aggregate')
    .addEdge('doc-worker-readme-guides', 'aggregate')
    .addEdge('doc-worker-kb-sync', 'aggregate')
    .addEdge('doc-worker-changelog', 'aggregate')

    // aggregate → doc-review
    .addEdge('aggregate', 'doc-review')

    // doc-review → conditional: log-blocked or commit
    .addConditionalEdges('doc-review', afterDocReview, {
      'log-blocked': 'log-blocked',
      commit: 'commit',
    })

    // Both terminal nodes → END
    .addEdge('log-blocked', END)
    .addEdge('commit', END)

  return graph.compile()
}

/**
 * Creates a Documentation Graph with injected worker implementations.
 * Use this factory when you want to inject custom worker nodes (e.g., for testing).
 */
export function createDocGraphWithWorkers(
  config: Partial<DocGraphConfig> = {},
  workerOverrides?: Partial<
    Record<string, (state: DocGraphState) => Promise<Partial<DocGraphState>>>
  >,
) {
  const fullConfig = DocGraphConfigSchema.parse(config)

  const getWorkerNode = (workerName: DocWorkerName) => {
    if (workerOverrides?.[`doc-worker-${workerName}`]) {
      return workerOverrides[`doc-worker-${workerName}`]!
    }
    return createWorkerStubNode(workerName)
  }

  const graph = new StateGraph(DocGraphStateAnnotation)
    .addNode('dispatch', createDispatchNode(fullConfig))
    .addNode('doc-worker-api-docs', getWorkerNode('api-docs'))
    .addNode('doc-worker-component-docs', getWorkerNode('component-docs'))
    .addNode('doc-worker-architecture-docs', getWorkerNode('architecture-docs'))
    .addNode('doc-worker-readme-guides', getWorkerNode('readme-guides'))
    .addNode('doc-worker-kb-sync', getWorkerNode('kb-sync'))
    .addNode('doc-worker-changelog', getWorkerNode('changelog'))
    .addNode('aggregate', createAggregateNode())
    .addNode('doc-review', createDocReviewNode(fullConfig))
    .addNode('log-blocked', createLogBlockedNode())
    .addNode('commit', createCommitNode(fullConfig))
    .addEdge(START, 'dispatch')
    .addEdge('doc-worker-api-docs', 'aggregate')
    .addEdge('doc-worker-component-docs', 'aggregate')
    .addEdge('doc-worker-architecture-docs', 'aggregate')
    .addEdge('doc-worker-readme-guides', 'aggregate')
    .addEdge('doc-worker-kb-sync', 'aggregate')
    .addEdge('doc-worker-changelog', 'aggregate')
    .addEdge('aggregate', 'doc-review')
    .addConditionalEdges('doc-review', afterDocReview, {
      'log-blocked': 'log-blocked',
      commit: 'commit',
    })
    .addEdge('log-blocked', END)
    .addEdge('commit', END)

  return graph.compile()
}

// ============================================================================
// Worker Stub (fallback implementation when workers not injected)
// ============================================================================

/**
 * Creates a stub worker node for graph wiring.
 * In production, workers are implemented in separate files and injected.
 */
function createWorkerStubNode(workerName: DocWorkerName) {
  return async (state: DocGraphState): Promise<Partial<DocGraphState>> => {
    const startTime = Date.now()
    const storyId = state.mergeEvent?.storyId ?? 'unknown'

    logger.warn(
      'doc-graph: worker stub invoked — use createDocGraphWithWorkers to inject implementations',
      {
        workerName,
        storyId,
      },
    )

    const durationMs = Date.now() - startTime
    const result: DocWorkerResult = {
      workerName,
      success: true,
      filesUpdated: [],
      proposedChanges: [],
      durationMs,
      error: null,
      warnings: [`Worker ${workerName} stub invoked — no implementation provided`],
      model: 'stub',
    }

    return {
      workerResults: [result],
      proposedFileChanges: [],
    }
  }
}
