/**
 * rules_registry_propose MCP Tool Wrapper
 * WINT-4020: Create Rules Registry Sidecar
 *
 * Imports proposeRule directly from @repo/sidecar-rules-registry (ARCH-001).
 * Direct import avoids requiring the sidecar HTTP server to be running.
 * No HTTP call to localhost:3093.
 *
 * AC-8: Direct-call pattern — imports proposeRule from @repo/sidecar-rules-registry.
 */

import { logger } from '@repo/logger'
import {
  proposeRule,
  type ProposeRuleInput,
  type ProposeRuleResult,
} from '@repo/sidecar-rules-registry'

// ============================================================================
// MCP Tool Entry Point
// ============================================================================

/**
 * Propose a new rule via direct-call pattern.
 *
 * Direct import from @repo/sidecar-rules-registry (ARCH-001) — no HTTP call.
 *
 * @param input - Rule proposal payload (rule_text, rule_type, scope, severity, source)
 * @returns ProposeRuleResult with created rule or conflict info, or null on error
 *
 * @example
 * ```typescript
 * const result = await rulesRegistryPropose({
 *   rule_text: 'Do not use TypeScript interfaces — use Zod schemas with z.infer<>',
 *   rule_type: 'lint',
 *   scope: 'global',
 *   severity: 'error',
 *   source_story_id: 'WINT-4020',
 * })
 * if (result?.ok) {
 *   console.log('Proposed rule:', result.data.id)
 * }
 * ```
 */
export async function rulesRegistryPropose(
  input: ProposeRuleInput,
): Promise<ProposeRuleResult | null> {
  try {
    logger.info('[mcp-tools] rules_registry_propose called', {
      rule_type: input.rule_type,
      scope: input.scope,
      severity: input.severity,
    })

    const result = await proposeRule(input)

    if (result.ok) {
      logger.info('[mcp-tools] rules_registry_propose succeeded', { id: result.data.id })
    } else {
      logger.info('[mcp-tools] rules_registry_propose conflict detected', {
        conflicting_ids: result.conflicting_ids,
      })
    }

    return result
  } catch (error) {
    logger.warn('[mcp-tools] rules_registry_propose failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
