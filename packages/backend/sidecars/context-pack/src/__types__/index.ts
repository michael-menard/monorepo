/**
 * Zod Schemas for Context Pack Sidecar
 * WINT-2020: Create Context Pack Sidecar
 *
 * Uses Zod-first approach per CLAUDE.md — no TypeScript interfaces.
 */

import { z } from 'zod'

// ============================================================================
// Constants
// ============================================================================

/**
 * Default TTL for context packs in seconds (1 hour)
 */
export const DEFAULT_TTL = 3600

/**
 * Default max tokens for token budget enforcement
 */
export const DEFAULT_MAX_TOKENS = 2000

/**
 * Format string for cache key generation: '{story_id}:{node_type}:{role}'
 */
export const CACHE_KEY_FORMAT = '{story_id}:{node_type}:{role}'

// ============================================================================
// Utility
// ============================================================================

/**
 * Estimate token count from a string using char-count approximation.
 * estimateTokens(text) = Math.ceil(text.length / 4)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// ============================================================================
// Request / Response Schemas
// ============================================================================

/**
 * Valid role values for context pack requests
 */
export const ContextPackRoleSchema = z.enum(['pm', 'dev', 'qa', 'po'], {
  errorMap: () => ({ message: 'role must be one of: pm, dev, qa, po' }),
})

export type ContextPackRole = z.infer<typeof ContextPackRoleSchema>

/**
 * Input schema for POST /context-pack requests and assembleContextPack()
 */
export const ContextPackRequestSchema = z.object({
  story_id: z.string().min(1, 'story_id must not be empty'),
  node_type: z.string().min(1, 'node_type must not be empty'),
  role: ContextPackRoleSchema,
  ttl: z.number().int().positive().optional().default(DEFAULT_TTL),
})

export type ContextPackRequest = z.infer<typeof ContextPackRequestSchema>

/**
 * Single KB fact entry schema
 */
export const KbFactEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  relevance_score: z.number().optional(),
  tags: z.array(z.string()).optional(),
})

export type KbFactEntry = z.infer<typeof KbFactEntrySchema>

/**
 * Output schema for assembleContextPack() and POST /context-pack response body
 */
export const ContextPackResponseSchema = z.object({
  story_brief: z.string(),
  kb_facts: z.array(KbFactEntrySchema),
  kb_rules: z.array(KbFactEntrySchema),
  kb_links: z.array(KbFactEntrySchema),
  repo_snippets: z.array(KbFactEntrySchema),
})

export type ContextPackResponse = z.infer<typeof ContextPackResponseSchema>

/**
 * HTTP response schema for POST /context-pack
 */
export const ContextPackHttpResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    data: ContextPackResponseSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
    details: z.unknown().optional(),
  }),
])

export type ContextPackHttpResponse = z.infer<typeof ContextPackHttpResponseSchema>
