/**
 * Graph Checker Agent Implementation
 * WINT-6060: Implement graph-checker Agent
 *
 * Detection-layer worker agent for Phase 4 feature cohesion subsystem.
 * Queries the feature cohesion graph and active rules to detect franken-features
 * and rule violations. Produces graph-check-results.json with actionable violations.
 *
 * Execution phases:
 * 1. Load Inputs — Parse story directory and optional package filter
 * 2. Query Graph — Call graph_get_franken_features and rulesRegistryGet
 * 3. Apply Rules — Evaluate each active rule against each franken-feature
 * 4. Produce Output — Write graph-check-results.json
 *
 * Per CLAUDE.md: Uses Zod schemas (z.infer<>) instead of TypeScript interfaces.
 * Per ARCH-001: Direct-call imports from @repo/mcp-tools and @repo/sidecar-rules-registry.
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import { logger } from '@repo/logger'

// Direct imports per ARCH-001 (direct-call pattern)
import { graph_get_franken_features } from '@repo/mcp-tools/graph-query/graph-get-franken-features'
import { rulesRegistryGet } from '@repo/mcp-tools/rules-registry/rules-registry-get'
import type { FrankenFeatureItem } from '@repo/mcp-tools/graph-query/__types__'
import type { Rule } from '@repo/sidecar-rules-registry'

// ============================================================================
// Type Definitions (Zod-First per CLAUDE.md)
// ============================================================================

/**
 * Schema for violation objects as defined in graph-checker.agent.md, lines 132-141
 */
const ViolationSchema = z.object({
  rule_id: z.string(),
  feature_id: z.string().uuid(),
  feature_name: z.string(),
  description: z.string(),
  severity: z.enum(['info', 'warning', 'error']),
  actionable_hint: z.string(),
})

type Violation = z.infer<typeof ViolationSchema>

/**
 * Schema for graph-check-results.json output per graph-checker.agent.md, lines 123-147
 */
const GraphCheckResultsSchema = z.object({
  story_id: z.string(),
  generated_at: z.string().datetime(),
  franken_features_found: z.number().int().min(0),
  violations: z.array(ViolationSchema),
  warnings: z.array(z.string()),
  warning_count: z.number().int().min(0),
})

type GraphCheckResults = z.infer<typeof GraphCheckResultsSchema>

/**
 * CRUD Stages constant referenced in agent spec, line 192.
 * Matches graph-get-franken-features.ts CRUD_STAGES constant.
 */
const CRUD_STAGES = ['create', 'read', 'update', 'delete'] as const

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Determines missing CRUD stages from missingCapabilities list.
 * Returns intersection of CRUD_STAGES and missingCapabilities.
 */
function getMissingStages(missingCapabilities: string[]): string[] {
  return CRUD_STAGES.filter(stage => missingCapabilities.includes(stage))
}

/**
 * Generates human-readable violation description.
 * Format: "Feature missing N of 4 CRUD stages: {stages}"
 */
function generateDescription(missingCapabilities: string[]): string {
  const missingStages = getMissingStages(missingCapabilities)
  const missingCount = missingStages.length
  const totalCount = CRUD_STAGES.length

  return `Feature missing ${missingCount} of ${totalCount} CRUD stages: ${missingStages.join(', ')}`
}

/**
 * Generates actionable hint for violation remediation.
 * Format: "Add {stages} capability/capabilities to feature `{name}`"
 */
function generateActionableHint(featureName: string, missingCapabilities: string[]): string {
  const missingStages = getMissingStages(missingCapabilities)
  const stageText = missingStages.length === 1 ? 'capability' : 'capabilities'
  return `Add ${missingStages.join(', ')} ${stageText} to feature \`${featureName}\``
}

/**
 * Deduplicates violations by (rule_id, feature_id) pair per graph-checker.agent.md, line 107.
 */
function deduplicateViolations(violations: Violation[]): Violation[] {
  const seen = new Set<string>()
  const result: Violation[] = []

  for (const violation of violations) {
    const key = `${violation.rule_id}:${violation.feature_id}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(violation)
    }
  }

  return result
}

// ============================================================================
// Main Execution (4-Phase Workflow)
// ============================================================================

async function main(): Promise<void> {
  // Initialize state
  let warningCount = 0
  const warnings: string[] = []
  let frankenFeaturesFound = 0
  const violations: Violation[] = []

  try {
    // ====================================================================
    // Phase 1: Load Inputs (per agent spec, lines 58-67)
    // ====================================================================

    logger.info('[graph-checker] Phase 1: Load Inputs')

    const storyId = 'WINT-6060'
    const storyDir = process.cwd()
    const packageNameFilter = process.argv[2] || undefined

    // Validate and create output directory if needed
    const outputDir = join(storyDir, '_implementation')
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = join(outputDir, 'graph-check-results.json')

    logger.info('[graph-checker] Inputs loaded', {
      story_id: storyId,
      output_dir: outputDir,
      package_filter: packageNameFilter || 'none',
    })

    // ====================================================================
    // Phase 2: Query Graph (per agent spec, lines 70-85)
    // ====================================================================

    logger.info('[graph-checker] Phase 2: Query Graph')

    // Query franken-features via direct-call pattern (ARCH-001)
    let frankenFeatures: FrankenFeatureItem[] = []
    try {
      frankenFeatures = await graph_get_franken_features(
        packageNameFilter ? { packageName: packageNameFilter } : {},
      )

      if (frankenFeatures.length === 0 && !packageNameFilter) {
        warningCount++
        warnings.push('graph.features empty — WINT-4030 may not have run')
      }

      frankenFeaturesFound = frankenFeatures.length
      logger.info('[graph-checker] Franken-features queried', { count: frankenFeaturesFound })
    } catch (error) {
      logger.warn('[graph-checker] Failed to query franken-features', {
        error: error instanceof Error ? error.message : String(error),
      })
      warningCount++
      warnings.push(
        `Failed to query franken-features: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    }

    // Query active rules via direct-call pattern (ARCH-001)
    let activeRules: Rule[] = []
    try {
      const rulesResult = await rulesRegistryGet({ status: 'active' })
      activeRules = rulesResult || []

      if (activeRules.length === 0) {
        warningCount++
        warnings.push('No active cohesion rules found — WINT-4050 may not have run')
      }

      logger.info('[graph-checker] Active rules queried', { count: activeRules.length })
    } catch (error) {
      logger.warn('[graph-checker] Failed to query active rules', {
        error: error instanceof Error ? error.message : String(error),
      })
      warningCount++
      warnings.push(
        `Failed to query active rules: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    }

    // ====================================================================
    // Phase 3: Apply Rules (per agent spec, lines 87-108)
    // ====================================================================

    logger.info('[graph-checker] Phase 3: Apply Rules')

    // For each active rule, evaluate against all franken-features
    for (const rule of activeRules) {
      for (const frankenFeature of frankenFeatures) {
        // Create violation for each rule-feature pair
        const violation: Violation = {
          rule_id: rule.id,
          feature_id: frankenFeature.featureId,
          feature_name: frankenFeature.featureName,
          description: generateDescription(frankenFeature.missingCapabilities),
          severity: (rule.severity as 'info' | 'warning' | 'error') || 'warning',
          actionable_hint: generateActionableHint(
            frankenFeature.featureName,
            frankenFeature.missingCapabilities,
          ),
        }

        violations.push(violation)
      }
    }

    // Add BUILTIN-CRUD-COMPLETENESS violations for franken-features without explicit rules
    for (const frankenFeature of frankenFeatures) {
      const hasExplicitViolation = violations.some(v => v.feature_id === frankenFeature.featureId)

      if (!hasExplicitViolation) {
        const violation: Violation = {
          rule_id: 'BUILTIN-CRUD-COMPLETENESS',
          feature_id: frankenFeature.featureId,
          feature_name: frankenFeature.featureName,
          description: 'Feature has < 4 distinct CRUD lifecycle stages',
          severity: 'warning',
          actionable_hint: generateActionableHint(
            frankenFeature.featureName,
            frankenFeature.missingCapabilities,
          ),
        }

        violations.push(violation)
      }
    }

    // Deduplicate violations by (rule_id, feature_id) pair
    const deduplicatedViolations = deduplicateViolations(violations)

    logger.info('[graph-checker] Rules applied', {
      violations_found: deduplicatedViolations.length,
    })

    // ====================================================================
    // Phase 4: Produce Output (per agent spec, lines 110-118)
    // ====================================================================

    logger.info('[graph-checker] Phase 4: Produce Output')

    const results: GraphCheckResults = {
      story_id: storyId,
      generated_at: new Date().toISOString(),
      franken_features_found: frankenFeaturesFound,
      violations: deduplicatedViolations,
      warnings,
      warning_count: warningCount,
    }

    // Validate output against schema (fail-fast on invalid data)
    const validatedResults = GraphCheckResultsSchema.parse(results)

    // Write to file (idempotent — overwrites if exists per spec line 116)
    writeFileSync(outputPath, JSON.stringify(validatedResults, null, 2), 'utf-8')

    logger.info('[graph-checker] Output written', {
      path: outputPath,
      violations_count: validatedResults.violations.length,
      warning_count: validatedResults.warning_count,
    })

    // ====================================================================
    // Completion Signal (per agent spec, lines 196-204)
    // ====================================================================

    if (warningCount > 0) {
      console.log(`GRAPH-CHECKER COMPLETE WITH WARNINGS: ${warningCount} warnings`)
    } else {
      console.log('GRAPH-CHECKER COMPLETE')
    }

    process.exit(0)
  } catch (error) {
    logger.error('[graph-checker] Unrecoverable error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    const reason = error instanceof Error ? error.message : String(error)
    console.log(`GRAPH-CHECKER BLOCKED: ${reason}`)
    process.exit(1)
  }
}

// Execute main workflow
main().catch(error => {
  console.error('Uncaught error:', error)
  process.exit(1)
})
