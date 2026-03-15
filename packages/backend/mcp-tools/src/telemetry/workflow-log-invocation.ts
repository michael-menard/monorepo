/**
 * Workflow Log Invocation MCP Tool
 * WINT-3020: Invocation Logging Skill (telemetry-log) with workflow_log_invocation MCP Tool
 *
 * Features:
 * - Auto-generates UUID invocationId if not provided
 * - Zod validation at entry point (fail fast on invalid input)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with agentInvocations schema from @repo/knowledge-base/src/db
 * - Append-only write model — no updates or deletes
 */

import { randomUUID } from 'crypto'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { agentInvocations } from '@repo/knowledge-base/db'
import { WorkflowLogInvocationInputSchema } from './__types__/index.js'
import type { WorkflowLogInvocationInput } from './__types__/index.js'

/**
 * Log an agent invocation in wint.agent_invocations
 *
 * Inserts exactly one row per call. The invocationId column has a unique constraint;
 * callers are encouraged to provide a stable, predictable ID for idempotency
 * (e.g., `{agentName}-{storyId}-{isoTimestamp}`). If not provided, a UUID is
 * auto-generated via randomUUID().
 *
 * totalTokens defaults to 0 per DB default (ARCH-002: MVP defers computation).
 * estimatedCost defaults to '0.0000' per DB default.
 *
 * @param input - Invocation log parameters (unknown — Zod-parsed at entry)
 * @returns Inserted row object or null if DB error occurs
 *
 * @example
 * ```typescript
 * const row = await logInvocation({
 *   agentName: 'dev-execute-leader',
 *   storyId: 'WINT-3020',
 *   phase: 'execute',
 *   status: 'success',
 *   inputTokens: 1200,
 *   outputTokens: 400,
 *   durationMs: 4200,
 *   modelName: 'claude-sonnet-4-6',
 * })
 * ```
 */
export async function logInvocation(input: WorkflowLogInvocationInput | unknown) {
  // Validate input — fail fast on invalid input before any DB call (Zod-first pattern)
  const parsed = WorkflowLogInvocationInputSchema.parse(input)

  // Auto-generate invocationId if not provided (ARCH-003: use import { randomUUID } from 'crypto')
  const invocationId = parsed.invocationId ?? randomUUID()

  try {
    const [row] = await db
      .insert(agentInvocations)
      .values({
        invocationId,
        agentName: parsed.agentName,
        storyId: parsed.storyId ?? null,
        phase: parsed.phase ?? null,
        status: parsed.status,
        inputTokens: parsed.inputTokens ?? null,
        outputTokens: parsed.outputTokens ?? null,
        cachedTokens: parsed.cachedTokens,
        durationMs: parsed.durationMs ?? null,
        modelName: parsed.modelName ?? null,
        errorMessage: parsed.errorMessage ?? null,
      })
      .returning()

    return row
  } catch (error) {
    // Resilient error handling: log warning, never throw DB errors to caller
    // This ensures workflow_log_invocation never blocks the primary workflow (AC-7)
    logger.warn(
      `[mcp-tools] workflow_log_invocation: DB insert failed for agent '${parsed.agentName}' invocation '${invocationId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
