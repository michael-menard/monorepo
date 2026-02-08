/**
 * Access Control and Result Caching Stubs
 *
 * This module provides stub implementations for tool access control and result caching.
 * These are placeholder implementations that will be completed in follow-up stories.
 *
 * @see KNOW-0053 AC5, AC6 for stub requirements
 *
 * TODO(KNOW-009): Implement full access control logic
 * TODO(KNOW-021): Implement result caching with Redis/in-memory cache
 */

import { z } from 'zod'
import { createMcpLogger } from './logger.js'

const logger = createMcpLogger('access-control')

/**
 * Agent roles supported by the knowledge base.
 */
export const AgentRoleSchema = z.enum(['pm', 'dev', 'qa', 'all'])
export type AgentRole = z.infer<typeof AgentRoleSchema>

/**
 * Tool names supported by the knowledge base.
 */
export const ToolNameSchema = z.enum([
  'kb_add',
  'kb_get',
  'kb_update',
  'kb_delete',
  'kb_list',
  'kb_search',
  'kb_get_related',
  'kb_bulk_import',
  'kb_rebuild_embeddings',
  'kb_stats',
  'kb_health',
  // Artifact tools (DB-first artifact storage)
  'kb_write_artifact',
  'kb_read_artifact',
  'kb_list_artifacts',
  // Story status tools
  'kb_get_story',
  'kb_list_stories',
  'kb_update_story_status',
  'kb_get_next_story',
  // Token logging tools
  'kb_log_tokens',
  // Analytics tools
  'kb_get_token_summary',
  'kb_get_bottleneck_analysis',
  'kb_get_churn_analysis',
])
export type ToolName = z.infer<typeof ToolNameSchema>

/**
 * Access check result.
 */
export const AccessCheckResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
})
export type AccessCheckResult = z.infer<typeof AccessCheckResultSchema>

/**
 * Access control matrix for MCP tools.
 *
 * | Tool                  | pm | dev | qa | all |
 * |-----------------------|----|-----|----|----|
 * | kb_add                | Y  | Y   | Y  | Y  |
 * | kb_get                | Y  | Y   | Y  | Y  |
 * | kb_update             | Y  | Y   | Y  | Y  |
 * | kb_delete             | Y  | N   | N  | N  |
 * | kb_list               | Y  | Y   | Y  | Y  |
 * | kb_search             | Y  | Y   | Y  | Y  |
 * | kb_get_related        | Y  | Y   | Y  | Y  |
 * | kb_bulk_import        | Y  | N   | N  | N  |
 * | kb_rebuild_embeddings | Y  | N   | N  | N  |
 * | kb_stats              | Y  | Y   | Y  | Y  |
 * | kb_health             | Y  | Y   | Y  | Y  |
 *
 * Legend: Y = allowed, N = denied
 *
 * @see KNOW-009 for implementation details
 */
const ACCESS_MATRIX: Record<ToolName, Set<AgentRole>> = {
  kb_add: new Set(['pm', 'dev', 'qa', 'all']),
  kb_get: new Set(['pm', 'dev', 'qa', 'all']),
  kb_update: new Set(['pm', 'dev', 'qa', 'all']),
  kb_delete: new Set(['pm']), // Admin only - destructive operation
  kb_list: new Set(['pm', 'dev', 'qa', 'all']),
  kb_search: new Set(['pm', 'dev', 'qa', 'all']),
  kb_get_related: new Set(['pm', 'dev', 'qa', 'all']),
  kb_bulk_import: new Set(['pm']), // Admin only - bulk data modification
  kb_rebuild_embeddings: new Set(['pm']), // Admin only - expensive operation
  kb_stats: new Set(['pm', 'dev', 'qa', 'all']),
  kb_health: new Set(['pm', 'dev', 'qa', 'all']),
  // Artifact tools (DB-first artifact storage)
  kb_write_artifact: new Set(['pm', 'dev', 'qa', 'all']),
  kb_read_artifact: new Set(['pm', 'dev', 'qa', 'all']),
  kb_list_artifacts: new Set(['pm', 'dev', 'qa', 'all']),
  // Story status tools - available to all roles
  kb_get_story: new Set(['pm', 'dev', 'qa', 'all']),
  kb_list_stories: new Set(['pm', 'dev', 'qa', 'all']),
  kb_update_story_status: new Set(['pm', 'dev', 'qa', 'all']),
  kb_get_next_story: new Set(['pm', 'dev', 'qa', 'all']),
  // Token logging tools - available to all roles
  kb_log_tokens: new Set(['pm', 'dev', 'qa', 'all']),
  // Analytics tools - available to pm and dev roles
  kb_get_token_summary: new Set(['pm', 'dev']),
  kb_get_bottleneck_analysis: new Set(['pm', 'dev']),
  kb_get_churn_analysis: new Set(['pm', 'dev']),
}

/**
 * Admin-only tools that require PM role.
 */
export const ADMIN_TOOLS: readonly ToolName[] = [
  'kb_delete',
  'kb_bulk_import',
  'kb_rebuild_embeddings',
] as const

/**
 * Normalize agent role to lowercase for case-insensitive comparison.
 *
 * @param role - Role string (may be any case)
 * @returns Normalized lowercase role or null if invalid
 */
export function normalizeRole(role: string): AgentRole | null {
  const normalized = role.toLowerCase() as AgentRole
  const result = AgentRoleSchema.safeParse(normalized)
  return result.success ? result.data : null
}

/**
 * Check if an agent role has access to a specific tool.
 *
 * Uses the ACCESS_MATRIX to determine if a role can access a tool.
 * PM role has access to all tools. Dev/QA/All roles are denied admin tools.
 *
 * @param toolName - Name of the tool being accessed
 * @param agentRole - Role of the agent making the request
 * @returns Access check result with allowed flag and optional reason
 *
 * @see KNOW-009 for access control implementation
 *
 * @example
 * ```typescript
 * const result = checkAccess('kb_delete', 'dev')
 * // Returns: { allowed: false, reason: 'kb_delete requires pm role' }
 *
 * const result = checkAccess('kb_search', 'dev')
 * // Returns: { allowed: true }
 * ```
 */
export function checkAccess(toolName: string, agentRole: AgentRole): AccessCheckResult {
  // Validate tool name exists in matrix
  const toolNameResult = ToolNameSchema.safeParse(toolName)
  if (!toolNameResult.success) {
    // Unknown tool - log warning and deny access
    logger.warn('Access check for unknown tool', {
      tool_name: toolName,
      agent_role: agentRole,
      decision: 'denied',
    })
    return {
      allowed: false,
      reason: `Unknown tool: ${toolName}`,
    }
  }

  const validToolName = toolNameResult.data
  const allowedRoles = ACCESS_MATRIX[validToolName]
  const isAllowed = allowedRoles.has(agentRole)

  // Log access check at debug level for tracing
  logger.debug('Access check', {
    tool_name: toolName,
    agent_role: agentRole,
    decision: isAllowed ? 'allowed' : 'denied',
  })

  if (isAllowed) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `${toolName} requires pm role`,
  }
}

/**
 * Cache key for result caching.
 */
export type CacheKey = string

/**
 * Cached value with metadata.
 */
export const CachedValueSchema = z.object({
  value: z.unknown(),
  cached_at: z.string().datetime(),
  ttl_ms: z.number(),
})
export type CachedValue = z.infer<typeof CachedValueSchema>

/**
 * Planned caching strategy for KNOW-021.
 *
 * | Tool           | TTL     | Key Strategy                    |
 * |----------------|---------|--------------------------------|
 * | kb_stats       | 60s     | 'kb_stats'                     |
 * | kb_search      | 5s      | `kb_search:${queryHash}`       |
 * | kb_get_related | 60s     | `kb_get_related:${entryId}`    |
 * | kb_health      | 5s      | 'kb_health'                    |
 *
 * Implementation notes:
 * - Use in-memory cache for single-instance deployments
 * - Use Redis for multi-instance deployments
 * - Cache invalidation on kb_add, kb_update, kb_delete
 */

/**
 * Get a cached value by key.
 *
 * STUB IMPLEMENTATION: Always returns null (cache miss).
 * Full implementation deferred to KNOW-021.
 *
 * @param key - Cache key
 * @returns Cached value or null if not found (always null in stub)
 *
 * TODO(KNOW-021): Implement actual caching with Redis or in-memory cache
 *
 * @example
 * ```typescript
 * const cached = cacheGet('kb_stats')
 * // In stub: null
 * // In KNOW-021: { total_entries: 150, ... } or null
 * ```
 */
export function cacheGet(key: CacheKey): CachedValue | null {
  // Log cache lookup at debug level
  logger.debug('Cache get (STUB)', {
    key,
    result: 'miss',
    stub: true,
  })

  // STUB: Always return cache miss
  // TODO(KNOW-021): Implement actual cache lookup
  return null
}

/**
 * Set a cached value with TTL.
 *
 * STUB IMPLEMENTATION: Does nothing.
 * Full implementation deferred to KNOW-021.
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlMs - Time to live in milliseconds
 *
 * TODO(KNOW-021): Implement actual cache storage
 *
 * @example
 * ```typescript
 * cacheSet('kb_stats', statsResult, 60000)
 * // In stub: no-op
 * // In KNOW-021: stores value with 60s TTL
 * ```
 */
export function cacheSet(key: CacheKey, _value: unknown, ttlMs: number): void {
  // Log cache set at debug level
  logger.debug('Cache set (STUB)', {
    key,
    ttl_ms: ttlMs,
    stub: true,
  })

  // STUB: Do nothing
  // TODO(KNOW-021): Implement actual cache storage
}

/**
 * Invalidate cached values matching a pattern.
 *
 * STUB IMPLEMENTATION: Does nothing.
 * Full implementation deferred to KNOW-021.
 *
 * @param pattern - Cache key pattern (supports wildcards)
 *
 * TODO(KNOW-021): Implement cache invalidation on mutations
 *
 * @example
 * ```typescript
 * // Invalidate all search results after kb_add
 * cacheInvalidate('kb_search:*')
 * ```
 */
export function cacheInvalidate(pattern: string): void {
  // Log cache invalidation at debug level
  logger.debug('Cache invalidate (STUB)', {
    pattern,
    stub: true,
  })

  // STUB: Do nothing
  // TODO(KNOW-021): Implement actual cache invalidation
}

/**
 * Generate a cache key hash for search queries.
 *
 * @param query - Search query string
 * @param filters - Optional filter parameters
 * @returns Deterministic cache key hash
 */
export function generateSearchCacheKey(
  query: string,
  filters?: { role?: string; tags?: string[]; limit?: number },
): CacheKey {
  const normalized = JSON.stringify({ query, ...filters })
  // Simple hash for cache key (not cryptographic)
  let hash = 0
  for (const char of normalized) {
    const charCode = char.charCodeAt(0)
    hash = (hash << 5) - hash + charCode
    hash = hash & hash // Convert to 32-bit integer
  }
  return `kb_search:${hash.toString(16)}`
}
