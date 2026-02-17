/**
 * Graph Apply Rules MCP Tool
 * WINT-0130 AC-9: Applies active cohesion rules and returns violations
 *
 * Features:
 * - Optional rule type filter (enum validated)
 * - Zod validation at entry (fail fast)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with features and cohesionRules schemas from @repo/database-schema
 * - JSONB condition evaluation (MVP: basic pattern matching)
 *
 * Security: AC-2 (Parameterized Queries Mandatory), AC-10 (Zod Validation at Entry)
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { features, cohesionRules } from '@repo/database-schema'
import { eq, and } from 'drizzle-orm'
import {
  GraphApplyRulesInputSchema,
  type GraphApplyRulesInput,
  type RuleViolationsOutput,
  type RuleConditions,
} from './__types__/index.js'

/**
 * Apply active cohesion rules and return violations
 *
 * Evaluates all active cohesion rules against features and returns violations.
 * Supports optional rule type filtering.
 *
 * @param input - Optional rule type filter
 * @returns Array of rules with their violations
 *
 * @example
 * ```typescript
 * const violations = await graphApplyRules({})
 * // => [{ ruleId: 'uuid', ruleName: 'package-cohesion', severity: 'high', violations: [...] }]
 *
 * const filtered = await graphApplyRules({ ruleType: 'package_cohesion' })
 * // => Only package cohesion rule violations
 * ```
 *
 * **MVP Scope:** Basic pattern matching for JSONB conditions (substring include/exclude).
 * Advanced regex/wildcards deferred to future enhancements.
 */
export async function graph_apply_rules(
  input: GraphApplyRulesInput,
): Promise<RuleViolationsOutput[]> {
  // Validate input - fail fast if invalid (AC-10: Zod Validation at Entry)
  const parsed = GraphApplyRulesInputSchema.parse(input)

  try {
    // Query active cohesion rules with optional type filter
    const rulesToApply = await db
      .select()
      .from(cohesionRules)
      .where(
        parsed.ruleType
          ? and(eq(cohesionRules.isActive, true), eq(cohesionRules.ruleType, parsed.ruleType))
          : eq(cohesionRules.isActive, true),
      )

    if (rulesToApply.length === 0) {
      return []
    }

    // Query all features for rule evaluation
    const allFeatures = await db.select().from(features)

    // Apply rules and collect violations
    const results: RuleViolationsOutput[] = []

    for (const rule of rulesToApply) {
      try {
        const conditions = rule.conditions as RuleConditions
        const violations: RuleViolationsOutput['violations'] = []

        // Evaluate each feature against this rule
        for (const feature of allFeatures) {
          // MVP: Basic pattern matching for featurePatterns
          if (conditions.featurePatterns) {
            const { include, exclude } = conditions.featurePatterns
            const matches = include?.some(pattern => feature.featureName.includes(pattern))
            const excluded = exclude?.some(pattern => feature.featureName.includes(pattern))

            if (matches && !excluded) {
              // Feature matches this rule - check for violations
              if (rule.ruleType === 'package_cohesion' && conditions.packagePatterns) {
                const packageMatches = conditions.packagePatterns.include?.some(pattern =>
                  feature.packageName?.includes(pattern),
                )
                if (!packageMatches) {
                  violations.push({
                    featureId: feature.id,
                    description: `Feature '${feature.featureName}' violates package cohesion: expected package pattern, got '${feature.packageName}'`,
                  })
                }
              }
            }
          }

          // Package pattern evaluation (independent check)
          if (conditions.packagePatterns && !conditions.featurePatterns) {
            const { include, exclude } = conditions.packagePatterns
            const matches = include?.some(pattern => feature.packageName?.includes(pattern))
            const excluded = exclude?.some(pattern => feature.packageName?.includes(pattern))

            if (matches && !excluded) {
              // Feature is in scope for this rule
              // Check if it violates the rule (e.g., missing required relationships)
              // MVP: Basic validation only
            }
          }
        }

        // Add rule to results if it has violations (or is active and being evaluated)
        if (violations.length > 0) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.ruleName,
            severity: rule.severity,
            violations,
          })
        }
      } catch (error) {
        // Resilient JSONB parsing: skip malformed rule, log warning
        logger.warn(
          `[mcp-tools] Malformed JSONB in cohesion rule '${rule.ruleName}':`,
          error instanceof Error ? error.message : String(error),
        )
      }
    }

    return results
  } catch (error) {
    // Resilient error handling: log warning, don't crash (AC-12: Resilient Error Handling)
    logger.warn(
      '[mcp-tools] Failed to apply cohesion rules:',
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}
