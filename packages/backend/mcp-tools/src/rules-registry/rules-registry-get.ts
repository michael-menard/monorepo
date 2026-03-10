/**
 * rules_registry_get MCP Tool Wrapper
 * WINT-4020: Create Rules Registry Sidecar
 *
 * Imports getRules directly from @repo/sidecar-rules-registry (ARCH-001).
 * Direct import avoids requiring the sidecar HTTP server to be running.
 * No HTTP call to localhost:3093.
 *
 * AC-7: Direct-call pattern — imports getRules from @repo/sidecar-rules-registry.
 */

import { logger } from '@repo/logger'
import { getRules, type GetRulesQuery, type Rule } from '@repo/sidecar-rules-registry'

// ============================================================================
// MCP Tool Entry Point
// ============================================================================

/**
 * Retrieve rules matching the given filters via direct-call pattern.
 *
 * Direct import from @repo/sidecar-rules-registry (ARCH-001) — no HTTP call.
 *
 * @param input - Optional filters: type, scope, status
 * @returns Array of matching rules, or null on error
 *
 * @example
 * ```typescript
 * const rules = await rulesRegistryGet({ status: 'active' })
 * if (rules) {
 *   console.log(rules.length, 'active rules')
 * }
 * ```
 */
export async function rulesRegistryGet(input: GetRulesQuery = {}): Promise<Rule[] | null> {
  try {
    logger.info('[mcp-tools] rules_registry_get called', {
      type: input.type,
      scope: input.scope,
      status: input.status,
    })

    const result = await getRules(input)

    logger.info('[mcp-tools] rules_registry_get succeeded', { count: result.length })
    return result
  } catch (error) {
    logger.warn('[mcp-tools] rules_registry_get failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
