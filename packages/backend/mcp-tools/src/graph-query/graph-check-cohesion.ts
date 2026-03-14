/**
 * Graph Check Cohesion MCP Tool
 * WINT-0130 AC-6: Validates feature cohesion against active cohesion rules
 *
 * Features:
 * - Dual ID support (UUID or feature name)
 * - Zod validation at entry (fail fast)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with features and cohesionRules schemas from @repo/knowledge-base/src/db
 *
 * Security: AC-2 (Parameterized Queries Mandatory), AC-10 (Zod Validation at Entry)
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { features, cohesionRules } from '@repo/knowledge-base/src/db'
import { eq, or } from 'drizzle-orm'
import {
  GraphCheckCohesionInputSchema,
  type GraphCheckCohesionInput,
  type GraphCheckCohesionOutput,
  type RuleConditions,
} from './__types__/index.js'

/**
 * Check feature cohesion against active cohesion rules
 *
 * @param input - Feature ID (UUID or feature name)
 * @returns Cohesion status (complete/incomplete/unknown) with violations
 *
 * @example
 * ```typescript
 * const result = await graphCheckCohesion({ featureId: 'user-authentication' })
 * // => { status: 'complete', violations: [] }
 *
 * const result2 = await graphCheckCohesion({ featureId: 'incomplete-feature' })
 * // => { status: 'incomplete', violations: ['Missing create capability', 'Missing update capability'] }
 * ```
 *
 * Note: This is MVP implementation. Schema currently doesn't have capability-feature linkage.
 * Future enhancement (post-WINT-0130) will add feature-capability relationship tracking.
 */
export async function graph_check_cohesion(
  input: GraphCheckCohesionInput,
): Promise<GraphCheckCohesionOutput> {
  // Validate input - fail fast if invalid (AC-10: Zod Validation at Entry)
  const parsed = GraphCheckCohesionInputSchema.parse(input)

  try {
    // Query feature (dual ID support: UUID or feature name)
    const [feature] = await db
      .select()
      .from(features)
      .where(or(eq(features.id, parsed.featureId), eq(features.featureName, parsed.featureId)))
      .limit(1)

    if (!feature) {
      return { status: 'unknown' }
    }

    // Query active cohesion rules (AC-6: Apply only active rules)
    const activeRules = await db
      .select()
      .from(cohesionRules)
      .where(eq(cohesionRules.isActive, true))

    // Check feature against active rules
    const violations: string[] = []

    for (const rule of activeRules) {
      try {
        const conditions = rule.conditions as RuleConditions

        // MVP: Basic pattern matching for featurePatterns
        if (conditions.featurePatterns) {
          const { include, exclude } = conditions.featurePatterns
          const matches = include?.some(pattern => feature.featureName.includes(pattern))
          const excluded = exclude?.some(pattern => feature.featureName.includes(pattern))

          if (matches && !excluded) {
            // This rule applies to this feature
            // Check package cohesion (basic validation)
            if (rule.ruleType === 'package_cohesion' && conditions.packagePatterns) {
              const packageMatches = conditions.packagePatterns.include?.some(pattern =>
                feature.packageName?.includes(pattern),
              )
              if (!packageMatches) {
                violations.push(
                  `Rule '${rule.ruleName}': Feature violates package cohesion (package: ${feature.packageName})`,
                )
              }
            }
          }
        }
      } catch (error) {
        // Resilient error handling: malformed JSONB, skip rule and log warning
        logger.warn(
          `[mcp-tools] Malformed JSONB in cohesion rule '${rule.ruleName}':`,
          error instanceof Error ? error.message : String(error),
        )
      }
    }

    // Return cohesion status
    return {
      status: violations.length > 0 ? 'incomplete' : 'complete',
      violations: violations.length > 0 ? violations : undefined,
    }
  } catch (error) {
    // Resilient error handling: log warning, don't crash (AC-12: Resilient Error Handling)
    logger.warn(
      `[mcp-tools] Failed to check cohesion for feature '${parsed.featureId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return { status: 'unknown' }
  }
}
