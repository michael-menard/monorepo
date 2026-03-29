/**
 * pipeline-providers.ts
 *
 * Canonical provider chain configuration for the autonomous pipeline.
 * Externalizes model provider constants from model-router.ts.
 *
 * Defines:
 * - PROVIDER_CHAIN: ordered provider entries (ollama → openrouter → anthropic)
 * - ESCALATION_CHAIN: derived provider name list
 * - DEFAULT_MODELS: provider → default model string map
 * - DEFAULT_RATE_LIMIT: provider → rate limit config map
 * - CONFIDENCE_THRESHOLDS: confidence band thresholds (re-exported for backward compat)
 *
 * @module config/pipeline-providers
 */

import { z } from 'zod'

// ============================================================================
// Provider Entry Schema
// ============================================================================

/**
 * Schema for a single provider entry in the chain.
 */
export const ProviderEntrySchema = z.object({
  /** Provider name (e.g. 'ollama', 'openrouter', 'anthropic') */
  name: z.string().min(1),
  /** Default model string for this provider */
  defaultModel: z.string().min(1),
  /** Rate limit configuration */
  rateLimits: z.object({
    capacity: z.number().int().positive(),
    refillRate: z.number().positive(),
    maxWaitMs: z.number().int().positive(),
  }),
  /**
   * Whether this provider supports exploration routing (e.g. local/free models).
   * Defaults to false.
   */
  isExplorationCapable: z.boolean().default(false),
})

export type ProviderEntry = z.infer<typeof ProviderEntrySchema>

// ============================================================================
// PROVIDER_CHAIN: ordered array (ollama → openrouter → anthropic)
// ============================================================================

/**
 * Ordered provider chain.
 * ollama (local/free, exploration-capable) → openrouter → anthropic (direct)
 */
export const PROVIDER_CHAIN: ProviderEntry[] = [
  {
    name: 'ollama',
    defaultModel: 'ollama/qwen2.5-coder:7b',
    rateLimits: { capacity: 10, refillRate: 2, maxWaitMs: 30000 },
    isExplorationCapable: true,
  },
  {
    name: 'openrouter',
    defaultModel: 'openrouter/anthropic/claude-3.5-haiku',
    rateLimits: { capacity: 5, refillRate: 1, maxWaitMs: 30000 },
    isExplorationCapable: false,
  },
  {
    name: 'anthropic',
    defaultModel: 'anthropic/claude-haiku-3.5',
    rateLimits: { capacity: 3, refillRate: 0.5, maxWaitMs: 30000 },
    isExplorationCapable: false,
  },
]

// ============================================================================
// Derived Constants
// ============================================================================

/**
 * Escalation chain: provider names in order.
 * Derived from PROVIDER_CHAIN to keep config DRY.
 */
export const ESCALATION_CHAIN: string[] = PROVIDER_CHAIN.map(p => p.name)

/**
 * Default model strings per provider name.
 * Derived from PROVIDER_CHAIN.
 */
export const DEFAULT_MODELS: Record<string, string> = Object.fromEntries(
  PROVIDER_CHAIN.map(p => [p.name, p.defaultModel]),
)

/**
 * Default rate limit config per provider name.
 * Derived from PROVIDER_CHAIN.
 */
export const DEFAULT_RATE_LIMIT: Record<
  string,
  { capacity: number; refillRate: number; maxWaitMs: number }
> = Object.fromEntries(PROVIDER_CHAIN.map(p => [p.name, p.rateLimits]))

// ============================================================================
// CONFIDENCE_THRESHOLDS
// ============================================================================

/**
 * Confidence level thresholds for deriving confidence from sample_size.
 * Used by affinity-seeder.ts, model-router.ts, and cold-start detection.
 */
export const CONFIDENCE_THRESHOLDS = {
  none: 0,
  low: 5,
  medium: 10,
  high: 20,
} as const
