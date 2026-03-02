/**
 * Dead Code Reaper Graph
 *
 * LangGraph graph factory for the Dead Code Reaper workflow.
 * Follows the createMetricsGraph() factory pattern from graphs/metrics.ts.
 *
 * Also registers the dead-code-reaper cron job via buildCronRegistry.
 *
 * APIP-4050: Dead Code Reaper — Monthly Cron Analysis and CLEANUP Story Generation
 * APIP-3090: Cron Scheduler Infrastructure (buildCronRegistry available)
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import type { ExecFn } from '../nodes/dead-code/scanners.js'
import { runDeadCodeReaper } from '../nodes/dead-code/runner.js'
import { generateCleanupStory } from '../nodes/dead-code/cleanup-story-generator.js'
import {
  type DeadCodeReaperResult,
  DeadCodeReaperConfigSchema,
  DeadCodeReaperResultSchema,
} from '../nodes/dead-code/schemas.js'
import { buildCronRegistry, registerCronJobs } from '../cron/registry.js'
import { deadCodeReaperJob } from '../cron/jobs/dead-code-reaper.job.js'
import type { CronSchedulerAdapter } from '../cron/adapter.js'

// ============================================================================
// Graph Configuration
// ============================================================================

/**
 * Configuration schema for the Dead Code Reaper graph.
 */
export const DeadCodeReaperGraphConfigSchema = z.object({
  /** Dead Code Reaper job configuration */
  reaperConfig: DeadCodeReaperConfigSchema.partial().default({}),

  /** Whether to generate a cleanup story when findings are found */
  generateStory: z.boolean().default(true),

  /** Minimum verified deletions required to generate a cleanup story */
  minDeletionsForStory: z.number().int().nonnegative().default(1),

  /** Monorepo root path for story generation */
  repoRoot: z.string().optional(),
})

export type DeadCodeReaperGraphConfig = z.infer<typeof DeadCodeReaperGraphConfigSchema>

// ============================================================================
// Graph State
// ============================================================================

/** Simple overwrite reducer */
const overwrite = <T>(_: T, b: T): T => b

export const DeadCodeReaperGraphStateAnnotation = Annotation.Root({
  /** Graph configuration */
  graphConfig: Annotation<DeadCodeReaperGraphConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Reaper run result */
  reaperResult: Annotation<DeadCodeReaperResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Path to generated cleanup story */
  cleanupStoryPath: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Whether graph execution is complete */
  complete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  /** Errors during execution */
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

export type DeadCodeReaperGraphState = typeof DeadCodeReaperGraphStateAnnotation.State

// ============================================================================
// Graph Nodes
// ============================================================================

/**
 * Run the Dead Code Reaper scan node.
 */
function createRunReaperNode(config: DeadCodeReaperGraphConfig, execFn?: ExecFn) {
  return async (state: DeadCodeReaperGraphState): Promise<Partial<DeadCodeReaperGraphState>> => {
    try {
      const result = await runDeadCodeReaper(config.reaperConfig ?? {}, execFn)
      return {
        reaperResult: result,
        graphConfig: state.graphConfig,
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return {
        errors: [errorMsg],
        reaperResult: DeadCodeReaperResultSchema.parse({
          status: 'error',
          summary: {
            findingsTotal: 0,
            verifiedDeletions: 0,
            falsePositives: 0,
            cleanupStoriesGenerated: 0,
          },
          deadExports: [],
          unusedFiles: [],
          unusedDeps: [],
          microVerifyResults: [],
          cleanupStoryPath: null,
          error: errorMsg,
        }),
      }
    }
  }
}

/**
 * Optionally generate a cleanup story node.
 */
function createGenerateStoryNode(config: DeadCodeReaperGraphConfig) {
  return async (state: DeadCodeReaperGraphState): Promise<Partial<DeadCodeReaperGraphState>> => {
    const result = state.reaperResult
    if (!result) {
      return { complete: true }
    }

    const shouldGenerate =
      config.generateStory &&
      result.status !== 'skipped' &&
      result.status !== 'error' &&
      result.summary.verifiedDeletions >= config.minDeletionsForStory

    if (!shouldGenerate) {
      return { complete: true }
    }

    try {
      const storyPath = generateCleanupStory(result, config.repoRoot)
      return {
        cleanupStoryPath: storyPath,
        complete: true,
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return {
        errors: [errorMsg],
        complete: true,
      }
    }
  }
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates a Dead Code Reaper graph with the specified configuration.
 *
 * Graph structure:
 * START -> run_reaper -> generate_story -> END
 *
 * @param config - Configuration for the Dead Code Reaper
 * @param execFn - Optional injectable exec function (for testing)
 * @returns Compiled StateGraph
 */
export function createDeadCodeReaperGraph(
  config: Partial<DeadCodeReaperGraphConfig> = {},
  execFn?: ExecFn,
) {
  const fullConfig = DeadCodeReaperGraphConfigSchema.parse(config)

  const graph = new StateGraph(DeadCodeReaperGraphStateAnnotation)
    .addNode('run_reaper', createRunReaperNode(fullConfig, execFn))
    .addNode('generate_story', createGenerateStoryNode(fullConfig))
    .addEdge(START, 'run_reaper')
    .addEdge('run_reaper', 'generate_story')
    .addEdge('generate_story', END)

  return graph.compile()
}

// ============================================================================
// Cron Registration
// ============================================================================

/**
 * Register the dead-code-reaper cron job with the given adapter.
 *
 * Uses buildCronRegistry/registerCronJobs from APIP-3090.
 * InMemoryCronAdapter is used for unit testing.
 *
 * @param adapter - The cron scheduler adapter
 * @param env - Environment variables for DISABLE_CRON_JOB_* filtering
 */
export function registerDeadCodeReaperJob(
  adapter: CronSchedulerAdapter,
  env?: Record<string, string | undefined>,
): void {
  const registry = buildCronRegistry([deadCodeReaperJob], env)
  registerCronJobs(adapter, registry)
}
