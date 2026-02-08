/**
 * Token Usage Operations
 *
 * MCP operations for logging and querying token usage across story workflow phases.
 * Provides kb_log_tokens tool.
 *
 * @see Implementation plan for token logging and analytics
 */

import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { storyTokenUsage } from '../db/schema.js'
import { TokenPhaseSchema } from '../__types__/index.js'

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Input schema for kb_log_tokens tool.
 */
export const KbLogTokensInputSchema = z.object({
  /** Story ID (e.g., 'WISH-2045') */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Workflow phase */
  phase: TokenPhaseSchema,

  /** Input token count */
  input_tokens: z.number().int().min(0),

  /** Output token count */
  output_tokens: z.number().int().min(0),

  /** Agent name (optional) */
  agent: z.string().optional(),

  /** Fix cycle iteration (optional, default 0) */
  iteration: z.number().int().min(0).optional().default(0),

  /** Custom timestamp (optional, defaults to now) */
  logged_at: z.coerce.date().optional(),
})

export type KbLogTokensInput = z.infer<typeof KbLogTokensInputSchema>

// ============================================================================
// Dependencies
// ============================================================================

export interface TokenOperationsDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract feature prefix from story ID.
 *
 * @param storyId - Story ID (e.g., 'WISH-2045')
 * @returns Feature prefix (e.g., 'wish') or null
 */
function extractFeature(storyId: string): string | null {
  const match = storyId.match(/^([A-Za-z]+)-?\d*/)
  return match ? match[1].toLowerCase() : null
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Log token usage for a story phase.
 *
 * @param deps - Database dependencies
 * @param input - Token usage data
 * @returns Logged entry ID and cumulative total
 */
export async function kb_log_tokens(
  deps: TokenOperationsDeps,
  input: KbLogTokensInput,
): Promise<{
  logged: boolean
  id: string
  cumulative: number
  message: string
}> {
  const validated = KbLogTokensInputSchema.parse(input)

  // Calculate total tokens
  const totalTokens = validated.input_tokens + validated.output_tokens

  // Extract feature from story ID
  const feature = extractFeature(validated.story_id)

  // Insert token usage record
  const result = await deps.db
    .insert(storyTokenUsage)
    .values({
      storyId: validated.story_id,
      feature,
      phase: validated.phase,
      agent: validated.agent ?? null,
      iteration: validated.iteration,
      inputTokens: validated.input_tokens,
      outputTokens: validated.output_tokens,
      totalTokens,
      loggedAt: validated.logged_at ?? new Date(),
    })
    .returning()

  const entry = result[0]

  // Calculate cumulative total for this story
  const cumulativeResult = await deps.db
    .select({ total: sql<number>`sum(total_tokens)::int` })
    .from(storyTokenUsage)
    .where(eq(storyTokenUsage.storyId, validated.story_id))

  const cumulative = cumulativeResult[0]?.total ?? totalTokens

  return {
    logged: true,
    id: entry.id,
    cumulative,
    message: `Logged ${totalTokens} tokens for ${validated.story_id} (${validated.phase})`,
  }
}

/**
 * Get token usage summary for a story.
 *
 * @param deps - Database dependencies
 * @param storyId - Story ID to query
 * @returns Token usage breakdown by phase
 */
export async function kb_get_story_tokens(
  deps: TokenOperationsDeps,
  storyId: string,
): Promise<{
  story_id: string
  total_tokens: number
  by_phase: { phase: string; input_tokens: number; output_tokens: number; total_tokens: number }[]
  message: string
}> {
  const result = await deps.db
    .select({
      phase: storyTokenUsage.phase,
      inputTokens: sql<number>`sum(${storyTokenUsage.inputTokens})::int`,
      outputTokens: sql<number>`sum(${storyTokenUsage.outputTokens})::int`,
      totalTokens: sql<number>`sum(${storyTokenUsage.totalTokens})::int`,
    })
    .from(storyTokenUsage)
    .where(eq(storyTokenUsage.storyId, storyId))
    .groupBy(storyTokenUsage.phase)

  const totalTokens = result.reduce((sum, r) => sum + (r.totalTokens ?? 0), 0)

  return {
    story_id: storyId,
    total_tokens: totalTokens,
    by_phase: result.map(r => ({
      phase: r.phase,
      input_tokens: r.inputTokens ?? 0,
      output_tokens: r.outputTokens ?? 0,
      total_tokens: r.totalTokens ?? 0,
    })),
    message: `Token usage for ${storyId}: ${totalTokens} total`,
  }
}
