/**
 * Story Update Status MCP Tool
 * WINT-0090 AC-2, AC-3: Updates story state with state history tracking
 * APRS-1010: Artifact gate enforcement before state transitions
 *
 * Features:
 * - Zod validation at entry (fail fast)
 * - Artifact gate check inside transaction (atomic with state update)
 * - Structured gate_blocked result instead of exception (ARCH-003)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with stories, storyStateHistory, storyArtifacts schemas
 */

import { eq, and } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { stories, storyStateHistory, storyArtifacts } from '@repo/knowledge-base/db'
import {
  StoryUpdateStatusInputSchema,
  type StoryUpdateStatusInput,
  type StoryUpdateStatusOutput,
} from './__types__/index.js'

// ============================================================================
// MCP Artifact Gate Map (APRS-1010)
// ============================================================================

/**
 * Maps target states to the artifact_type that must exist in storyArtifacts
 * before the transition is allowed.
 *
 * Mirrors orchestrator ARTIFACT_GATES but uses KB artifact_type names (ARCH-002).
 * Ghost states and recovery states are exempt (not in map).
 */
export const MCP_ARTIFACT_GATES: Partial<Record<string, { artifactType: string; label: string }>> =
  {
    needs_code_review: { artifactType: 'evidence', label: 'Dev proof (evidence)' },
    ready_for_qa: { artifactType: 'review', label: 'Code review' },
    in_qa: { artifactType: 'review', label: 'Code review' },
    completed: { artifactType: 'qa_verify', label: 'QA verification' },
  }

/**
 * Update story state with history tracking and artifact gate enforcement
 *
 * @param input - Story ID, new state, and optional metadata
 * @returns Updated story record, gate_blocked result, or null if update failed
 *
 * @example Update story to in_progress (ungated)
 * ```typescript
 * const updated = await storyUpdateStatus({
 *   storyId: 'WINT-0090',
 *   newState: 'in_progress',
 *   reason: 'Starting implementation phase',
 *   triggeredBy: 'dev-execute-leader',
 * })
 * ```
 *
 * @example Gated transition blocked (evidence missing)
 * ```typescript
 * const result = await storyUpdateStatus({
 *   storyId: 'WINT-0090',
 *   newState: 'needs_code_review',
 * })
 * // result = { storyId: 'WINT-0090', state: 'in_progress', updatedAt: ..., gate_blocked: true, missing_artifact: 'Dev proof (evidence)' }
 * ```
 */
export async function storyUpdateStatus(
  input: StoryUpdateStatusInput,
): Promise<StoryUpdateStatusOutput> {
  // Validate input - fail fast if invalid (AC-6)
  const parsed = StoryUpdateStatusInputSchema.parse(input)

  try {
    const result = await db.transaction(async tx => {
      // 1. Get current story
      const [currentStory] = await tx
        .select()
        .from(stories)
        .where(eq(stories.storyId, parsed.storyId))
        .limit(1)

      if (!currentStory) {
        logger.warn(`[mcp-tools] Story '${parsed.storyId}' not found for status update`)
        return null
      }

      const fromState = currentStory.state
      const toState = parsed.newState

      // Skip update if state hasn't changed
      if (fromState === toState) {
        return {
          storyId: currentStory.storyId,
          state: currentStory.state,
          updatedAt: currentStory.updatedAt,
        }
      }

      // 2. Artifact gate check — inside transaction for atomicity (APRS-1010)
      const gate = MCP_ARTIFACT_GATES[toState]
      if (gate) {
        const [artifact] = await tx
          .select({ id: storyArtifacts.id })
          .from(storyArtifacts)
          .where(
            and(
              eq(storyArtifacts.storyId, parsed.storyId),
              eq(storyArtifacts.artifactType, gate.artifactType),
            ),
          )
          .limit(1)

        if (!artifact) {
          logger.warn(
            `[mcp-tools] Gate blocked: story '${parsed.storyId}' cannot advance to '${toState}' — missing artifact '${gate.label}'`,
          )
          return {
            storyId: currentStory.storyId,
            state: currentStory.state,
            updatedAt: currentStory.updatedAt,
            gate_blocked: true as const,
            missing_artifact: gate.label,
          }
        }
      }

      // 3. Update stories table
      const [updatedStory] = await tx
        .update(stories)
        .set({
          state: toState,
          updatedAt: new Date(),
        })
        .where(eq(stories.storyId, currentStory.storyId))
        .returning()

      // 4. Record state transition in storyStateHistory
      await tx.insert(storyStateHistory).values({
        storyId: currentStory.storyId,
        eventType: 'state_transition',
        fromState,
        toState,
        metadata: {
          reason: parsed.reason ?? null,
          triggeredBy: parsed.triggeredBy,
          ...(parsed.metadata ?? {}),
        },
      })

      return {
        storyId: updatedStory.storyId,
        state: updatedStory.state,
        updatedAt: updatedStory.updatedAt,
      }
    })

    return result
  } catch (error) {
    // Resilient error handling: log warning, return null
    logger.warn(
      `[mcp-tools] Failed to update status for story '${parsed.storyId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
