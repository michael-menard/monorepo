/**
 * Telemetry MCP Operations (WINT-0120)
 *
 * Implements 4 MCP tools for recording and querying workflow telemetry:
 * - workflow_log_invocation: inserts to wint.agent_invocations
 * - workflow_log_decision: inserts to wint.hitl_decisions
 * - workflow_log_outcome: upserts to wint.story_outcomes
 * - workflow_get_story_telemetry: reads all 3 tables by storyId
 *
 * @see WINT-0040 (Telemetry & Observability) for table definitions
 * @see WINT-3070 for telemetry-log skill (pre-wire comment in schema)
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import {
  agentInvocations,
  hitlDecisions,
  storyOutcomes,
} from '@repo/database-schema/schema/wint'

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Input schema for workflow_log_invocation tool.
 * Inserts one row to wint.agent_invocations.
 */
export const WorkflowLogInvocationInputSchema = z.object({
  /** Unique invocation identifier (caller-generated, e.g. UUID or {agentName}-{timestamp}) */
  invocation_id: z.string().min(1, 'invocation_id cannot be empty'),

  /** Agent name (e.g., "dev-execute-leader") */
  agent_name: z.string().min(1, 'agent_name cannot be empty'),

  /** Story ID this invocation is associated with (e.g., "WINT-0120") */
  story_id: z.string().optional(),

  /** Workflow phase (e.g., "plan", "execute") */
  phase: z.string().optional(),

  /** Arbitrary JSON payload passed as input to the agent */
  input_payload: z.record(z.unknown()).optional(),

  /** Arbitrary JSON payload returned as output from the agent */
  output_payload: z.record(z.unknown()).optional(),

  /** Wall-clock duration of the invocation in milliseconds */
  duration_ms: z.number().int().min(0).optional(),

  /** Input token count */
  input_tokens: z.number().int().min(0).optional(),

  /** Output token count */
  output_tokens: z.number().int().min(0).optional(),

  /** Cached token count */
  cached_tokens: z.number().int().min(0).optional().default(0),

  /** Total token count (input + output + cached) */
  total_tokens: z.number().int().min(0).optional().default(0),

  /** Estimated cost in USD */
  estimated_cost: z.string().optional().default('0.0000'),

  /** LLM model name (e.g., "claude-sonnet-4-6") */
  model_name: z.string().optional(),

  /** Invocation status: "success" | "failure" | "partial" */
  status: z.enum(['success', 'failure', 'partial']),

  /** Error message if status is "failure" */
  error_message: z.string().optional(),

  /** When the invocation started */
  started_at: z.coerce.date().optional(),

  /** When the invocation completed */
  completed_at: z.coerce.date().optional(),
})

export type WorkflowLogInvocationInput = z.infer<typeof WorkflowLogInvocationInputSchema>

/**
 * Input schema for workflow_log_decision tool.
 * Inserts one row to wint.hitl_decisions.
 */
export const WorkflowLogDecisionInputSchema = z.object({
  /** FK to agent_invocations.id — nullable if outside invocation context */
  invocation_id: z.string().uuid().optional(),

  /** Decision type (e.g., "approve", "reject", "defer", "override") */
  decision_type: z.string().min(1, 'decision_type cannot be empty'),

  /** Human-readable description of the decision */
  decision_text: z.string().min(1, 'decision_text cannot be empty'),

  /** Structured context snapshot at decision time */
  context: z.record(z.unknown()).optional(),

  /**
   * 1536-dimensional embedding of decision_text for semantic similarity search.
   * Pass as a JavaScript number array — stored as pgvector VECTOR column.
   * If omitted, no embedding is stored.
   */
  embedding: z.array(z.number()).optional(),

  /** Operator/user who made the decision */
  operator_id: z.string().min(1, 'operator_id cannot be empty'),

  /** Story this decision is associated with */
  story_id: z.string().min(1, 'story_id cannot be empty'),
})

export type WorkflowLogDecisionInput = z.infer<typeof WorkflowLogDecisionInputSchema>

/**
 * Input schema for workflow_log_outcome tool.
 * Upserts (insert or update) one row in wint.story_outcomes.
 * Uniqueness is enforced on storyId.
 */
export const WorkflowLogOutcomeInputSchema = z.object({
  /** Unique story identifier (e.g., "WINT-0040") */
  story_id: z.string().min(1, 'story_id cannot be empty'),

  /** Final outcome: "pass" | "fail" | "blocked" | "cancelled" */
  final_verdict: z.enum(['pass', 'fail', 'blocked', 'cancelled']),

  /** Overall quality score 0-100 */
  quality_score: z.number().int().min(0).max(100).optional().default(0),

  /** Cumulative input tokens across all agent invocations */
  total_input_tokens: z.number().int().min(0).optional().default(0),

  /** Cumulative output tokens across all agent invocations */
  total_output_tokens: z.number().int().min(0).optional().default(0),

  /** Cumulative cached tokens across all agent invocations */
  total_cached_tokens: z.number().int().min(0).optional().default(0),

  /** Estimated total cost in USD (4 decimal precision) */
  estimated_total_cost: z.string().optional().default('0.0000'),

  /** Number of review iterations before acceptance */
  review_iterations: z.number().int().min(0).optional().default(0),

  /** Number of QA iterations before acceptance */
  qa_iterations: z.number().int().min(0).optional().default(0),

  /** Total wall-clock duration in milliseconds */
  duration_ms: z.number().int().min(0).optional().default(0),

  /** Primary reason for failure or blocking */
  primary_blocker: z.string().optional(),

  /** Arbitrary metadata */
  metadata: z.record(z.unknown()).optional(),

  /** When the story completed */
  completed_at: z.coerce.date().optional(),
})

export type WorkflowLogOutcomeInput = z.infer<typeof WorkflowLogOutcomeInputSchema>

/**
 * Input schema for workflow_get_story_telemetry tool.
 * Queries all 3 telemetry tables for a story.
 */
export const WorkflowGetStoryTelemetryInputSchema = z.object({
  /** Story ID to query (e.g., "WINT-0120") */
  story_id: z.string().min(1, 'story_id cannot be empty'),
})

export type WorkflowGetStoryTelemetryInput = z.infer<typeof WorkflowGetStoryTelemetryInputSchema>

// ============================================================================
// Dependencies
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TelemetryOperationsDeps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: NodePgDatabase<any>
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Log an agent invocation to wint.agent_invocations.
 *
 * @param deps - Database dependencies
 * @param input - Invocation data
 * @returns Inserted row ID and success flag
 */
export async function workflow_log_invocation(
  deps: TelemetryOperationsDeps,
  input: WorkflowLogInvocationInput,
): Promise<{
  logged: boolean
  id: string
  invocation_id: string
  message: string
}> {
  const validated = WorkflowLogInvocationInputSchema.parse(input)

  const [inserted] = await deps.db
    .insert(agentInvocations)
    .values({
      invocationId: validated.invocation_id,
      agentName: validated.agent_name,
      storyId: validated.story_id ?? null,
      phase: validated.phase ?? null,
      inputPayload: validated.input_payload ?? null,
      outputPayload: validated.output_payload ?? null,
      durationMs: validated.duration_ms ?? null,
      inputTokens: validated.input_tokens ?? null,
      outputTokens: validated.output_tokens ?? null,
      cachedTokens: validated.cached_tokens ?? 0,
      totalTokens: validated.total_tokens ?? 0,
      estimatedCost: validated.estimated_cost ?? '0.0000',
      modelName: validated.model_name ?? null,
      status: validated.status,
      errorMessage: validated.error_message ?? null,
      startedAt: validated.started_at ?? new Date(),
      completedAt: validated.completed_at ?? null,
    })
    .returning()

  return {
    logged: true,
    id: inserted.id,
    invocation_id: inserted.invocationId,
    message: `Logged invocation ${validated.invocation_id} for agent ${validated.agent_name}`,
  }
}

/**
 * Log a HITL decision to wint.hitl_decisions.
 *
 * @param deps - Database dependencies
 * @param input - Decision data
 * @returns Inserted row ID and success flag
 */
export async function workflow_log_decision(
  deps: TelemetryOperationsDeps,
  input: WorkflowLogDecisionInput,
): Promise<{
  logged: boolean
  id: string
  message: string
}> {
  const validated = WorkflowLogDecisionInputSchema.parse(input)

  const [inserted] = await deps.db
    .insert(hitlDecisions)
    .values({
      invocationId: validated.invocation_id ?? null,
      decisionType: validated.decision_type,
      decisionText: validated.decision_text,
      context: validated.context ?? null,
      embedding: validated.embedding ?? null,
      operatorId: validated.operator_id,
      storyId: validated.story_id,
    })
    .returning()

  return {
    logged: true,
    id: inserted.id,
    message: `Logged ${validated.decision_type} decision for story ${validated.story_id}`,
  }
}

/**
 * Upsert a story outcome to wint.story_outcomes.
 * Uses onConflictDoUpdate targeting storyId uniqueness constraint.
 *
 * @param deps - Database dependencies
 * @param input - Outcome data
 * @returns Upserted row ID and success flag
 */
export async function workflow_log_outcome(
  deps: TelemetryOperationsDeps,
  input: WorkflowLogOutcomeInput,
): Promise<{
  logged: boolean
  id: string
  story_id: string
  final_verdict: string
  message: string
}> {
  const validated = WorkflowLogOutcomeInputSchema.parse(input)

  const values = {
    storyId: validated.story_id,
    finalVerdict: validated.final_verdict,
    qualityScore: validated.quality_score ?? 0,
    totalInputTokens: validated.total_input_tokens ?? 0,
    totalOutputTokens: validated.total_output_tokens ?? 0,
    totalCachedTokens: validated.total_cached_tokens ?? 0,
    estimatedTotalCost: validated.estimated_total_cost ?? '0.0000',
    reviewIterations: validated.review_iterations ?? 0,
    qaIterations: validated.qa_iterations ?? 0,
    durationMs: validated.duration_ms ?? 0,
    primaryBlocker: validated.primary_blocker ?? null,
    metadata: validated.metadata ?? null,
    completedAt: validated.completed_at ?? null,
  }

  const [upserted] = await deps.db
    .insert(storyOutcomes)
    .values(values)
    .onConflictDoUpdate({
      target: storyOutcomes.storyId,
      set: {
        finalVerdict: values.finalVerdict,
        qualityScore: values.qualityScore,
        totalInputTokens: values.totalInputTokens,
        totalOutputTokens: values.totalOutputTokens,
        totalCachedTokens: values.totalCachedTokens,
        estimatedTotalCost: values.estimatedTotalCost,
        reviewIterations: values.reviewIterations,
        qaIterations: values.qaIterations,
        durationMs: values.durationMs,
        primaryBlocker: values.primaryBlocker,
        metadata: values.metadata,
        completedAt: values.completedAt,
      },
    })
    .returning()

  return {
    logged: true,
    id: upserted.id,
    story_id: upserted.storyId,
    final_verdict: upserted.finalVerdict,
    message: `Upserted outcome for story ${validated.story_id}: ${validated.final_verdict}`,
  }
}

/**
 * Get all telemetry for a story (invocations, decisions, outcomes).
 * Queries all 3 tables in parallel for performance.
 *
 * @param deps - Database dependencies
 * @param input - Query parameters
 * @returns Telemetry data grouped by table
 */
export async function workflow_get_story_telemetry(
  deps: TelemetryOperationsDeps,
  input: WorkflowGetStoryTelemetryInput,
): Promise<{
  story_id: string
  invocations: unknown[]
  decisions: unknown[]
  outcome: unknown | null
  message: string
}> {
  const validated = WorkflowGetStoryTelemetryInputSchema.parse(input)

  const [invocationsRows, decisionsRows, outcomesRows] = await Promise.all([
    deps.db
      .select()
      .from(agentInvocations)
      .where(eq(agentInvocations.storyId, validated.story_id)),
    deps.db
      .select()
      .from(hitlDecisions)
      .where(eq(hitlDecisions.storyId, validated.story_id)),
    deps.db
      .select()
      .from(storyOutcomes)
      .where(eq(storyOutcomes.storyId, validated.story_id)),
  ])

  return {
    story_id: validated.story_id,
    invocations: invocationsRows,
    decisions: decisionsRows,
    outcome: outcomesRows[0] ?? null,
    message: `Found ${invocationsRows.length} invocations, ${decisionsRows.length} decisions, ${outcomesRows[0] ? '1 outcome' : 'no outcome'} for ${validated.story_id}`,
  }
}
