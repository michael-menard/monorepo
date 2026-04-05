/**
 * Knowledge Base Adapters
 *
 * Provides adapter implementations that connect LangGraph workflow nodes
 * to the @repo/knowledge-base MCP tools for:
 * - Token logging (kb_log_tokens)
 * - Telemetry (workflow_log_invocation, workflow_log_outcome, workflow_log_decision)
 * - Story operations (kb_get_story, kb_list_stories)
 * - Knowledge queries (kb_search)
 *
 * These adapters are injected into graph factories to enable KB integration
 * while maintaining testability via dependency injection.
 */

import { logger } from '@repo/logger'
import {
  getDbClient,
  kb_get_story,
  kb_list_stories,
  kb_search,
  kb_get_plan,
  kb_create_story,
  kb_update_story_status,
  kb_write_artifact,
} from '@repo/knowledge-base'
import { EmbeddingClient } from '@repo/knowledge-base/embedding-client'
import { logInvocation } from '@repo/knowledge-base/telemetry'
import type { StoryEntry, StoryListAdapterFn } from '../nodes/pipeline-orchestrator/story-picker.js'
import type { TokenLoggerFn, KbWriterFn } from '../nodes/story-generation-v2/write-to-kb.js'
import type { QueryKbFn } from '../nodes/dev-implement-v2/implementation-executor.js'
import type { KbStoryAdapterFn } from '../nodes/dev-implement-v2/story-scout.js'
import type { PlanLoaderFn } from '../nodes/plan-refinement-v2/load-plan.js'
import { normalizeKbPlan } from '../nodes/plan-refinement-v2/load-plan.js'
import type { EnrichedStory } from '../state/story-generation-v2-state.js'

// ============================================================================
// Telemetry Types
// ============================================================================

type TelemetryPhase = 'setup' | 'plan' | 'execute' | 'review' | 'qa'
type TelemetryStatus = 'success' | 'failure' | 'partial'
type FinalVerdict = 'pass' | 'fail' | 'blocked' | 'cancelled'

// Token phase mapping for kb_log_tokens
type TokenPhase =
  | 'pm-generate'
  | 'pm-elaborate'
  | 'pm-refine'
  | 'dev-setup'
  | 'dev-implementation'
  | 'dev-fix'
  | 'code-review'
  | 'qa-verification'
  | 'qa-gate'
  | 'architect-review'
  | 'other'

// ============================================================================
// Database Client (lazy initialization)
// ============================================================================

let dbClient: ReturnType<typeof getDbClient> | null = null

function getDb() {
  if (!dbClient) {
    dbClient = getDbClient()
  }
  return dbClient
}

// ============================================================================
// Token Logging Adapter
// ============================================================================

/**
 * Token logger adapter for story-generation-v2 graph.
 * Logs aggregate token usage.
 *
 * Fire-and-forget: errors are logged but don't fail the workflow.
 *
 * TODO: Wire to actual kb_log_tokens once it's exported from @repo/knowledge-base
 */
export const tokenLoggerAdapter: TokenLoggerFn = async (
  planSlug: string,
  phase: string,
  inputTokens: number,
  outputTokens: number,
) => {
  try {
    // Log to console for now - full DB logging requires kb_log_tokens export
    logger.info('kb-adapters: token usage', {
      planSlug,
      phase,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      agent: 'story-generation-v2',
    })
  } catch (err) {
    logger.warn('kb-adapters: token logging failed (non-fatal)', {
      planSlug,
      phase,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ============================================================================
// Telemetry Adapters
// ============================================================================

/**
 * Log an agent invocation (fire-and-forget).
 * Uses logInvocation from @repo/knowledge-base/telemetry.
 */
export async function logInvocationAdapter(input: {
  invocationId: string
  agentName: string
  storyId?: string
  phase?: TelemetryPhase
  status: TelemetryStatus
  inputTokens?: number
  outputTokens?: number
  cachedTokens?: number
  durationMs?: number
  modelName?: string
  errorMessage?: string
}): Promise<{ id: string; invocationId: string } | null> {
  try {
    const result = await logInvocation({
      invocationId: input.invocationId,
      agentName: input.agentName,
      storyId: input.storyId,
      phase: input.phase,
      status: input.status,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      cachedTokens: input.cachedTokens ?? 0,
      durationMs: input.durationMs,
      modelName: input.modelName,
      errorMessage: input.errorMessage,
    })

    if (result) {
      return { id: result.id, invocationId: result.invocationId }
    }
    return null
  } catch (err) {
    logger.warn('kb-adapters: invocation logging failed (non-fatal)', {
      agentName: input.agentName,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Log a story outcome (fire-and-forget).
 */
export async function logOutcomeAdapter(input: {
  storyId: string
  finalVerdict: FinalVerdict
  qualityScore?: number
  totalInputTokens?: number
  totalOutputTokens?: number
  reviewIterations?: number
  qaIterations?: number
  durationMs?: number
  primaryBlocker?: string
}): Promise<{ id: string; storyId: string } | null> {
  try {
    // Log to console for now - full DB telemetry requires MCP call
    logger.info('kb-adapters: telemetry outcome', {
      storyId: input.storyId,
      finalVerdict: input.finalVerdict,
      qualityScore: input.qualityScore,
      totalInputTokens: input.totalInputTokens,
      totalOutputTokens: input.totalOutputTokens,
      durationMs: input.durationMs,
    })

    // Return generated ID
    return { id: `outcome-${input.storyId}`, storyId: input.storyId }
  } catch (err) {
    logger.warn('kb-adapters: outcome logging failed (non-fatal)', {
      storyId: input.storyId,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Log a HITL decision (fire-and-forget).
 */
export async function logDecisionAdapter(input: {
  storyId: string
  decisionType: string
  decisionText: string
  operatorId: string
  invocationId?: string
  context?: Record<string, unknown>
}): Promise<{ id: string } | null> {
  try {
    // Log to console for now
    logger.info('kb-adapters: telemetry decision', {
      storyId: input.storyId,
      decisionType: input.decisionType,
      operatorId: input.operatorId,
    })

    // Return generated ID
    return { id: `decision-${Date.now()}` }
  } catch (err) {
    logger.warn('kb-adapters: decision logging failed (non-fatal)', {
      storyId: input.storyId,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

// ============================================================================
// Plan Loader Adapter (Plan Refinement V2)
// ============================================================================

/**
 * Plan loader adapter for plan-refinement-v2 load_plan node.
 * Fetches a plan from the KB by planSlug and normalizes it into a NormalizedPlan.
 */
export const planLoaderAdapter: PlanLoaderFn = async (planSlug: string) => {
  try {
    const db = getDb()
    const result = await kb_get_plan({ db }, { plan_slug: planSlug })

    if (!result.plan) {
      logger.warn('kb-adapters: plan not found in KB', { planSlug })
      return null
    }

    const normalized = normalizeKbPlan(planSlug, result.plan as Record<string, unknown>)
    if (!normalized) {
      logger.warn('kb-adapters: plan normalization failed', { planSlug })
      return null
    }

    return normalized
  } catch (err) {
    logger.warn('kb-adapters: plan fetch failed', {
      planSlug,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

// ============================================================================
// Story Adapter
// ============================================================================

/**
 * KB story adapter for dev-implement-v2 story_scout node.
 * Fetches story context from the knowledge base.
 */
export const kbStoryAdapter: KbStoryAdapterFn = async (storyId: string) => {
  try {
    const db = getDb()
    const result = await kb_get_story(
      { db },
      { story_id: storyId, include_artifacts: false, include_dependencies: false },
    )

    if (!result.story) {
      logger.warn('kb-adapters: story not found in KB', { storyId })
      return null
    }

    const story = result.story

    // Extract acceptance criteria: prefer JSONB field, fall back to parsing description
    const acceptanceCriteria: string[] = []
    if (story.acceptanceCriteria) {
      if (Array.isArray(story.acceptanceCriteria)) {
        acceptanceCriteria.push(...story.acceptanceCriteria.map(String))
      } else if (typeof story.acceptanceCriteria === 'string') {
        acceptanceCriteria.push(story.acceptanceCriteria)
      }
    }
    if (acceptanceCriteria.length === 0 && story.description) {
      const acMatch = story.description.match(/ACCEPTANCE CRITERIA:\n([\s\S]*?)(?:\n\n[A-Z]|$)/)
      if (acMatch) {
        acceptanceCriteria.push(
          ...acMatch[1]
            .split('\n')
            .map(l => l.replace(/^[-*]\s*/, '').trim())
            .filter(Boolean),
        )
      }
    }

    // Extract subtasks from description
    const subtasks: string[] = []
    if (story.description) {
      const subtaskMatch = story.description.match(/SUBTASKS:\n([\s\S]*?)(?:\n\n[A-Z]|$)/)
      if (subtaskMatch) {
        subtasks.push(
          ...subtaskMatch[1]
            .split('\n')
            .map(l => l.replace(/^\d+\.\s*/, '').trim())
            .filter(Boolean),
        )
      }
    }

    return {
      title: story.title ?? storyId,
      acceptanceCriteria,
      subtasks,
      relatedStories: result.dependencies?.map(dep => ({
        storyId: dep.dependsOnId,
        title: dep.dependsOnId, // Would need separate lookup for title
        state: 'unknown',
      })),
    }
  } catch (err) {
    logger.warn('kb-adapters: story fetch failed', {
      storyId,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

// ============================================================================
// Embedding Client (lazy singleton)
// ============================================================================

let embeddingClient: EmbeddingClient | null = null

function getEmbeddingClient(): EmbeddingClient | null {
  if (embeddingClient) return embeddingClient

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    logger.warn('kb-adapters: OPENAI_API_KEY not set, KB search will be unavailable')
    return null
  }

  try {
    embeddingClient = new EmbeddingClient({
      apiKey,
      model: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
    })
    return embeddingClient
  } catch (err) {
    logger.error('kb-adapters: Failed to initialize EmbeddingClient', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

// ============================================================================
// Knowledge Query Adapter
// ============================================================================

/**
 * Query KB adapter for dev-implement-v2 and plan-refinement-v2 graphs.
 * Searches the knowledge base for relevant context using hybrid semantic + keyword search.
 *
 * Prerequisites:
 * - OPENAI_API_KEY env var must be set for semantic search
 * - KB must have relevant patterns/knowledge entries populated
 *
 * Falls back to keyword-only search if OpenAI is unavailable.
 */
export const queryKbAdapter: QueryKbFn = async (topic: string) => {
  try {
    logger.info('kb-adapters: KB query requested', { topic })

    const client = getEmbeddingClient()
    if (!client) {
      return `KB search unavailable: OPENAI_API_KEY not configured. Query was: "${topic}"`
    }

    const db = getDb()
    const result = await kb_search(
      {
        query: topic,
        role: 'dev',
        limit: 10,
        min_confidence: 0.3,
      },
      { db, embeddingClient: client },
    )

    if (result.results.length === 0) {
      return `No relevant knowledge found for: "${topic}". Consider adding patterns to the KB.`
    }

    // Format results for LLM consumption
    const formattedResults = result.results
      .map((entry, i) => {
        const tags = entry.tags?.join(', ') || 'none'
        const score = entry.relevance_score?.toFixed(3) ?? 'N/A'
        return `[${i + 1}] (relevance: ${score}, tags: ${tags})\n${entry.content}`
      })
      .join('\n\n---\n\n')

    const modeNote = result.metadata.fallback_mode ? ' (keyword-only fallback)' : ''

    return `Found ${result.results.length} relevant entries${modeNote}:\n\n${formattedResults}`
  } catch (err) {
    logger.warn('kb-adapters: KB query failed', {
      topic,
      error: err instanceof Error ? err.message : String(err),
    })
    return `KB query failed: ${err instanceof Error ? err.message : String(err)}`
  }
}

// ============================================================================
// KB Writer Adapter (Story Generation)
// ============================================================================

/**
 * Derives a story ID prefix from a plan slug.
 * e.g. "ai-part-recommender" → "APR"
 */
function planSlugToPrefix(planSlug: string): string {
  const words = planSlug.replace(/-/g, ' ').split(' ').filter(Boolean).slice(0, 5)
  return words.map(w => w[0]!.toUpperCase()).join('')
}

/**
 * KB writer adapter for story-generation-v2 write_to_kb node.
 * Writes enriched stories to the knowledge base via kb_create_story.
 */
export const kbWriterAdapter: KbWriterFn = async (stories: EnrichedStory[], planSlug: string) => {
  const errors: string[] = []
  let storiesWritten = 0
  let storiesFailed = 0

  const db = getDb()
  const prefix = planSlugToPrefix(planSlug)
  const startSequence = 1010
  const step = 10

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i]!
    const storyId = `${prefix}-${startSequence + i * step}`

    try {
      // Build description including enrichment context
      const descriptionParts = [story.description]
      if (story.implementationHints.length > 0) {
        descriptionParts.push(
          `\n\nImplementation hints:\n${story.implementationHints.map(h => `- ${h}`).join('\n')}`,
        )
      }
      if (story.relevantFiles.length > 0) {
        descriptionParts.push(`\nRelevant files: ${story.relevantFiles.join(', ')}`)
      }
      if (story.scopeBoundary.inScope.length > 0) {
        descriptionParts.push(`\nIn scope: ${story.scopeBoundary.inScope.join('; ')}`)
      }
      if (story.scopeBoundary.outOfScope.length > 0) {
        descriptionParts.push(`\nOut of scope: ${story.scopeBoundary.outOfScope.join('; ')}`)
      }

      await kb_create_story(
        { db },
        {
          story_id: storyId,
          title: story.title,
          feature: prefix.toLowerCase(),
          description: descriptionParts.join(''),
          state: 'ready',
          priority: story.minimum_path ? 'P2' : 'P3',
          acceptance_criteria: story.acceptance_criteria,
          plan_slug: planSlug,
        },
      )

      logger.info('kb-adapters: story written to KB', {
        storyId,
        title: story.title,
        planSlug,
        parentFlowId: story.parent_flow_id,
        minimumPath: story.minimum_path,
      })

      storiesWritten++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`Failed to write story "${story.title}" (${storyId}): ${message}`)
      storiesFailed++
      logger.error('kb-adapters: story write failed', {
        storyId,
        title: story.title,
        error: message,
      })
    }
  }

  return {
    storiesWritten,
    storiesFailed,
    errors,
  }
}

// ============================================================================
// Story List Adapter (Pipeline Orchestrator — Story Picker)
// ============================================================================

/**
 * Story list adapter for the pipeline orchestrator story picker.
 * Fetches all stories linked to a plan from the KB and maps them
 * to StoryEntry objects with state, priority, and blocker info.
 */
export const storyListAdapter: StoryListAdapterFn = async (planSlug: string) => {
  try {
    const db = getDb()
    const result = await kb_list_stories(
      { db },
      {
        plan_slug: planSlug,
        limit: 100,
        offset: 0,
      },
    )

    const entries: StoryEntry[] = result.stories.map(s => ({
      storyId: s.storyId ?? '',
      state: (s.state as string) ?? 'backlog',
      priority: (s.priority as StoryEntry['priority']) ?? null,
      blockedByStory: (s.blockedByStory as string) ?? null,
    }))

    logger.info('kb-adapters: loaded stories for plan', {
      planSlug,
      count: entries.length,
      total: result.total,
    })

    return entries
  } catch (err) {
    logger.error('kb-adapters: story list fetch failed', {
      planSlug,
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

// ============================================================================
// Continuous Mode — Next Plan Discovery
// ============================================================================

/** Terminal story states that are not eligible for pipeline processing. */
const TERMINAL_STORY_STATES = new Set(['completed', 'cancelled', 'blocked', 'deferred'])

/**
 * Finds the next plan with eligible stories for continuous-mode processing.
 *
 * Queries plans with status 'stories-created' or 'in-progress', ordered by
 * sort_order (work order position), then priority (P1 first), then creation date. For each plan, checks whether it
 * has at least one story that is not in a terminal state and whose blocker
 * (if any) is completed.
 *
 * @returns The plan slug of the first plan with eligible stories, or null.
 */
export async function getNextPlanWithEligibleStories(): Promise<string | null> {
  try {
    const db = getDb()

    // Query plans with eligible statuses via raw SQL (kb_list_plans is not
    // re-exported from @repo/knowledge-base, so we use the DB client directly)
    const planRows = await db.execute<{
      plan_slug: string
      priority: string | null
      sort_order: number | null
      created_at: Date
    }>(
      `SELECT plan_slug, priority, sort_order, created_at
       FROM workflow.plans
       WHERE status IN ('stories-created', 'in-progress')
         AND deleted_at IS NULL
       ORDER BY
         sort_order ASC NULLS LAST,
         CASE priority
           WHEN 'P1' THEN 1
           WHEN 'P2' THEN 2
           WHEN 'P3' THEN 3
           WHEN 'P4' THEN 4
           WHEN 'P5' THEN 5
           ELSE 99
         END,
         created_at ASC
       LIMIT 50`,
    )

    if (!planRows.rows || planRows.rows.length === 0) {
      logger.info('getNextPlanWithEligibleStories: no eligible plans found')
      return null
    }

    // For each plan, check if it has at least one eligible story
    for (const plan of planRows.rows) {
      const planSlug = plan.plan_slug
      try {
        const result = await kb_list_stories(
          { db },
          {
            plan_slug: planSlug,
            limit: 100,
            offset: 0,
          },
        )

        // Check for at least one non-terminal story whose blocker is resolved
        const storyMap = new Map<string, Record<string, unknown>>(
          result.stories.map(s => [s.storyId ?? '', s as Record<string, unknown>]),
        )

        const hasEligible = result.stories.some(s => {
          const story = s as Record<string, unknown>
          const state = (story.state as string) ?? 'backlog'
          if (TERMINAL_STORY_STATES.has(state)) return false

          // If story has a blocker, check if blocker is completed
          const blockerId = story.blockedByStory as string | null
          if (blockerId) {
            const blocker = storyMap.get(blockerId)
            if (blocker && (blocker.state as string) !== 'completed') return false
          }

          return true
        })

        if (hasEligible) {
          logger.info('getNextPlanWithEligibleStories: found plan', {
            planSlug,
            priority: plan.priority,
            storyCount: result.stories.length,
          })
          return planSlug
        }
      } catch (err) {
        logger.warn('getNextPlanWithEligibleStories: error checking plan stories', {
          planSlug,
          error: err instanceof Error ? err.message : String(err),
        })
        // Continue to next plan
      }
    }

    logger.info('getNextPlanWithEligibleStories: no plans with eligible stories')
    return null
  } catch (err) {
    logger.error('getNextPlanWithEligibleStories: query failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

// ============================================================================
// Composite Adapter Config
// ============================================================================

/**
 * Returns a complete set of KB adapters for all graphs.
 * Use this to wire up all KB integrations at once.
 */
export function createKbAdapters() {
  return {
    // Story Generation V2
    tokenLogger: tokenLoggerAdapter,
    kbWriter: kbWriterAdapter,

    // Dev Implement V2
    kbStoryAdapter,
    queryKb: queryKbAdapter,

    // Plan Refinement V2
    planLoader: planLoaderAdapter,

    // Pipeline Orchestrator — Story Picker
    storyListAdapter,

    // Telemetry (for use in graph-executor)
    logInvocation: logInvocationAdapter,
    logOutcome: logOutcomeAdapter,
    logDecision: logDecisionAdapter,
  }
}

// ============================================================================
// Pipeline Supervisor Adapters
// ============================================================================

/**
 * Gets a story's current state from KB.
 * Used by the pipeline supervisor phase router.
 */
export async function getStoryStateAdapter(storyId: string): Promise<string | null> {
  try {
    const db = getDb()
    const result = await kb_get_story(
      { db },
      { story_id: storyId, include_artifacts: false, include_dependencies: false },
    )

    if (!result.story) return null
    return (result.story.state as string) ?? null
  } catch (err) {
    logger.warn('kb-adapters: getStoryState failed', {
      storyId,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Builds a KbAdapter for the pipeline supervisor.
 * Provides updateStoryStatus, writeArtifact, and listStories operations.
 */
export function buildKbAdapter() {
  return {
    updateStoryStatus: async (storyId: string, targetStatus: string): Promise<void> => {
      try {
        const db = getDb()

        // The DB trigger enforces a strict state machine with artifact gates.
        // We need to walk through intermediate states and write required artifacts.
        const storyResult = await kb_get_story({ db }, { story_id: storyId })
        const currentState = (storyResult?.story?.state as string) ?? 'backlog'

        if (currentState === targetStatus) {
          logger.info('kb-adapters: story already in target state', {
            storyId,
            state: targetStatus,
          })
          return
        }

        // Define the transition path and artifact requirements
        const STATE_ORDER = [
          'backlog',
          'created',
          'elab',
          'ready',
          'in_progress',
          'needs_code_review',
          'ready_for_qa',
          'in_qa',
          'completed',
        ]
        const ARTIFACT_GATES: Record<string, { before: string; type: string }> = {
          ready: { before: 'elab', type: 'elaboration' },
          needs_code_review: { before: 'in_progress', type: 'proof' },
          ready_for_qa: { before: 'needs_code_review', type: 'review' },
          in_qa: { before: 'ready_for_qa', type: 'verification' },
          completed: { before: 'in_qa', type: 'qa_gate' },
        }

        // Handle special transitions (blocked goes directly)
        if (targetStatus === 'blocked') {
          await kb_update_story_status({ db }, { story_id: storyId, state: 'blocked' as never })
          logger.info('kb-adapters: story status updated', { storyId, status: 'blocked' })
          return
        }

        const currentIdx = STATE_ORDER.indexOf(currentState)
        const targetIdx = STATE_ORDER.indexOf(targetStatus)

        if (currentIdx === -1 || targetIdx === -1 || targetIdx <= currentIdx) {
          // Unknown state or backwards transition — try direct
          await kb_update_story_status({ db }, { story_id: storyId, state: targetStatus as never })
          logger.info('kb-adapters: story status updated (direct)', {
            storyId,
            status: targetStatus,
          })
          return
        }

        // Walk through each intermediate state
        for (let i = currentIdx + 1; i <= targetIdx; i++) {
          const nextState = STATE_ORDER[i]
          const gate = ARTIFACT_GATES[nextState]

          // Write required artifact if this transition has a gate
          if (gate) {
            try {
              await kb_write_artifact(
                {
                  story_id: storyId,
                  artifact_type: gate.type as never,
                  content: { status: 'pipeline-generated', generatedBy: 'supervisor' },
                },
                { db },
              )
            } catch (_artErr) {
              // Artifact may already exist — that's fine
            }
          }

          await kb_update_story_status({ db }, { story_id: storyId, state: nextState as never })
        }

        logger.info('kb-adapters: story status updated', {
          storyId,
          from: currentState,
          to: targetStatus,
          steps: targetIdx - currentIdx,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error('kb-adapters: updateStoryStatus failed', {
          storyId,
          status: targetStatus,
          error: msg,
        })
        // Don't throw — supervisor should continue even if KB update fails
        logger.warn('kb-adapters: continuing despite KB update failure')
      }
    },

    writeArtifact: async (storyId: string, type: string, content: object): Promise<void> => {
      try {
        const db = getDb()
        await kb_write_artifact(
          {
            story_id: storyId,
            artifact_type: type as never,
            content: content as Record<string, unknown>,
          },
          { db },
        )
        logger.info('kb-adapters: artifact written', { storyId, type })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error('kb-adapters: writeArtifact failed', { storyId, type, error: msg })
        throw err
      }
    },

    listStories: async (filter: { blockedBy?: string }) => {
      try {
        const db = getDb()
        // Query stories that are blocked by a specific story
        if (filter.blockedBy) {
          const result = await kb_list_stories({ db }, { limit: 100, offset: 0 })

          return result.stories
            .filter(s => (s.blockedByStory as string | null) === filter.blockedBy)
            .map(s => ({
              id: s.storyId ?? '',
              blockedBy: (s.blockedByStory as string | null) ?? null,
              status: (s.state as string) ?? 'unknown',
            }))
        }

        return []
      } catch (err) {
        logger.warn('kb-adapters: listStories failed', {
          filter,
          error: err instanceof Error ? err.message : String(err),
        })
        return []
      }
    },
  }
}

// ============================================================================
// Export Types
// ============================================================================

export type KbAdapters = ReturnType<typeof createKbAdapters>
