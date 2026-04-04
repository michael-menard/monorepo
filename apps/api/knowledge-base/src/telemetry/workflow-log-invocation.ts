/**
 * Workflow Log Invocation MCP Tool
 * WINT-3020: Invocation Logging Skill (telemetry-log) with workflow_log_invocation MCP Tool
 *
 * Append-only write model — no updates or deletes.
 */

import { randomUUID } from 'crypto'
import { logger } from '@repo/logger'
import { getDbClient } from '../db/client.js'
import { agentInvocations } from '../db/index.js'
import { WorkflowLogInvocationInputSchema } from './__types__/index.js'
import type { WorkflowLogInvocationInput } from './__types__/index.js'

/**
 * Log an agent invocation in workflow.agent_invocations
 *
 * @param input - Invocation log parameters (unknown — Zod-parsed at entry)
 * @returns Inserted row object or null if DB error occurs
 */
export async function logInvocation(input: WorkflowLogInvocationInput | unknown) {
  const parsed = WorkflowLogInvocationInputSchema.parse(input)
  const invocationId = parsed.invocationId ?? randomUUID()

  try {
    const db = getDbClient()
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
    logger.warn(
      `[telemetry] workflow_log_invocation: DB insert failed for agent '${parsed.agentName}' invocation '${invocationId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
