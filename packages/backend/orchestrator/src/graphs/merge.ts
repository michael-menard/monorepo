/**
 * Merge Graph
 *
 * Automates PR creation, CI gate, squash-merge, worktree cleanup, and learnings extraction.
 * Reads QA-VERIFY.yaml as input, writes MERGE.yaml as output.
 *
 * Graph routing (AC-12):
 * START → check-preconditions → [rebase-branch | cleanup-worktree (MERGE_BLOCKED)]
 *       → create-or-update-pr → [poll-ci | cleanup-worktree (MERGE_FAIL)]
 *       → squash-merge → cleanup-worktree → extract-learnings → write-merge-artifact → END
 *
 * All failure paths route through cleanup-worktree → extract-learnings → write-merge-artifact → END.
 *
 * Thread ID convention: `${storyId}:merge:${attempt}` (follows APIP-1030 convention)
 *
 * AC-1, AC-2, AC-12, AC-13
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import type { QaVerify } from '../artifacts/qa-verify.js'

// ============================================================================
// Config Schema (AC-1)
// ============================================================================

export const MergeGraphConfigSchema = z.object({
  /** Absolute path to the git worktree directory */
  worktreeDir: z.string(),
  /** Name of the story branch to merge */
  storyBranch: z.string(),
  /** Story identifier */
  storyId: z.string(),
  /** Story title for PR and commit message */
  storyTitle: z.string(),
  /** Target base branch (default: main) */
  mainBranch: z.string().default('main'),
  /** CI polling timeout in ms (default: 30 minutes) */
  ciTimeoutMs: z.number().positive().default(1800000),
  /** CI polling initial interval in ms (default: 30 seconds) */
  ciPollIntervalMs: z.number().positive().default(30000),
  /** CI polling max interval in ms after back-off (default: 5 minutes) */
  ciPollMaxIntervalMs: z.number().positive().default(300000),
  /** Whether to write learnings to KB (default: true) */
  kbWriteBackEnabled: z.boolean().default(true),
  /** Timeout for each node in ms (default: 60 seconds) */
  nodeTimeoutMs: z.number().positive().default(60000),
  /** Optional GitHub token override */
  ghToken: z.string().optional(),
  /** Feature directory for artifact paths */
  featureDir: z.string().default('plans/future/platform/autonomous-pipeline'),
})

export type MergeGraphConfig = z.infer<typeof MergeGraphConfigSchema>

// ============================================================================
// State Annotation (AC-2)
// ============================================================================

// Simple overwrite reducer for most fields
const overwrite = <T>(_: T, b: T): T => b

export const MergeGraphStateAnnotation = Annotation.Root({
  storyId: Annotation<string>(),

  config: Annotation<MergeGraphConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  qaVerify: Annotation<QaVerify | null>({
    reducer: overwrite,
    default: () => null,
  }),

  prNumber: Annotation<number | null>({
    reducer: overwrite,
    default: () => null,
  }),

  prUrl: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  mergeCommitSha: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  ciStatus: Annotation<'pending' | 'running' | 'pass' | 'fail' | 'timeout' | null>({
    reducer: overwrite,
    default: () => null,
  }),

  ciPollCount: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  /** Timestamp when CI polling started (used for CI duration calculation) */
  ciStartTime: Annotation<number | null>({
    reducer: overwrite,
    default: () => null,
  }),

  rebaseSuccess: Annotation<boolean | null>({
    reducer: overwrite,
    default: () => null,
  }),

  worktreeCleanedUp: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  learningsPersisted: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  mergeVerdict: Annotation<'MERGE_COMPLETE' | 'MERGE_FAIL' | 'MERGE_BLOCKED' | null>({
    reducer: overwrite,
    default: () => null,
  }),

  mergeComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  mergeArtifact: Annotation<unknown | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Append reducers for accumulated arrays
  errors: Annotation<string[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),

  warnings: Annotation<string[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
})

export type MergeGraphState = typeof MergeGraphStateAnnotation.State

// ============================================================================
// Result Schema (AC-13)
// ============================================================================

export const MergeGraphResultSchema = z.object({
  storyId: z.string(),
  verdict: z.enum(['MERGE_COMPLETE', 'MERGE_FAIL', 'MERGE_BLOCKED']).nullable(),
  prNumber: z.number().int().nullable(),
  prUrl: z.string().nullable(),
  mergeCommitSha: z.string().nullable(),
  mergeArtifact: z.unknown().nullable(),
  durationMs: z.number().int().min(0),
  errors: z.array(z.string()),
})

export type MergeGraphResult = z.infer<typeof MergeGraphResultSchema>

// ============================================================================
// Conditional Edge Functions (AC-12)
// ============================================================================

/**
 * After check-preconditions: route to rebase-branch (pass) or cleanup-worktree (blocked)
 */
function afterCheckPreconditions(state: MergeGraphState): string {
  if (state.mergeVerdict === 'MERGE_BLOCKED') {
    return 'cleanup_worktree'
  }
  return 'rebase_branch'
}

/**
 * After rebase-branch: route to create-or-update-pr (success) or cleanup-worktree (blocked)
 */
function afterRebaseBranch(state: MergeGraphState): string {
  if (state.mergeVerdict === 'MERGE_BLOCKED') {
    return 'cleanup_worktree'
  }
  return 'create_or_update_pr'
}

/**
 * After create-or-update-pr: route to poll-ci (success) or cleanup-worktree (fail)
 */
function afterCreateOrUpdatePr(state: MergeGraphState): string {
  if (state.mergeVerdict === 'MERGE_FAIL') {
    return 'cleanup_worktree'
  }
  return 'poll_ci'
}

/**
 * After poll-ci: route to squash-merge (pass) or cleanup-worktree (fail/timeout)
 */
function afterPollCi(state: MergeGraphState): string {
  if (state.ciStatus === 'pass') {
    return 'squash_merge'
  }
  return 'cleanup_worktree'
}

// ============================================================================
// Graph Factory (AC-12, AC-13)
// ============================================================================

/**
 * Creates and compiles the Merge StateGraph.
 *
 * @param config - Merge graph configuration
 * @returns Compiled StateGraph
 */
export function createMergeGraph(config: Partial<MergeGraphConfig> = {}) {
  const fullConfig = MergeGraphConfigSchema.parse(config)

  const graph = new StateGraph(MergeGraphStateAnnotation)

  // Add all nodes with lazy imports to avoid circular dependency issues
  graph
    .addNode('check_preconditions', async (state: MergeGraphState) => {
      const { createCheckPreconditionsNode } = await import(
        '../nodes/merge/check-preconditions.js'
      )
      return createCheckPreconditionsNode(fullConfig)(state)
    })
    .addNode('rebase_branch', async (state: MergeGraphState) => {
      const { createRebaseBranchNode } = await import('../nodes/merge/rebase-branch.js')
      return createRebaseBranchNode(fullConfig)(state)
    })
    .addNode('create_or_update_pr', async (state: MergeGraphState) => {
      const { createCreateOrUpdatePrNode } = await import(
        '../nodes/merge/create-or-update-pr.js'
      )
      return createCreateOrUpdatePrNode(fullConfig)(state)
    })
    .addNode('poll_ci', async (state: MergeGraphState) => {
      const { createPollCiNode } = await import('../nodes/merge/poll-ci.js')
      return createPollCiNode(fullConfig)(state)
    })
    .addNode('squash_merge', async (state: MergeGraphState) => {
      const { createSquashMergeNode } = await import('../nodes/merge/squash-merge.js')
      return createSquashMergeNode(fullConfig)(state)
    })
    .addNode('cleanup_worktree', async (state: MergeGraphState) => {
      const { createCleanupWorktreeNode } = await import('../nodes/merge/cleanup-worktree.js')
      return createCleanupWorktreeNode(fullConfig)(state)
    })
    .addNode('extract_learnings', async (state: MergeGraphState) => {
      const { createExtractLearningsNode } = await import('../nodes/merge/extract-learnings.js')
      return createExtractLearningsNode(fullConfig)(state)
    })
    .addNode('write_merge_artifact', async (state: MergeGraphState) => {
      const { createWriteMergeArtifactNode } = await import(
        '../nodes/merge/write-merge-artifact.js'
      )
      return createWriteMergeArtifactNode(fullConfig)(state)
    })

  // Wire edges (AC-12)
  graph
    .addEdge(START, 'check_preconditions')
    .addConditionalEdges('check_preconditions', afterCheckPreconditions, {
      rebase_branch: 'rebase_branch',
      cleanup_worktree: 'cleanup_worktree',
    })
    .addConditionalEdges('rebase_branch', afterRebaseBranch, {
      create_or_update_pr: 'create_or_update_pr',
      cleanup_worktree: 'cleanup_worktree',
    })
    .addConditionalEdges('create_or_update_pr', afterCreateOrUpdatePr, {
      poll_ci: 'poll_ci',
      cleanup_worktree: 'cleanup_worktree',
    })
    .addConditionalEdges('poll_ci', afterPollCi, {
      squash_merge: 'squash_merge',
      cleanup_worktree: 'cleanup_worktree',
    })
    .addEdge('squash_merge', 'cleanup_worktree')
    .addEdge('cleanup_worktree', 'extract_learnings')
    .addEdge('extract_learnings', 'write_merge_artifact')
    .addEdge('write_merge_artifact', END)

  return graph.compile()
}

// ============================================================================
// Entry Function (AC-13)
// ============================================================================

/**
 * Run the merge graph for a story.
 *
 * Thread ID convention: `${storyId}:merge:${attempt}` (APIP-1030 convention)
 *
 * @param storyId - Story identifier
 * @param qaVerifyOrPath - Pre-loaded QaVerify object or file path string (loaded by check-preconditions)
 * @param config - Merge graph configuration (all fields have defaults via MergeGraphConfigSchema)
 * @param attempt - Attempt number for thread ID (default: 1)
 * @returns MergeGraphResult
 */
export async function runMerge(
  storyId: string,
  qaVerifyOrPath: QaVerify | string,
  config: Partial<MergeGraphConfig> = {},
  attempt = 1,
): Promise<MergeGraphResult> {
  const startTime = Date.now()
  const fullConfig = MergeGraphConfigSchema.parse({ storyId, ...config })
  const graph = createMergeGraph(fullConfig)

  // Thread ID for LangGraph checkpoint (AC-13)
  const _threadId = `${storyId}:merge:${attempt}`

  // Build initial state
  let initialQaVerify: QaVerify | null = null
  if (typeof qaVerifyOrPath !== 'string') {
    // Pre-loaded QaVerify passed directly
    initialQaVerify = qaVerifyOrPath
  }
  // If string path, check-preconditions node will load the file

  const initialState: Partial<MergeGraphState> = {
    storyId,
    config: fullConfig,
    qaVerify: initialQaVerify,
    ciStartTime: startTime,
  }

  try {
    const result = await graph.invoke(initialState)
    const durationMs = Date.now() - startTime

    return {
      storyId: result.storyId,
      verdict: result.mergeVerdict,
      prNumber: result.prNumber,
      prUrl: result.prUrl,
      mergeCommitSha: result.mergeCommitSha,
      mergeArtifact: result.mergeArtifact,
      durationMs,
      errors: result.errors ?? [],
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during merge'

    return {
      storyId,
      verdict: 'MERGE_FAIL',
      prNumber: null,
      prUrl: null,
      mergeCommitSha: null,
      mergeArtifact: null,
      durationMs,
      errors: [errorMessage],
    }
  }
}
