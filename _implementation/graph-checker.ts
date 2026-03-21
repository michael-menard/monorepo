/**
 * Graph Checker Agent Implementation - TypeScript Version
 * WINT-4060: Detects franken-features and rule violations
 *
 * Execution phases:
 * 1. Load Inputs: Parse story context and optional package filter
 * 2. Query Graph: Call graph_get_franken_features and rulesRegistryGet
 * 3. Apply Rules: Evaluate rules against franken-features
 * 4. Produce Output: Write graph-check-results.json
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Rule } from '@repo/sidecar-rules-registry'
import { logger } from '@repo/logger'
import { graph_get_franken_features } from '../../../packages/backend/mcp-tools/src/graph-query/graph-get-franken-features'
import { rulesRegistryGet } from '../../../packages/backend/mcp-tools/src/rules-registry/rules-registry-get'
import type { FrankenFeatureItem } from '../../../packages/backend/mcp-tools/src/graph-query/__types__/index'

interface GraphCheckViolation {
  rule_id: string
  feature_id: string
  feature_name: string
  description: string
  severity: 'info' | 'warning' | 'error'
  actionable_hint: string
}

interface GraphCheckResults {
  story_id: string
  generated_at: string
  franken_features_found: number
  violations: GraphCheckViolation[]
  warnings: string[]
  warning_count: number
}

// ============================================================================
// Phase 1: Load Inputs
// ============================================================================

const storyId = 'ORCH-2010'
const outputDir = join(process.cwd(), 'tree/story/ORCH-2010/_implementation')
const packageNameFilter: string | undefined = undefined

logger.info('[graph-checker] Phase 1: Loading inputs', {
  storyId,
  outputDir,
  packageNameFilter,
})

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

// Initialize counters
let warningCount = 0
const warnings: string[] = []
let frankenFeaturesFound = 0
const violations: GraphCheckViolation[] = []

// ============================================================================
// Phase 2: Query Graph
// ============================================================================

logger.info('[graph-checker] Phase 2: Querying graph')

let frankenFeatures: FrankenFeatureItem[] = []
let activeRules: Rule[] | null = null

try {
  frankenFeatures = await graph_get_franken_features(
    packageNameFilter ? { packageName: packageNameFilter } : {},
  )

  if (frankenFeatures.length === 0 && !packageNameFilter) {
    warningCount++
    warnings.push('graph.features empty — WINT-4030 may not have run')
  }

  frankenFeaturesFound = frankenFeatures.length
  logger.info('[graph-checker] Franken-features found', { count: frankenFeaturesFound })
} catch (error) {
  logger.warn('[graph-checker] Failed to get franken-features', {
    error: error instanceof Error ? error.message : String(error),
  })
  warningCount++
  warnings.push(
    `Failed to query graph.features: ${error instanceof Error ? error.message : 'unknown error'}`,
  )
}

try {
  activeRules = await rulesRegistryGet({ status: 'active' })

  if (!activeRules || activeRules.length === 0) {
    warningCount++
    warnings.push('No active cohesion rules found — WINT-4050 may not have run')
  }

  logger.info('[graph-checker] Active rules found', { count: activeRules?.length ?? 0 })
} catch (error) {
  logger.warn('[graph-checker] Failed to get active rules', {
    error: error instanceof Error ? error.message : String(error),
  })
  warningCount++
  warnings.push(
    `Failed to query active rules: ${error instanceof Error ? error.message : 'unknown error'}`,
  )
}

// ============================================================================
// Phase 3: Apply Rules
// ============================================================================

logger.info('[graph-checker] Phase 3: Applying rules')

const rules = activeRules ?? []

// For each active rule, match against franken-features
for (const rule of rules) {
  for (const feature of frankenFeatures) {
    // Simple rule matching: if rule type includes 'completeness' or 'CRUD',
    // this rule applies to franken-features
    if (
      rule.rule_type === 'lint' ||
      rule.scope.toLowerCase().includes('completeness') ||
      rule.scope.toLowerCase().includes('crud')
    ) {
      const violation: GraphCheckViolation = {
        rule_id: rule.id,
        feature_id: feature.featureId,
        feature_name: feature.featureName,
        description: `Feature missing ${feature.missingCapabilities.length} of 4 CRUD stages: ${feature.missingCapabilities.join(', ')}`,
        severity: (rule.severity as 'info' | 'warning' | 'error') || 'warning',
        actionable_hint: `Add ${feature.missingCapabilities.join(', ')} capability/capabilities to feature ${feature.featureName}`,
      }

      // Deduplicate by (rule_id, feature_id) pair
      const isDuplicate = violations.some(
        v => v.rule_id === violation.rule_id && v.feature_id === violation.feature_id,
      )

      if (!isDuplicate) {
        violations.push(violation)
      }
    }
  }
}

// Add BUILTIN-CRUD-COMPLETENESS violations for franken-features without explicit rules
for (const feature of frankenFeatures) {
  const hasExplicitRule = violations.some(v => v.feature_id === feature.featureId)

  if (!hasExplicitRule) {
    const violation: GraphCheckViolation = {
      rule_id: 'BUILTIN-CRUD-COMPLETENESS',
      feature_id: feature.featureId,
      feature_name: feature.featureName,
      description: 'Feature has < 4 distinct CRUD lifecycle stages',
      severity: 'warning',
      actionable_hint: `Add ${feature.missingCapabilities.join(', ')} capability/capabilities to feature ${feature.featureName}`,
    }

    violations.push(violation)
  }
}

logger.info('[graph-checker] Rules applied', { violations: violations.length })

// ============================================================================
// Phase 4: Produce Output
// ============================================================================

logger.info('[graph-checker] Phase 4: Producing output')

const output: GraphCheckResults = {
  story_id: storyId,
  generated_at: new Date().toISOString(),
  franken_features_found: frankenFeaturesFound,
  violations,
  warnings,
  warning_count: warningCount,
}

const outputPath = join(outputDir, 'graph-check-results.json')
writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')

logger.info('[graph-checker] Output written', { path: outputPath })

// ============================================================================
// Completion Signal
// ============================================================================

if (warningCount > 0) {
  logger.info(`GRAPH-CHECKER COMPLETE WITH WARNINGS: ${warningCount} warnings`)
  process.exit(0)
} else {
  logger.info('GRAPH-CHECKER COMPLETE')
  process.exit(0)
}
