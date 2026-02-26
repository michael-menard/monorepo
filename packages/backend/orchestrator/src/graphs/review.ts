/**
 * Review Graph
 *
 * LangGraph review graph with parallel fan-out workers.
 * Dispatches 10 review workers concurrently via Send API,
 * aggregates results in the fan-in node, and writes REVIEW.yaml.
 *
 * APIP-1050: Review Graph with Parallel Fan-Out Workers
 *
 * Thread ID convention per APIP ADR-001:
 * const threadId = `${storyId}:review:${attempt}`
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START, Send } from '@langchain/langgraph'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { logger } from '@repo/logger'
import {
  ALL_REVIEW_WORKERS,
  type ReviewWorkerName,
  type WorkerStateEntry,
  WorkerStateEntrySchema,
} from '../nodes/review/types.js'
import {
  createReview,
  addWorkerResult,
  generateRankedPatches,
  type Review,
  type WorkerResult,
} from '../artifacts/review.js'
import { createReviewLintNode } from '../nodes/review/workers/review-lint.js'
import { createReviewStyleNode } from '../nodes/review/workers/review-style.js'
import { createReviewSyntaxNode } from '../nodes/review/workers/review-syntax.js'
import { createReviewTypecheckNode } from '../nodes/review/workers/review-typecheck.js'
import { createReviewBuildNode } from '../nodes/review/workers/review-build.js'
import { createReviewReactNode } from '../nodes/review/workers/review-react.js'
import { createReviewTypescriptNode } from '../nodes/review/workers/review-typescript.js'
import { createReviewReusabilityNode } from '../nodes/review/workers/review-reusability.js'
import { createReviewAccessibilityNode } from '../nodes/review/workers/review-accessibility.js'
import { createReviewSecurityNode } from '../nodes/review/workers/review-security.js'

// ============================================================================
// Graph State Annotation
// ============================================================================

// Simple overwrite reducer for most fields
const overwrite = <T>(_: T, b: T): T => b

// Append reducer for arrays
const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

/**
 * LangGraph state annotation for the review graph.
 *
 * AC-6: ReviewGraphStateAnnotation with workerResults/workerNames append reducers.
 */
export const ReviewGraphStateAnnotation = Annotation.Root({
  /** Story ID being reviewed */
  storyId: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  /** Absolute path to the story worktree */
  worktreePath: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  /** ChangeSpec IDs (opaque strings per ARCH-002) */
  changeSpecIds: Annotation<string[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Review iteration number */
  iteration: Annotation<number>({
    reducer: overwrite,
    default: () => 1,
  }),

  /** Feature directory for REVIEW.yaml output path */
  featureDir: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  /** Worker results collected via append reducer (AC-6) */
  workerResults: Annotation<WorkerStateEntry[]>({
    reducer: append,
    default: () => [],
  }),

  /** Worker names that have completed — append reducer (AC-6) */
  workerNames: Annotation<ReviewWorkerName[]>({
    reducer: append,
    default: () => [],
  }),

  /** Workers to skip (carried from previous PASS iteration) */
  workersToSkip: Annotation<ReviewWorkerName[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Final review result (written by fan-in) */
  review: Annotation<Review | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Path where REVIEW.yaml was written */
  reviewYamlPath: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Whether the graph completed successfully */
  complete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  /** Accumulated errors */
  errors: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),

  /** Accumulated warnings */
  warnings: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),
})

export type ReviewGraphState = typeof ReviewGraphStateAnnotation.State

// ============================================================================
// Result Schema
// ============================================================================

/**
 * AC-18: ReviewGraphResultSchema exported from review.ts.
 * runReview returns z.infer<typeof ReviewGraphResultSchema>.
 */
export const ReviewGraphResultSchema = z.object({
  storyId: z.string().min(1),
  verdict: z.enum(['PASS', 'FAIL']),
  reviewYamlPath: z.string().nullable(),
  workers_run: z.array(z.string()),
  workers_skipped: z.array(z.string()).default([]),
  total_errors: z.number().int().min(0),
  total_warnings: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  completedAt: z.string().datetime(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type ReviewGraphResult = z.infer<typeof ReviewGraphResultSchema>

// ============================================================================
// Dispatcher (Conditional Edge Function using Send API)
// ============================================================================

/**
 * Dispatcher function that uses the LangGraph Send API to fan out to all workers.
 *
 * AC-7: dispatcher uses Send API — fans out to all 10 workers concurrently.
 *
 * This is a CONDITIONAL EDGE function, not a node. It returns an array of
 * Send objects that LangGraph uses to dispatch to worker nodes in parallel.
 */
export function createDispatcherNode() {
  return (state: ReviewGraphState): Send[] => {
    const workersToRun = ALL_REVIEW_WORKERS.filter(
      name => !state.workersToSkip.includes(name),
    )

    logger.info('Review dispatcher fanning out', {
      storyId: state.storyId,
      workersToRun,
      workersSkipped: state.workersToSkip,
    })

    // Return Send objects — LangGraph dispatches these to worker nodes in parallel
    return workersToRun.map(
      workerName =>
        new Send(`worker_${workerName}`, {
          ...state,
          workerName,
        }),
    )
  }
}

// ============================================================================
// Worker Node Stubs (replaced by real implementations in ST-2/3/4)
// ============================================================================

/**
 * Creates a stub worker node for a given worker name.
 * Used in ST-1 graph skeleton; replaced by real worker in ST-2/3/4.
 */
export function createWorkerStub(workerName: ReviewWorkerName) {
  return async (state: ReviewGraphState): Promise<Partial<ReviewGraphState>> => {
    logger.info(`Worker ${workerName} executing (stub)`, { storyId: state.storyId })

    const entry: WorkerStateEntry = WorkerStateEntrySchema.parse({
      workerName,
      verdict: 'PASS',
      skipped: false,
      errors: 0,
      warnings: 0,
      findings: [],
      duration_ms: 0,
    })

    return {
      workerResults: [entry],
      workerNames: [workerName],
    }
  }
}

// ============================================================================
// Fan-In Aggregation Node
// ============================================================================

/**
 * Fan-in node that aggregates all worker results.
 *
 * AC-9: calls createReview, addWorkerResult, generateRankedPatches.
 * AC-10: maps changeSpecId to ranked patches via file-path matching.
 * AC-11: writes REVIEW.yaml to featureDir/in-progress/storyId/_implementation/REVIEW.yaml.
 * AC-14: PASS if all workers PASS, FAIL if any FAIL.
 */
export function createFanInNode() {
  return async (state: ReviewGraphState): Promise<Partial<ReviewGraphState>> => {
    logger.info('Fan-in aggregating worker results', {
      storyId: state.storyId,
      resultCount: state.workerResults.length,
    })

    // Create base review (AC-9)
    let review = createReview(state.storyId, state.iteration)

    // Add results from all workers that ran (AC-9)
    for (const entry of state.workerResults) {
      const workerResult: WorkerResult = {
        verdict: entry.verdict,
        skipped: entry.skipped,
        errors: entry.errors,
        warnings: entry.warnings,
        findings: entry.findings,
        duration_ms: entry.duration_ms,
      }
      review = addWorkerResult(review, entry.workerName, workerResult)
    }

    // Add skipped workers (carried forward from previous iterations)
    for (const workerName of state.workersToSkip) {
      review = {
        ...review,
        workers_skipped: [...review.workers_skipped, workerName],
      }
    }

    // Generate ranked patches (AC-9) with changeSpecId mapping (AC-10)
    const patches = generateRankedPatches(review)

    // Map changeSpecId by file-path string matching (AC-10)
    const patchesWithChangeSpec = patches.map(patch => {
      const matchingChangeSpecId = state.changeSpecIds.find(
        id => patch.file.includes(id) || id.includes(patch.file),
      )
      return {
        ...patch,
        changeSpecId: matchingChangeSpecId ?? null,
      }
    })

    review = {
      ...review,
      ranked_patches: patchesWithChangeSpec,
    }

    // Write REVIEW.yaml atomically (AC-11, ARCH-001: direct fs/yaml write)
    const reviewDir = path.join(
      state.featureDir,
      'in-progress',
      state.storyId,
      '_implementation',
    )
    const reviewYamlPath = path.join(reviewDir, 'REVIEW.yaml')

    let writeSuccess = false
    try {
      await fs.mkdir(reviewDir, { recursive: true })

      const yamlContent = yaml.stringify(review, {
        indent: 2,
        lineWidth: 120,
      })

      // Atomic write: temp → rename
      const tempPath = `${reviewYamlPath}.${Math.random().toString(36).substring(2, 10)}.tmp`
      await fs.writeFile(tempPath, yamlContent, 'utf-8')
      await fs.rename(tempPath, reviewYamlPath)

      writeSuccess = true
      logger.info('REVIEW.yaml written', { path: reviewYamlPath, storyId: state.storyId })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('Failed to write REVIEW.yaml', { error: msg, storyId: state.storyId })
    }

    return {
      review,
      reviewYamlPath: writeSuccess ? reviewYamlPath : null,
      complete: true,
      warnings: writeSuccess ? [] : [`Failed to write REVIEW.yaml to ${reviewYamlPath}`],
    }
  }
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the review graph.
 *
 * AC-12: createReviewGraph() compiles — pnpm check-types passes.
 *
 * Graph structure:
 * START --[conditional edge dispatcher]--> worker_lint | worker_style | ... | worker_security
 *       each worker → fan_in
 *       fan_in → END
 *
 * The dispatcher is a CONDITIONAL EDGE function (not a node) that uses the
 * Send API to dispatch all workers in parallel.
 */
export function createReviewGraph(workerOverrides: {
  lint?: ReturnType<typeof createReviewLintNode>
  style?: ReturnType<typeof createReviewStyleNode>
  syntax?: ReturnType<typeof createReviewSyntaxNode>
  typecheck?: ReturnType<typeof createReviewTypecheckNode>
  build?: ReturnType<typeof createReviewBuildNode>
  react?: ReturnType<typeof createReviewReactNode>
  typescript?: ReturnType<typeof createReviewTypescriptNode>
  reusability?: ReturnType<typeof createReviewReusabilityNode>
  accessibility?: ReturnType<typeof createReviewAccessibilityNode>
  security?: ReturnType<typeof createReviewSecurityNode>
} = {}) {
  // Wrap each real worker to produce WorkerStateEntry for graph state
  const wrapWorker = (
    workerName: ReviewWorkerName,
    workerFn: (state: { storyId: string; worktreePath: string; changeSpecIds?: string[] }) => Promise<WorkerResult>,
  ) => {
    return async (state: ReviewGraphState): Promise<Partial<ReviewGraphState>> => {
      const result = await workerFn({
        storyId: state.storyId,
        worktreePath: state.worktreePath,
        changeSpecIds: state.changeSpecIds,
      })
      const entry = WorkerStateEntrySchema.parse({ workerName, ...result })
      return {
        workerResults: [entry],
        workerNames: [workerName],
      }
    }
  }

  const graph = new StateGraph(ReviewGraphStateAnnotation)
    .addNode('worker_lint', wrapWorker('lint', workerOverrides.lint ?? createReviewLintNode()))
    .addNode('worker_style', wrapWorker('style', workerOverrides.style ?? createReviewStyleNode()))
    .addNode('worker_syntax', wrapWorker('syntax', workerOverrides.syntax ?? createReviewSyntaxNode()))
    .addNode('worker_typecheck', wrapWorker('typecheck', workerOverrides.typecheck ?? createReviewTypecheckNode()))
    .addNode('worker_build', wrapWorker('build', workerOverrides.build ?? createReviewBuildNode()))
    .addNode('worker_react', wrapWorker('react', workerOverrides.react ?? createReviewReactNode()))
    .addNode('worker_typescript', wrapWorker('typescript', workerOverrides.typescript ?? createReviewTypescriptNode()))
    .addNode('worker_reusability', wrapWorker('reusability', workerOverrides.reusability ?? createReviewReusabilityNode()))
    .addNode('worker_accessibility', wrapWorker('accessibility', workerOverrides.accessibility ?? createReviewAccessibilityNode()))
    .addNode('worker_security', wrapWorker('security', workerOverrides.security ?? createReviewSecurityNode()))
    .addNode('fan_in', createFanInNode())
    // Dispatcher as conditional edge from START using Send API (AC-7)
    .addConditionalEdges(START, createDispatcherNode())
    // Each worker → fan_in (fan-in barrier)
    .addEdge('worker_lint', 'fan_in')
    .addEdge('worker_style', 'fan_in')
    .addEdge('worker_syntax', 'fan_in')
    .addEdge('worker_typecheck', 'fan_in')
    .addEdge('worker_build', 'fan_in')
    .addEdge('worker_react', 'fan_in')
    .addEdge('worker_typescript', 'fan_in')
    .addEdge('worker_reusability', 'fan_in')
    .addEdge('worker_accessibility', 'fan_in')
    .addEdge('worker_security', 'fan_in')
    // fan_in → END
    .addEdge('fan_in', END)

  return graph.compile()
}

// ============================================================================
// runReview Entry Point
// ============================================================================

/**
 * Convenience function to run the review graph.
 *
 * AC-13: runReview() exported from review.ts; returns ReviewGraphResult.
 * AC-17: Thread ID convention per APIP ADR-001: storyId:review:attempt
 *
 * @param params - Review run parameters
 * @returns ReviewGraphResult with verdict and REVIEW.yaml path
 */
export async function runReview(params: {
  storyId: string
  worktreePath: string
  featureDir: string
  iteration?: number
  changeSpecIds?: string[]
  workersToSkip?: ReviewWorkerName[]
  attempt?: number
  /** Injectable worker overrides for testing — replaces real workers */
  workerOverrides?: Parameters<typeof createReviewGraph>[0]
}): Promise<ReviewGraphResult> {
  const startTime = Date.now()
  const {
    storyId,
    worktreePath,
    featureDir,
    iteration = 1,
    changeSpecIds = [],
    workersToSkip = [],
    attempt = 1,
    workerOverrides,
  } = params

  // Thread ID convention per APIP ADR-001 (AC-17)
  const threadId = `${storyId}:review:${attempt}`

  const graph = createReviewGraph(workerOverrides)

  const initialState: Partial<ReviewGraphState> = {
    storyId,
    worktreePath,
    featureDir,
    iteration,
    changeSpecIds,
    workersToSkip,
  }

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    })

    const durationMs = Date.now() - startTime

    return ReviewGraphResultSchema.parse({
      storyId: result.storyId,
      verdict: result.review?.verdict ?? 'FAIL',
      reviewYamlPath: result.reviewYamlPath,
      workers_run: result.review?.workers_run ?? [],
      workers_skipped: result.review?.workers_skipped ?? [],
      total_errors: result.review?.total_errors ?? 0,
      total_warnings: result.review?.total_warnings ?? 0,
      durationMs,
      completedAt: new Date().toISOString(),
      errors: result.errors ?? [],
      warnings: result.warnings ?? [],
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during review'

    logger.error('Review graph failed', { storyId, error: errorMessage })

    return {
      storyId,
      verdict: 'FAIL',
      reviewYamlPath: null,
      workers_run: [],
      workers_skipped: [],
      total_errors: 0,
      total_warnings: 0,
      durationMs,
      completedAt: new Date().toISOString(),
      errors: [errorMessage],
      warnings: [],
    }
  }
}
