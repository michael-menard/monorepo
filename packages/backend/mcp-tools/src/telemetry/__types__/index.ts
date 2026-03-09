/**
 * Zod Input Schemas for Telemetry MCP Tools
 * WINT-3020: Invocation Logging Skill (telemetry-log) with workflow_log_invocation MCP Tool
 *
 * These schemas define and validate inputs for the workflow_log_invocation MCP tool.
 * Uses Zod-first approach per CLAUDE.md — no TypeScript interfaces.
 */

import { z } from 'zod'

/**
 * Workflow Log Invocation Input Schema
 * Inserts a new record in wint.agent_invocations
 *
 * Required fields: agentName, status
 * Optional fields: invocationId (auto-generated UUID if not provided), storyId, phase,
 *                  inputTokens, outputTokens, cachedTokens, durationMs, modelName, errorMessage
 */
export const WorkflowLogInvocationInputSchema = z.object({
  /** Name of the calling agent (e.g., 'dev-execute-leader') — required */
  agentName: z.string().min(1, 'agentName is required'),

  /**
   * Unique invocation ID (UUID format recommended).
   * Auto-generated via randomUUID() if not provided.
   * Recommend format: {agentName}-{storyId}-{isoTimestamp} for idempotency.
   */
  invocationId: z.string().optional(),

  /** Story ID this invocation is associated with */
  storyId: z.string().optional(),

  /**
   * Workflow phase this invocation belongs to.
   * Standard values per wint.ts phase column comment.
   */
  phase: z.enum(['setup', 'plan', 'execute', 'review', 'qa']).optional(),

  /** Invocation outcome — required */
  status: z.enum(['success', 'failure', 'partial']),

  /** Input token count (non-negative integer) */
  inputTokens: z.number().int().nonnegative().optional(),

  /** Output token count (non-negative integer) */
  outputTokens: z.number().int().nonnegative().optional(),

  /** Cached/prompt-hit token count (non-negative integer, defaults to 0) */
  cachedTokens: z.number().int().nonnegative().default(0),

  /** Wall-clock duration in milliseconds (non-negative integer) */
  durationMs: z.number().int().nonnegative().optional(),

  /** LLM model name (e.g., 'claude-sonnet-4-6') */
  modelName: z.string().optional(),

  /** Error message if status is 'failure' */
  errorMessage: z.string().optional(),
})

export type WorkflowLogInvocationInput = z.infer<typeof WorkflowLogInvocationInputSchema>
