/**
 * minimax.ts
 *
 * Type definitions and Zod schemas for MiniMax provider configuration.
 * MiniMax is a Chinese AI startup providing natural language processing models.
 *
 * @module providers/__types__/minimax
 */

import { z } from 'zod'

/**
 * MiniMax provider configuration schema.
 *
 * Uses Zod for runtime validation and type inference (per CLAUDE.md requirements).
 *
 * Required fields:
 * - apiKey: MiniMax API key (from MINIMAX_API_KEY env var)
 * - groupId: MiniMax group ID (from MINIMAX_GROUP_ID env var)
 *
 * Optional fields:
 * - modelName: Model identifier (e.g., 'abab5.5-chat', 'abab5.5s-chat', 'abab6-chat')
 * - temperature: Sampling temperature (0-2, default: 0)
 * - timeoutMs: Request timeout (default: 60000ms)
 * - availabilityCacheTtlMs: Availability cache TTL (default: 30000ms)
 */
export const MinimaxConfigSchema = z.object({
  /** MiniMax API key */
  apiKey: z.string().min(1, 'MINIMAX_API_KEY environment variable is required'),

  /** MiniMax group ID */
  groupId: z.string().min(1, 'MINIMAX_GROUP_ID environment variable is required'),

  /** Model name (without minimax/ prefix) */
  modelName: z.string().optional(),

  /** Temperature for generation (0 = deterministic, 2 = maximum randomness) */
  temperature: z.number().min(0).max(2).default(0),

  /** Request timeout in milliseconds */
  timeoutMs: z.number().int().positive().default(60000),

  /** Cache TTL for availability checks (ms) */
  availabilityCacheTtlMs: z.number().int().positive().default(30000),
})

export type MinimaxConfig = z.infer<typeof MinimaxConfigSchema>
