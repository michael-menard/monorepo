/**
 * Subgraph Invoker Nodes (pipeline-orchestrator)
 *
 * Wrapper functions that map pipeline orchestrator state to/from
 * individual subgraph inputs/outputs. Each invoker:
 *
 * 1. Extracts relevant fields from the orchestrator state
 * 2. Builds LLM adapters from the factory using current modelConfig
 * 3. Creates and invokes the real subgraph
 * 4. Maps the subgraph result back to orchestrator state fields
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { PipelineOrchestratorV2State } from '../../state/pipeline-orchestrator-v2-state.js'
import type { DevImplementV2State } from '../../state/dev-implement-v2-state.js'
import type { ReviewV2State } from '../../state/review-v2-state.js'
import type { QAVerifyV2State } from '../../state/qa-verify-v2-state.js'
import type { PlanRefinementV2State } from '../../state/plan-refinement-v2-state.js'
import type { StoryGenerationV2State } from '../../state/story-generation-v2-state.js'
import type { TestRunResult } from '../../state/dev-implement-v2-state.js'
import type { DevImplementV2GraphConfig } from '../../graphs/dev-implement-v2.js'
import type { ReviewV2GraphConfig } from '../../graphs/review-v2.js'
import type { QAVerifyV2GraphConfig } from '../../graphs/qa-verify-v2.js'
import type { PlanRefinementV2GraphConfig } from '../../graphs/plan-refinement-v2.js'
import type { StoryGenerationV2GraphConfig } from '../../graphs/story-generation-v2.js'
import { createLlmAdapterFactory } from '../../services/llm-adapter-factory.js'
import type { LlmAdapterFactory } from '../../services/llm-adapter-factory.js'
import { updateRetryContext } from './retry-escalation.js'
import { createMergePrNode } from './git-operations.js'
import type { GitOpsConfig } from './git-operations.js'
import { createCleanupWorktreeNode } from './worktree-manager.js'
import type { WorktreeNodeConfig } from './worktree-manager.js'

// ============================================================================
// Lazy Adapter Loaders
// ============================================================================

/**
 * Lazily imports KB adapters to avoid triggering @repo/knowledge-base
 * env validation at module load time (which breaks DI-based tests).
 */
async function loadKbAdapters() {
  const mod = await import('../../services/kb-adapters.js')
  return {
    planLoader: mod.planLoaderAdapter,
    kbStory: mod.kbStoryAdapter,
    queryKb: mod.queryKbAdapter,
    kbWriter: mod.kbWriterAdapter,
    tokenLogger: mod.tokenLoggerAdapter,
  }
}

/**
 * Lazily imports tool adapters (filesystem, test runner, diff reader).
 */
async function loadToolAdapters() {
  const mod = await import('../../services/tool-adapters.js')
  return {
    readFile: mod.createReadFileAdapter(),
    writeFile: mod.createWriteFileAdapter(),
    searchCodebase: mod.createSearchCodebaseAdapter(),
    runTests: mod.createRunTestsAdapter(),
    diffReader: mod.createDiffReaderAdapter(),
  }
}

// ============================================================================
// Test Runner Shape Adapter
// ============================================================================

/**
 * Wraps the tool-adapter's RunTestsFn (simple shape) into
 * the qa-verify-v2 UnitTestRunnerFn (structured TestRunResult shape).
 *
 * tool-adapters returns: { passed, output, failures: string[] }
 * qa-verify expects:     { passed, passedCount, failedCount, failures: {testName, error, file?}[], rawOutput }
 */
async function createUnitTestRunnerAdapter() {
  const { createRunTestsAdapter } = await import('../../services/tool-adapters.js')
  const runTests = createRunTestsAdapter()

  return async (filter: string): Promise<TestRunResult> => {
    const result = await runTests(filter)
    return {
      passed: result.passed,
      passedCount: result.passed ? 1 : 0,
      failedCount: result.failures.length,
      failures: result.failures.map(f => ({
        testName: f,
        error: f,
      })),
      rawOutput: result.output,
    }
  }
}

// ============================================================================
// Zod Schemas for Adapter Types
// ============================================================================

export const KbStorySchema = z.object({
  id: z.string(),
  blockedBy: z.string().nullable().optional(),
  status: z.string().optional(),
})

export type KbStory = z.infer<typeof KbStorySchema>

export const KbAdapterSchema = z.object({
  updateStoryStatus: z.function(),
  writeArtifact: z.function(),
  listStories: z.function(),
})

export type KbAdapter = {
  updateStoryStatus: (storyId: string, status: string) => Promise<void>
  writeArtifact: (storyId: string, type: string, content: object) => Promise<void>
  listStories: (filter: { blockedBy?: string }) => Promise<KbStory[]>
}

export const MergeCleanupConfigSchema = z.object({
  monorepoRoot: z.string().min(1),
  defaultBaseBranch: z.string().default('main'),
})

export type MergeCleanupConfig = z.infer<typeof MergeCleanupConfigSchema> & {
  shellExec?: GitOpsConfig['shellExec']
}

export const PostCompletionConfigSchema = z.object({})

export type PostCompletionConfig = {
  kbAdapter: KbAdapter
}

export const BlockStoryConfigSchema = z.object({})

export type BlockStoryConfig = {
  kbAdapter: Pick<KbAdapter, 'updateStoryStatus'>
}

// ============================================================================
// Wrapper Config Schema
// ============================================================================

export const SubgraphInvokerConfigSchema = z.object({
  /** LLM adapter factory — injectable for testing */
  adapterFactory: z.any().optional(),
  /** Override dev-implement graph factory — injectable for testing */
  createDevGraph: z.function().optional(),
  /** Override review graph factory — injectable for testing */
  createReviewGraph: z.function().optional(),
  /** Override qa-verify graph factory — injectable for testing */
  createQAGraph: z.function().optional(),
  /** Override plan-refinement graph factory — injectable for testing */
  createPlanRefinementGraph: z.function().optional(),
  /** Override story-generation graph factory — injectable for testing */
  createStoryGenerationGraph: z.function().optional(),
})

export type SubgraphInvokerConfig = {
  adapterFactory?: LlmAdapterFactory
  createDevGraph?: (config: DevImplementV2GraphConfig) => {
    invoke: (input: Partial<DevImplementV2State>) => Promise<DevImplementV2State>
  }
  createReviewGraph?: (config: ReviewV2GraphConfig) => {
    invoke: (input: Partial<ReviewV2State>) => Promise<ReviewV2State>
  }
  createQAGraph?: (config: QAVerifyV2GraphConfig) => {
    invoke: (input: Partial<QAVerifyV2State>) => Promise<QAVerifyV2State>
  }
  createPlanRefinementGraph?: (config: PlanRefinementV2GraphConfig) => {
    invoke: (input: Partial<PlanRefinementV2State>) => Promise<PlanRefinementV2State>
  }
  createStoryGenerationGraph?: (config: StoryGenerationV2GraphConfig) => {
    invoke: (input: Partial<StoryGenerationV2State>) => Promise<StoryGenerationV2State>
  }
}

// ============================================================================
// State Mapping Helpers
// ============================================================================

/**
 * Maps dev-implement-v2 subgraph output to orchestrator state.
 */
export function mapDevResultToOrchestratorState(
  subgraphResult: DevImplementV2State,
): Partial<PipelineOrchestratorV2State> {
  const verdict = subgraphResult.executorOutcome?.verdict ?? 'stuck'
  const errors = subgraphResult.errors ?? []

  return {
    devResult: {
      verdict,
      errors,
    },
    pipelinePhase: 'dev_implement',
    errors: errors.length > 0 ? errors : [],
  }
}

/**
 * Maps review-v2 subgraph output to orchestrator state.
 */
export function mapReviewResultToOrchestratorState(
  subgraphResult: ReviewV2State,
): Partial<PipelineOrchestratorV2State> {
  const reviewVerdict = subgraphResult.reviewVerdict
  // Map review verdict to orchestrator verdict (pass/fail/block)
  const verdict: 'pass' | 'fail' | 'block' =
    reviewVerdict === 'pass' ? 'pass' : reviewVerdict === 'fail' ? 'fail' : 'block'

  return {
    reviewResult: {
      verdict,
      findings: subgraphResult.reviewFindings ?? [],
    },
    pipelinePhase: 'review',
    errors: subgraphResult.errors?.length ? subgraphResult.errors : [],
  }
}

/**
 * Maps qa-verify-v2 subgraph output to orchestrator state.
 */
export function mapQAResultToOrchestratorState(
  subgraphResult: QAVerifyV2State,
): Partial<PipelineOrchestratorV2State> {
  const qaVerdict = subgraphResult.qaVerdict
  // Map qa verdict to orchestrator verdict (pass/fail/block)
  // 'conditional_pass' is treated as 'pass' at the orchestrator level
  const verdict: 'pass' | 'fail' | 'block' =
    qaVerdict === 'pass' || qaVerdict === 'conditional_pass'
      ? 'pass'
      : qaVerdict === 'fail'
        ? 'fail'
        : 'block'

  return {
    qaResult: {
      verdict,
      failures: subgraphResult.acVerificationResults?.filter(r => r.verdict === 'fail') ?? [],
    },
    pipelinePhase: 'qa_verify',
    errors: subgraphResult.errors?.length ? subgraphResult.errors : [],
  }
}

// ============================================================================
// Plan Refinement State Mapping
// ============================================================================

/**
 * Maps plan-refinement-v2 subgraph output to orchestrator state.
 */
export function mapPlanRefinementResultToOrchestratorState(
  subgraphResult: PlanRefinementV2State,
): Partial<PipelineOrchestratorV2State> {
  const errors = subgraphResult.errors ?? []
  const isError = subgraphResult.refinementV2Phase === 'error'

  return {
    refinedPlan: subgraphResult.normalizedPlan as Record<string, unknown> | null,
    planFlows: (subgraphResult.flows ?? []) as unknown as Record<string, unknown>[],
    planPostconditionResult: subgraphResult.postconditionResult as Record<string, unknown> | null,
    pipelinePhase: 'plan_refinement',
    errors: isError || errors.length > 0 ? errors : [],
  }
}

// ============================================================================
// Story Generation State Mapping
// ============================================================================

/**
 * Maps story-generation-v2 subgraph output to orchestrator state.
 * Extracts generated story IDs from orderedStories or writeResult.
 */
export function mapStoryGenerationResultToOrchestratorState(
  subgraphResult: StoryGenerationV2State,
): Partial<PipelineOrchestratorV2State> {
  const errors = subgraphResult.errors ?? []
  const isError = subgraphResult.generationV2Phase === 'error'

  // Extract story IDs from ordered stories (preferred) or enriched stories
  const orderedStories = subgraphResult.orderedStories ?? []
  const enrichedStories = subgraphResult.enrichedStories ?? []
  const stories = orderedStories.length > 0 ? orderedStories : enrichedStories

  // Story IDs come from the title field (used as identifier) — these are
  // written to KB by write_to_kb node and available as story identifiers
  const generatedStoryIds = stories.map(s => s.title).filter(Boolean)

  return {
    storyIds: generatedStoryIds,
    pipelinePhase: 'story_generation',
    errors: isError || errors.length > 0 ? errors : [],
  }
}

// ============================================================================
// Plan Refinement Wrapper
// ============================================================================

/**
 * Wraps the plan-refinement-v2 subgraph invocation.
 *
 * Builds LLM adapters from the factory, creates the subgraph,
 * invokes it with planSlug from orchestrator state, and maps the result back.
 */
export function createPlanRefinementWrapper(config: SubgraphInvokerConfig = {}) {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { planSlug, modelConfig, ollamaAvailable } = state

    logger.info('plan_refinement_wrapper: invoking plan-refinement-v2', {
      planSlug,
    })

    if (!planSlug) {
      return {
        pipelinePhase: 'plan_refinement',
        errors: ['plan_refinement_wrapper: no planSlug set'],
      }
    }

    try {
      // Build LLM adapters
      const factory = config.adapterFactory ?? createLlmAdapterFactory()
      const adapters = factory.buildPlanRefinementAdapters(modelConfig, ollamaAvailable)

      let result: PlanRefinementV2State
      if (config.createPlanRefinementGraph) {
        // Test path — use injected graph factory (no real adapters needed)
        const graphConfig: PlanRefinementV2GraphConfig = { ...adapters }
        const graph = config.createPlanRefinementGraph(graphConfig)
        result = await graph.invoke({ planSlug })
      } else {
        // Production path — load real KB/IO adapters lazily
        const kbAdapters = await loadKbAdapters()
        const toolAdapters = await loadToolAdapters()
        const graphConfig: PlanRefinementV2GraphConfig = {
          ...adapters,
          planLoader: kbAdapters.planLoader,
          queryKb: kbAdapters.queryKb,
          searchCodebase: toolAdapters.searchCodebase,
        }
        const { createPlanRefinementV2Graph } = await import('../../graphs/plan-refinement-v2.js')
        const graph = createPlanRefinementV2Graph(graphConfig)
        result = await graph.invoke({ planSlug })
      }

      return mapPlanRefinementResultToOrchestratorState(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('plan_refinement_wrapper: subgraph invocation failed', {
        planSlug,
        error: msg,
      })
      return {
        pipelinePhase: 'plan_refinement',
        errors: [`plan_refinement_wrapper: ${msg}`],
      }
    }
  }
}

// ============================================================================
// Story Generation Wrapper
// ============================================================================

/**
 * Wraps the story-generation-v2 subgraph invocation.
 *
 * Builds LLM adapters from the factory, creates the subgraph,
 * invokes it with planSlug and refined plan data from orchestrator state,
 * and maps the result back (extracting generated story IDs).
 */
export function createStoryGenerationWrapper(config: SubgraphInvokerConfig = {}) {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { planSlug, modelConfig, ollamaAvailable } = state

    logger.info('story_generation_wrapper: invoking story-generation-v2', {
      planSlug,
    })

    if (!planSlug) {
      return {
        pipelinePhase: 'story_generation',
        errors: ['story_generation_wrapper: no planSlug set'],
      }
    }

    try {
      // Build LLM adapters
      const factory = config.adapterFactory ?? createLlmAdapterFactory()
      const adapters = factory.buildStoryGenerationAdapters(modelConfig, ollamaAvailable)

      let result: StoryGenerationV2State
      if (config.createStoryGenerationGraph) {
        // Test path — use injected graph factory (no real adapters needed)
        const graphConfig = { ...adapters } as StoryGenerationV2GraphConfig
        const graph = config.createStoryGenerationGraph(graphConfig)
        result = await graph.invoke({ planSlug })
      } else {
        // Production path — load real KB/IO adapters lazily
        const kbAdapters = await loadKbAdapters()
        const toolAdapters = await loadToolAdapters()
        const graphConfig = {
          ...adapters,
          planLoader: kbAdapters.planLoader,
          kbWriter: kbAdapters.kbWriter,
          tokenLogger: kbAdapters.tokenLogger,
          searchCodebase: toolAdapters.searchCodebase,
          readFileSummary: toolAdapters.readFile,
        } as StoryGenerationV2GraphConfig
        const { createStoryGenerationV2Graph } = await import('../../graphs/story-generation-v2.js')
        const graph = createStoryGenerationV2Graph(graphConfig)
        result = await graph.invoke({ planSlug })
      }

      return mapStoryGenerationResultToOrchestratorState(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('story_generation_wrapper: subgraph invocation failed', {
        planSlug,
        error: msg,
      })
      return {
        pipelinePhase: 'story_generation',
        errors: [`story_generation_wrapper: ${msg}`],
      }
    }
  }
}

// ============================================================================
// Dev Implement Wrapper
// ============================================================================

/**
 * Wraps the dev-implement-v2 subgraph invocation.
 *
 * Builds LLM adapters from the factory, creates the subgraph,
 * invokes it with mapped orchestrator state, and maps the result back.
 */
export function createDevImplementWrapper(config: SubgraphInvokerConfig = {}) {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, modelConfig, ollamaAvailable } = state

    logger.info('dev_implement_wrapper: invoking dev-implement-v2', {
      storyId: currentStoryId,
      devExecutor: (modelConfig as Record<string, unknown>)?.devExecutor,
      devPlanner: (modelConfig as Record<string, unknown>)?.devPlanner,
    })

    if (!currentStoryId) {
      return {
        devResult: { verdict: 'stuck', errors: ['No currentStoryId set'] },
        pipelinePhase: 'dev_implement',
        errors: ['dev_implement_wrapper: no currentStoryId'],
      }
    }

    try {
      // Build adapters
      const factory = config.adapterFactory ?? createLlmAdapterFactory()
      const adapters = factory.buildDevImplementAdapters(modelConfig, ollamaAvailable)

      let result: DevImplementV2State
      if (config.createDevGraph) {
        // Test path — use injected graph factory (no real adapters needed)
        const graphConfig: DevImplementV2GraphConfig = { ...adapters }
        const graph = config.createDevGraph(graphConfig)
        result = await graph.invoke({ storyId: currentStoryId })
      } else {
        // Production path — load real KB/IO adapters lazily
        const kbAdapters = await loadKbAdapters()
        const toolAdapters = await loadToolAdapters()
        const graphConfig: DevImplementV2GraphConfig = {
          ...adapters,
          kbStoryAdapter: kbAdapters.kbStory,
          queryKb: kbAdapters.queryKb,
          searchCodebase: toolAdapters.searchCodebase,
          readFile: toolAdapters.readFile,
          writeFile: toolAdapters.writeFile,
          runTests: toolAdapters.runTests,
          maxInternalIterations: 15,
          maxPlannerIterations: 5,
        }
        const { createDevImplementV2Graph } = await import('../../graphs/dev-implement-v2.js')
        const graph = createDevImplementV2Graph(graphConfig)
        result = await graph.invoke({ storyId: currentStoryId })
      }

      return mapDevResultToOrchestratorState(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('dev_implement_wrapper: subgraph invocation failed', {
        storyId: currentStoryId,
        error: msg,
      })
      return {
        devResult: { verdict: 'stuck', errors: [msg] },
        pipelinePhase: 'dev_implement',
        errors: [`dev_implement_wrapper: ${msg}`],
      }
    }
  }
}

// ============================================================================
// Review Wrapper
// ============================================================================

/**
 * Wraps the review-v2 subgraph invocation.
 *
 * Builds LLM adapters from the factory, creates the subgraph,
 * invokes it with mapped orchestrator state, and maps the result back.
 */
export function createReviewWrapper(config: SubgraphInvokerConfig = {}) {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, worktreePath, modelConfig, ollamaAvailable } = state

    logger.info('review_wrapper: invoking review-v2', {
      storyId: currentStoryId,
      worktreePath,
    })

    if (!currentStoryId) {
      return {
        reviewResult: { verdict: 'block', findings: [] },
        pipelinePhase: 'review',
        errors: ['review_wrapper: no currentStoryId'],
      }
    }

    try {
      // Build adapters
      const factory = config.adapterFactory ?? createLlmAdapterFactory()
      const adapters = factory.buildReviewAdapters(modelConfig, ollamaAvailable)

      let result: ReviewV2State
      if (config.createReviewGraph) {
        // Test path — use injected graph factory (no real adapters needed)
        const graphConfig: ReviewV2GraphConfig = { ...adapters }
        const graph = config.createReviewGraph(graphConfig)
        result = await graph.invoke({
          storyId: currentStoryId,
          worktreePath: worktreePath ?? '',
        })
      } else {
        // Production path — load real KB/IO adapters lazily
        const kbAdapters = await loadKbAdapters()
        const toolAdapters = await loadToolAdapters()
        const graphConfig: ReviewV2GraphConfig = {
          ...adapters,
          diffReader: toolAdapters.diffReader,
          readFile: toolAdapters.readFile,
          searchCodebase: toolAdapters.searchCodebase,
          queryKb: kbAdapters.queryKb,
        }
        const { createReviewV2Graph } = await import('../../graphs/review-v2.js')
        const graph = createReviewV2Graph(graphConfig)
        result = await graph.invoke({
          storyId: currentStoryId,
          worktreePath: worktreePath ?? '',
        })
      }

      return mapReviewResultToOrchestratorState(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('review_wrapper: subgraph invocation failed', {
        storyId: currentStoryId,
        error: msg,
      })
      return {
        reviewResult: { verdict: 'block', findings: [] },
        pipelinePhase: 'review',
        errors: [`review_wrapper: ${msg}`],
      }
    }
  }
}

// ============================================================================
// Review Decision Node
// ============================================================================

/**
 * Processes the review result and updates retry context.
 * This is a node (not an edge function) because it needs to
 * update state before the conditional edge routes.
 */
export function createReviewDecisionNode() {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const verdict = state.reviewResult?.verdict ?? 'block'

    logger.info('review_decision: processing', {
      storyId: state.currentStoryId,
      verdict,
    })

    if (verdict === 'fail') {
      return {
        retryContext: updateRetryContext(
          state.retryContext,
          'review',
          state.reviewResult?.findings?.[0]?.toString() ?? 'Review failed',
        ),
        pipelinePhase: 'review_decision',
      }
    }

    return {
      pipelinePhase: 'review_decision',
    }
  }
}

// ============================================================================
// QA Verify Wrapper
// ============================================================================

/**
 * Wraps the qa-verify-v2 subgraph invocation.
 *
 * Builds LLM adapters from the factory, creates the subgraph,
 * invokes it with mapped orchestrator state, and maps the result back.
 */
export function createQAVerifyWrapper(config: SubgraphInvokerConfig = {}) {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, modelConfig, ollamaAvailable } = state

    logger.info('qa_verify_wrapper: invoking qa-verify-v2', {
      storyId: currentStoryId,
    })

    if (!currentStoryId) {
      return {
        qaResult: { verdict: 'block', failures: [] },
        pipelinePhase: 'qa_verify',
        errors: ['qa_verify_wrapper: no currentStoryId'],
      }
    }

    try {
      // Build adapters
      const factory = config.adapterFactory ?? createLlmAdapterFactory()
      const adapters = factory.buildQAVerifyAdapters(modelConfig, ollamaAvailable)

      let result: QAVerifyV2State
      if (config.createQAGraph) {
        // Test path — use injected graph factory (no real adapters needed)
        const graphConfig: QAVerifyV2GraphConfig = { ...adapters }
        const graph = config.createQAGraph(graphConfig)
        result = await graph.invoke({ storyId: currentStoryId })
      } else {
        // Production path — load real KB/IO adapters lazily
        const kbAdapters = await loadKbAdapters()
        const graphConfig: QAVerifyV2GraphConfig = {
          ...adapters,
          kbStoryAdapter: kbAdapters.kbStory,
          unitTestRunner: await createUnitTestRunnerAdapter(),
        }
        const { createQAVerifyV2Graph } = await import('../../graphs/qa-verify-v2.js')
        const graph = createQAVerifyV2Graph(graphConfig)
        result = await graph.invoke({ storyId: currentStoryId })
      }

      return mapQAResultToOrchestratorState(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('qa_verify_wrapper: subgraph invocation failed', {
        storyId: currentStoryId,
        error: msg,
      })
      return {
        qaResult: { verdict: 'block', failures: [] },
        pipelinePhase: 'qa_verify',
        errors: [`qa_verify_wrapper: ${msg}`],
      }
    }
  }
}

// ============================================================================
// QA Decision Node
// ============================================================================

/**
 * Processes the QA result and updates retry context.
 */
export function createQADecisionNode() {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const verdict = state.qaResult?.verdict ?? 'block'

    logger.info('qa_decision: processing', {
      storyId: state.currentStoryId,
      verdict,
    })

    if (verdict === 'fail') {
      return {
        retryContext: updateRetryContext(
          state.retryContext,
          'qa',
          state.qaResult?.failures?.[0]?.toString() ?? 'QA failed',
        ),
        pipelinePhase: 'qa_decision',
      }
    }

    return {
      pipelinePhase: 'qa_decision',
    }
  }
}

// ============================================================================
// Merge + Cleanup Node
// ============================================================================

/**
 * Combines merge_pr and cleanup_worktree into a single node.
 * Calls createMergePrNode then createCleanupWorktreeNode in sequence.
 */
export function createMergeCleanupNode(config?: MergeCleanupConfig) {
  const monorepoRoot = config?.monorepoRoot ?? '/tmp/monorepo'
  const defaultBaseBranch = config?.defaultBaseBranch ?? 'main'

  const gitOpsConfig: GitOpsConfig = {
    monorepoRoot,
    defaultBaseBranch,
    shellExec: config?.shellExec,
  }

  const worktreeConfig: WorktreeNodeConfig = {
    monorepoRoot,
    shellExec: config?.shellExec,
  }

  const mergePrNode = createMergePrNode(gitOpsConfig)
  const cleanupWorktreeNode = createCleanupWorktreeNode(worktreeConfig)

  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId } = state

    logger.info('merge_cleanup: starting merge', { storyId: currentStoryId })

    // Step 1: Merge the PR
    const mergeResult = await mergePrNode(state)

    if (mergeResult.errors && mergeResult.errors.length > 0) {
      logger.warn('merge_cleanup: merge failed, skipping cleanup', {
        storyId: currentStoryId,
        errors: mergeResult.errors,
      })
      return {
        pipelinePhase: 'merge_cleanup',
        errors: mergeResult.errors,
      }
    }

    logger.info('merge_cleanup: merge complete, starting cleanup', {
      storyId: currentStoryId,
    })

    // Step 2: Cleanup the worktree
    if (currentStoryId) {
      const cleanupResult = await cleanupWorktreeNode({ storyId: currentStoryId })

      if (!cleanupResult.cleanupResult.removed) {
        logger.warn('merge_cleanup: worktree cleanup failed (non-fatal)', {
          storyId: currentStoryId,
          error: cleanupResult.cleanupResult.error,
        })
      }
    }

    logger.info('merge_cleanup: complete', { storyId: currentStoryId })

    return {
      pipelinePhase: 'merge_cleanup',
    }
  }
}

// ============================================================================
// Status Transition Helper
// ============================================================================

/**
 * Transitions a story through the required intermediate states to reach
 * 'completed'. The DB trigger requires artifacts at each state boundary.
 *
 * Path: needs_code_review -> ready_for_qa -> in_qa -> completed
 * (Assumes story is currently past dev_implement, so needs_code_review is valid)
 */
export async function transitionToCompleted(storyId: string, kbAdapter: KbAdapter): Promise<void> {
  const transitions = [
    {
      status: 'needs_code_review',
      artifact: { type: 'proof', content: { automated: true, phase: 'code_review' } },
    },
    {
      status: 'ready_for_qa',
      artifact: { type: 'review', content: { automated: true, verdict: 'pass' } },
    },
    {
      status: 'in_qa',
      artifact: { type: 'verification', content: { automated: true, phase: 'qa' } },
    },
    {
      status: 'completed',
      artifact: { type: 'qa_gate', content: { automated: true, verdict: 'pass' } },
    },
  ]

  for (const { status, artifact } of transitions) {
    await kbAdapter.writeArtifact(storyId, artifact.type, artifact.content)
    await kbAdapter.updateStoryStatus(storyId, status)
    logger.info('transitionToCompleted: stepped', { storyId, status })
  }
}

// ============================================================================
// Dependency Resolution Helper
// ============================================================================

/**
 * Finds stories blocked by the completed story and checks if all their
 * blockers are now completed. If so, they could be unblocked.
 *
 * Returns the list of story IDs that were unblocked.
 */
export async function resolveDownstreamDependencies(
  completedStoryId: string,
  completedStories: string[],
  kbAdapter: KbAdapter,
): Promise<string[]> {
  const blockedDownstream = await kbAdapter.listStories({ blockedBy: completedStoryId })
  const allCompleted = new Set([...completedStories, completedStoryId])
  const unblockedIds: string[] = []

  for (const story of blockedDownstream) {
    // If the story's blocker is the completed story and it is now resolved
    if (story.blockedBy && allCompleted.has(story.blockedBy)) {
      logger.info('resolveDownstreamDependencies: unblocking story', {
        storyId: story.id,
        wasBlockedBy: completedStoryId,
      })
      unblockedIds.push(story.id)
    }
  }

  return unblockedIds
}

// ============================================================================
// Post Completion Node
// ============================================================================

/**
 * Handles post-story-completion tasks:
 * - Writes a completion_report artifact to KB
 * - Updates story status to completed (with intermediate transitions)
 * - Resolves downstream dependencies
 * - Adds story to completedStories
 */
export function createPostCompletionNode(config?: PostCompletionConfig) {
  const kbAdapter = config?.kbAdapter

  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, completedStories } = state

    logger.info('post_completion: processing', { storyId: currentStoryId })

    if (!currentStoryId) {
      logger.warn('post_completion: no currentStoryId, skipping')
      return {
        pipelinePhase: 'post_completion',
      }
    }

    // If no KB adapter is provided, fall back to stub behavior
    if (!kbAdapter) {
      logger.info('post_completion: no KB adapter, using stub behavior', {
        storyId: currentStoryId,
      })
      return {
        completedStories: [currentStoryId],
        pipelinePhase: 'post_completion',
      }
    }

    try {
      // Step 1: Write completion report artifact
      await kbAdapter.writeArtifact(currentStoryId, 'completion_report', {
        storyId: currentStoryId,
        completedAt: new Date().toISOString(),
        automated: true,
        pipelineVersion: 'v2',
      })

      logger.info('post_completion: completion report written', {
        storyId: currentStoryId,
      })

      // Step 2: Transition status to completed through required intermediate states
      await transitionToCompleted(currentStoryId, kbAdapter)

      logger.info('post_completion: story status updated to completed', {
        storyId: currentStoryId,
      })

      // Step 3: Resolve downstream dependencies
      const unblockedIds = await resolveDownstreamDependencies(
        currentStoryId,
        completedStories,
        kbAdapter,
      )

      if (unblockedIds.length > 0) {
        logger.info('post_completion: unblocked downstream stories', {
          storyId: currentStoryId,
          unblockedIds,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('post_completion: KB operations failed', {
        storyId: currentStoryId,
        error: msg,
      })
      // Still mark as completed in pipeline state even if KB fails,
      // to avoid re-processing the same story
      return {
        completedStories: [currentStoryId],
        pipelinePhase: 'post_completion',
        errors: [`post_completion: KB operations failed: ${msg}`],
      }
    }

    return {
      completedStories: [currentStoryId],
      pipelinePhase: 'post_completion',
    }
  }
}

// ============================================================================
// Block Story Node
// ============================================================================

/**
 * Handles blocking a story that cannot proceed.
 * Updates KB story status to blocked with reason.
 * Adds it to blockedStories and resets per-story state.
 */
export function createBlockStoryNode(config?: BlockStoryConfig) {
  const kbAdapter = config?.kbAdapter

  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, retryContext } = state
    const reason = retryContext?.lastFailureReason ?? 'Unknown reason'

    logger.info('block_story: blocking story', {
      storyId: currentStoryId,
      reason,
    })

    if (currentStoryId && kbAdapter) {
      try {
        await kbAdapter.updateStoryStatus(currentStoryId, 'blocked')
        logger.info('block_story: KB status updated to blocked', {
          storyId: currentStoryId,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error('block_story: failed to update KB status', {
          storyId: currentStoryId,
          error: msg,
        })
      }
    }

    return {
      blockedStories: currentStoryId ? [currentStoryId] : [],
      pipelinePhase: 'block_story',
    }
  }
}
