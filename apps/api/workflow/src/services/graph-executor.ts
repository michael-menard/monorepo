import { randomUUID } from 'node:crypto'
import { logger } from '@repo/logger'
import { createDevImplementV2Graph } from '../graphs/dev-implement-v2.js'
import { createPlanRefinementV2Graph } from '../graphs/plan-refinement-v2.js'
import { createQAVerifyV2Graph } from '../graphs/qa-verify-v2.js'
import { createReviewV2Graph } from '../graphs/review-v2.js'
import { createStoryGenerationV2Graph } from '../graphs/story-generation-v2.js'
import type { DevImplementV2State } from '../state/dev-implement-v2-state.js'
import type { PlanRefinementV2State } from '../state/plan-refinement-v2-state.js'
import type { QAVerifyV2State } from '../state/qa-verify-v2-state.js'
import type { ReviewV2State } from '../state/review-v2-state.js'
import type { StoryGenerationV2State } from '../state/story-generation-v2-state.js'
import type {
  GraphInvokeRequest,
  GraphInvokeResponse,
  PlanGraphInvokeRequest,
  ReviewGraphInvokeRequest,
} from '../routes/__types__/graph-invoke.js'
import {
  getDbClient,
  kb_get_plan,
  kb_upsert_plan,
  kb_write_artifact,
  kb_update_story_status,
} from '@repo/knowledge-base'
import { createKbAdapters, logInvocationAdapter, logOutcomeAdapter } from './kb-adapters.js'
import { createLlmAdapters } from './llm-adapters.js'
import { createToolAdapters } from './tool-adapters.js'
import { serializeFlowsToContent } from '../nodes/plan-refinement-v2/load-plan.js'

// ============================================================================
// KB Adapters (lazy initialization)
// ============================================================================

let kbAdapters: ReturnType<typeof createKbAdapters> | null = null
let llmAdapters: ReturnType<typeof createLlmAdapters> | null = null
let toolAdapters: ReturnType<typeof createToolAdapters> | null = null

function getKbAdapters() {
  if (!kbAdapters) {
    kbAdapters = createKbAdapters()
  }
  return kbAdapters
}

function getLlmAdapters() {
  if (!llmAdapters) {
    llmAdapters = createLlmAdapters()
  }
  return llmAdapters
}

function getToolAdapters() {
  if (!toolAdapters) {
    toolAdapters = createToolAdapters()
  }
  return toolAdapters
}

// ============================================================================
// Dev Implement V2
// ============================================================================

export async function executeDevImplementV2(
  request: GraphInvokeRequest,
): Promise<GraphInvokeResponse> {
  const threadId = request.threadId ?? randomUUID()
  const invocationId = `dev-implement-v2-${request.storyId}-${Date.now()}`
  const startTime = Date.now()

  logger.info('Starting dev-implement-v2 execution', { storyId: request.storyId, threadId })

  // Get all adapters for the graph
  const kbAdaptersLocal = getKbAdapters()
  const llmAdaptersLocal = getLlmAdapters()
  const toolAdaptersLocal = getToolAdapters()

  // Create graph with full adapter wiring
  // This enables real LLM calls via MODL-0010 providers (Ollama/Qwen)
  // and real tool execution (file I/O, test running)
  const graph = createDevImplementV2Graph({
    // KB adapters
    kbStoryAdapter: kbAdaptersLocal.kbStoryAdapter,
    queryKb: kbAdaptersLocal.queryKb,
    // LLM adapters - wire to MODL-0010 providers
    plannerLlmAdapter: llmAdaptersLocal.plannerLlmAdapter,
    executorLlmAdapter: llmAdaptersLocal.executorLlmAdapter,
    // Tool adapters - wire to filesystem and test runner
    readFile: toolAdaptersLocal.readFile,
    writeFile: toolAdaptersLocal.writeFile,
    searchCodebase: toolAdaptersLocal.searchCodebase,
    runTests: toolAdaptersLocal.runTests,
  })

  try {
    const result = (await graph.invoke({
      storyId: request.storyId,
    })) as DevImplementV2State

    const durationMs = Date.now() - startTime
    const status = result.errors?.length ? 'failed' : 'completed'
    const verdict = result.executorOutcome?.verdict ?? 'complete'

    // Log telemetry (fire-and-forget)
    const totalTokens = result.tokenUsage?.reduce(
      (acc, t) => ({ input: acc.input + t.inputTokens, output: acc.output + t.outputTokens }),
      { input: 0, output: 0 },
    ) ?? { input: 0, output: 0 }

    void logInvocationAdapter({
      invocationId,
      agentName: 'dev-implement-v2',
      storyId: request.storyId,
      phase: 'execute',
      status: status === 'completed' ? 'success' : 'failure',
      inputTokens: totalTokens.input,
      outputTokens: totalTokens.output,
      durationMs,
    })

    void logOutcomeAdapter({
      storyId: request.storyId,
      finalVerdict: verdict === 'complete' ? 'pass' : 'fail',
      totalInputTokens: totalTokens.input,
      totalOutputTokens: totalTokens.output,
      durationMs,
      primaryBlocker: result.executorOutcome?.diagnosis,
    })

    return {
      status,
      threadId,
      storyId: request.storyId,
      phase: result.devImplementV2Phase ?? 'complete',
      durationMs,
      summary: {
        verdict,
        filesCreated: result.executorOutcome?.filesCreated ?? [],
        filesModified: result.executorOutcome?.filesModified ?? [],
        errors: result.errors ?? [],
      },
    }
  } catch (err) {
    const durationMs = Date.now() - startTime

    // Log failure telemetry
    void logInvocationAdapter({
      invocationId,
      agentName: 'dev-implement-v2',
      storyId: request.storyId,
      phase: 'execute',
      status: 'failure',
      durationMs,
      errorMessage: err instanceof Error ? err.message : String(err),
    })

    logger.error('Graph execution failed', { threadId, error: err })
    return {
      status: 'error',
      threadId,
      storyId: request.storyId,
      phase: 'error',
      durationMs,
      summary: {
        verdict: 'error',
        errors: [err instanceof Error ? err.message : String(err)],
      },
    }
  }
}

// ============================================================================
// Plan Refinement V2
// ============================================================================

export async function executePlanRefinementV2(
  request: PlanGraphInvokeRequest,
): Promise<GraphInvokeResponse> {
  const threadId = request.threadId ?? randomUUID()
  const invocationId = `plan-refinement-v2-${request.planSlug}-${Date.now()}`
  const startTime = Date.now()

  logger.info('Starting plan-refinement-v2 execution', { planSlug: request.planSlug, threadId })

  // Get KB adapters for queryKb
  const adapters = getKbAdapters()

  const llms = getLlmAdapters()

  const graph = createPlanRefinementV2Graph({
    planLoader: adapters.planLoader,
    queryKb: adapters.queryKb,
    llmAdapter: llms.refinementLlmAdapter,
  })

  try {
    const result = (await graph.invoke({
      planSlug: request.planSlug,
    })) as PlanRefinementV2State

    const durationMs = Date.now() - startTime
    const status = result.errors?.length ? 'failed' : 'completed'
    const verdict = result.postconditionResult?.passed ? 'complete' : 'stuck'

    // Write refined flows back to the KB plan so story-generation can load them
    if (result.flows?.length && result.normalizedPlan) {
      try {
        const db = getDbClient()
        const existingPlan = await kb_get_plan({ db }, { plan_slug: request.planSlug })
        const currentContent = String(
          (existingPlan.plan as Record<string, unknown> | null)?.['rawContent'] ?? '',
        )
        const updatedContent = serializeFlowsToContent(currentContent, result.flows)
        const existing = (existingPlan.plan as Record<string, unknown> | null) ?? {}
        const existingPriority = existing['priority'] as string | undefined
        const validPriorities = ['P1', 'P2', 'P3', 'P4', 'P5'] as const
        await kb_upsert_plan(
          { db },
          {
            plan_slug: request.planSlug,
            title: result.normalizedPlan.title,
            raw_content: updatedContent,
            status: 'accepted',
            priority: validPriorities.includes(existingPriority as (typeof validPriorities)[number])
              ? (existingPriority as (typeof validPriorities)[number])
              : 'P3',
            plan_type: (existing['planType'] as string | undefined) ?? undefined,
            story_prefix: (existing['storyPrefix'] as string | undefined) ?? undefined,
            summary: (existing['summary'] as string | undefined) ?? undefined,
            tags: (existing['tags'] as string[] | undefined) ?? undefined,
          },
        )
        logger.info('executePlanRefinementV2: wrote refined flows back to KB', {
          planSlug: request.planSlug,
          flowCount: result.flows.length,
        })
      } catch (writeErr) {
        logger.warn('executePlanRefinementV2: failed to write flows back to KB (non-fatal)', {
          planSlug: request.planSlug,
          error: writeErr instanceof Error ? writeErr.message : String(writeErr),
        })
      }
    }

    // Log telemetry (fire-and-forget)
    void logInvocationAdapter({
      invocationId,
      agentName: 'plan-refinement-v2',
      phase: 'plan',
      status: status === 'completed' && verdict === 'complete' ? 'success' : 'failure',
      durationMs,
    })

    return {
      status,
      threadId,
      storyId: request.planSlug,
      phase: result.refinementV2Phase ?? 'complete',
      durationMs,
      summary: {
        verdict,
        errors: result.errors ?? [],
      },
    }
  } catch (err) {
    const durationMs = Date.now() - startTime

    // Log failure telemetry
    void logInvocationAdapter({
      invocationId,
      agentName: 'plan-refinement-v2',
      phase: 'plan',
      status: 'failure',
      durationMs,
      errorMessage: err instanceof Error ? err.message : String(err),
    })

    logger.error('Graph execution failed', { threadId, error: err })
    return {
      status: 'error',
      threadId,
      storyId: request.planSlug,
      phase: 'error',
      durationMs,
      summary: {
        verdict: 'error',
        errors: [err instanceof Error ? err.message : String(err)],
      },
    }
  }
}

// ============================================================================
// QA Verify V2
// ============================================================================

export async function executeQAVerifyV2(request: GraphInvokeRequest): Promise<GraphInvokeResponse> {
  const threadId = request.threadId ?? randomUUID()
  const invocationId = `qa-verify-v2-${request.storyId}-${Date.now()}`
  const startTime = Date.now()

  logger.info('Starting qa-verify-v2 execution', { storyId: request.storyId, threadId })

  const graph = createQAVerifyV2Graph()

  try {
    const result = (await graph.invoke({
      storyId: request.storyId,
    })) as QAVerifyV2State

    const durationMs = Date.now() - startTime
    const status = result.errors?.length ? 'failed' : 'completed'
    const verdict = result.qaVerdict === 'pass' ? 'complete' : 'stuck'

    // Log telemetry (fire-and-forget)
    void logInvocationAdapter({
      invocationId,
      agentName: 'qa-verify-v2',
      storyId: request.storyId,
      phase: 'qa',
      status: status === 'completed' && verdict === 'complete' ? 'success' : 'failure',
      durationMs,
    })

    return {
      status,
      threadId,
      storyId: request.storyId,
      phase: result.qaVerifyV2Phase ?? 'complete',
      durationMs,
      summary: {
        verdict,
        errors: result.errors ?? [],
      },
    }
  } catch (err) {
    const durationMs = Date.now() - startTime

    // Log failure telemetry
    void logInvocationAdapter({
      invocationId,
      agentName: 'qa-verify-v2',
      storyId: request.storyId,
      phase: 'qa',
      status: 'failure',
      durationMs,
      errorMessage: err instanceof Error ? err.message : String(err),
    })

    logger.error('Graph execution failed', { threadId, error: err })
    return {
      status: 'error',
      threadId,
      storyId: request.storyId,
      phase: 'error',
      durationMs,
      summary: {
        verdict: 'error',
        errors: [err instanceof Error ? err.message : String(err)],
      },
    }
  }
}

// ============================================================================
// Review V2
// ============================================================================

export async function executeReviewV2(
  request: ReviewGraphInvokeRequest,
): Promise<GraphInvokeResponse> {
  const threadId = request.threadId ?? randomUUID()
  const invocationId = `review-v2-${request.storyId}-${Date.now()}`
  const startTime = Date.now()

  logger.info('Starting review-v2 execution', {
    storyId: request.storyId,
    worktreePath: request.worktreePath,
    threadId,
  })

  const kbAdaptersLocal = getKbAdapters()
  const llmAdaptersLocal = getLlmAdapters()
  const toolAdaptersLocal = getToolAdapters()

  const graph = createReviewV2Graph({
    diffReader: toolAdaptersLocal.diffReader,
    riskLlmAdapter: llmAdaptersLocal.riskAssessorLlmAdapter,
    reviewLlmAdapter: llmAdaptersLocal.reviewAgentLlmAdapter,
    readFile: toolAdaptersLocal.readFile,
    searchCodebase: toolAdaptersLocal.searchCodebase,
    queryKb: kbAdaptersLocal.queryKb,
  })

  try {
    const result = (await graph.invoke({
      storyId: request.storyId,
      worktreePath: request.worktreePath ?? '',
    })) as ReviewV2State

    const durationMs = Date.now() - startTime
    const verdict = result.reviewVerdict ?? 'fail'
    const status = result.errors?.length ? 'failed' : 'completed'

    const totalTokens = result.tokenUsage?.reduce(
      (acc, t) => ({ input: acc.input + t.inputTokens, output: acc.output + t.outputTokens }),
      { input: 0, output: 0 },
    ) ?? { input: 0, output: 0 }

    // Write review artifact to KB then advance story state (fire-and-forget)
    void writeReviewArtifactToKb(request.storyId, result, verdict, durationMs)
    void advanceStoryAfterReview(request.storyId, verdict)

    void logInvocationAdapter({
      invocationId,
      agentName: 'review-v2',
      storyId: request.storyId,
      phase: 'review',
      status: status === 'completed' && verdict === 'pass' ? 'success' : 'failure',
      inputTokens: totalTokens.input,
      outputTokens: totalTokens.output,
      durationMs,
    })

    return {
      status,
      threadId,
      storyId: request.storyId,
      phase: result.reviewV2Phase ?? 'complete',
      durationMs,
      summary: {
        verdict: verdict === 'pass' ? 'complete' : 'stuck',
        errors: result.errors ?? [],
      },
    }
  } catch (err) {
    const durationMs = Date.now() - startTime

    void logInvocationAdapter({
      invocationId,
      agentName: 'review-v2',
      storyId: request.storyId,
      phase: 'review',
      status: 'failure',
      durationMs,
      errorMessage: err instanceof Error ? err.message : String(err),
    })

    logger.error('Graph execution failed', { threadId, error: err })
    return {
      status: 'error',
      threadId,
      storyId: request.storyId,
      phase: 'error',
      durationMs,
      summary: {
        verdict: 'error',
        errors: [err instanceof Error ? err.message : String(err)],
      },
    }
  }
}

/**
 * Writes the review artifact to KB after graph completion.
 * Fire-and-forget — errors are logged but don't fail the response.
 */
async function writeReviewArtifactToKb(
  storyId: string,
  result: ReviewV2State,
  verdict: 'pass' | 'fail',
  durationMs: number,
): Promise<void> {
  try {
    const db = getDbClient()
    const criticalCount = result.reviewFindings.filter(f => f.severity === 'critical').length
    const highCount = result.reviewFindings.filter(f => f.severity === 'high').length

    await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'review',
        phase: 'code_review',
        content: {
          verdict,
          reviewedDimensions: result.selectedReviewDimensions,
          findingsCount: result.reviewFindings.length,
          criticalCount,
          highCount,
          findings: result.reviewFindings,
          riskSurface: result.diffAnalysis?.riskSurface ?? 'unknown',
          changedFiles: result.diffAnalysis?.changedFiles.map(f => f.path) ?? [],
          durationMs,
          warnings: result.warnings ?? [],
        },
        summary: { verdict, findingsCount: result.reviewFindings.length, criticalCount, highCount },
      },
      { db },
    )

    logger.info('graph-executor: review artifact written to KB', { storyId, verdict })
  } catch (err) {
    logger.warn('graph-executor: failed to write review artifact (non-fatal)', {
      storyId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Advances story state in KB after review completes.
 * pass → ready_for_qa | fail → failed_code_review
 * Fire-and-forget.
 */
async function advanceStoryAfterReview(storyId: string, verdict: 'pass' | 'fail'): Promise<void> {
  try {
    const db = getDbClient()
    const newState = verdict === 'pass' ? 'ready_for_qa' : 'failed_code_review'

    await kb_update_story_status(
      { db },
      {
        story_id: storyId,
        state: newState,
        phase: verdict === 'pass' ? 'qa_verification' : 'code_review',
      },
    )

    logger.info('graph-executor: story state advanced after review', { storyId, newState })
  } catch (err) {
    logger.warn('graph-executor: failed to advance story state after review (non-fatal)', {
      storyId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ============================================================================
// Story Generation V2
// ============================================================================

export async function executeStoryGenerationV2(
  request: PlanGraphInvokeRequest,
): Promise<GraphInvokeResponse> {
  const threadId = request.threadId ?? randomUUID()
  const invocationId = `story-generation-v2-${request.planSlug}-${Date.now()}`
  const startTime = Date.now()

  logger.info('Starting story-generation-v2 execution', { planSlug: request.planSlug, threadId })

  // Get KB adapters for token logging and story writing
  const adapters = getKbAdapters()

  const llmsLocal = getLlmAdapters()

  const graph = createStoryGenerationV2Graph({
    planLoader: adapters.planLoader,
    tokenLogger: adapters.tokenLogger,
    kbWriter: adapters.kbWriter,
    slicerLlmAdapter: llmsLocal.slicerLlmAdapter,
    enricherLlmAdapter: llmsLocal.enricherLlmAdapter,
    dependencyWirerLlmAdapter: llmsLocal.dependencyWirerLlmAdapter,
  })

  try {
    const result = (await graph.invoke({
      planSlug: request.planSlug,
    })) as StoryGenerationV2State

    const durationMs = Date.now() - startTime
    const status = result.errors?.length ? 'failed' : 'completed'
    const verdict = result.writeResult?.storiesFailed === 0 ? 'complete' : 'stuck'

    // Log telemetry (fire-and-forget)
    const totalTokens = result.tokenUsage?.reduce(
      (acc, t) => ({ input: acc.input + t.inputTokens, output: acc.output + t.outputTokens }),
      { input: 0, output: 0 },
    ) ?? { input: 0, output: 0 }

    void logInvocationAdapter({
      invocationId,
      agentName: 'story-generation-v2',
      phase: 'plan',
      status: status === 'completed' ? 'success' : 'failure',
      inputTokens: totalTokens.input,
      outputTokens: totalTokens.output,
      durationMs,
    })

    return {
      status,
      threadId,
      storyId: request.planSlug, // Use planSlug as identifier
      phase: result.generationV2Phase ?? 'complete',
      durationMs,
      summary: {
        verdict,
        errors: result.errors ?? [],
      },
    }
  } catch (err) {
    const durationMs = Date.now() - startTime

    // Log failure telemetry
    void logInvocationAdapter({
      invocationId,
      agentName: 'story-generation-v2',
      phase: 'plan',
      status: 'failure',
      durationMs,
      errorMessage: err instanceof Error ? err.message : String(err),
    })

    logger.error('Graph execution failed', { threadId, error: err })
    return {
      status: 'error',
      threadId,
      storyId: request.planSlug,
      phase: 'error',
      durationMs,
      summary: {
        verdict: 'error',
        errors: [err instanceof Error ? err.message : String(err)],
      },
    }
  }
}
