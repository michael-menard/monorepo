/**
 * Graph Checker Runner Script
 * Executes the 4-phase graph check workflow
 */

import { graph_get_franken_features } from '../graph-query/graph-get-franken-features'
import { rulesRegistryGet } from '../rules-registry/rules-registry-get'
import { logger } from '@repo/logger'

interface GraphCheckResult {
  story_id: string
  generated_at: string
  franken_features_found: number
  violations: Array<{
    rule_id: string
    feature_id: string
    feature_name: string
    description: string
    severity: string
    actionable_hint: string
  }>
  warnings: string[]
  warning_count: number
}

async function main() {
  let warning_count = 0
  const warnings: string[] = []
  const violations: Array<any> = []

  try {
    logger.info('[graph-checker] Phase 1: Load Inputs - COMPLETE')
    
    // Phase 2: Query Graph
    logger.info('[graph-checker] Phase 2: Query Graph - starting')
    
    const frankenFeatures = await graph_get_franken_features({})
    const franken_features_found = frankenFeatures.length
    
    if (frankenFeatures.length === 0) {
      warning_count++
      warnings.push('graph.features empty — WINT-4030 may not have run')
    } else {
      frankenFeatures.forEach(ff => {
        logger.info(`[graph-checker] Franken-feature: ${ff.featureName} missing ${ff.missingCapabilities.join(', ')}`)
      })
    }
    
    logger.info(`[graph-checker] Phase 2: Query Graph - found ${franken_features_found} franken-features`)
    
    // Query rules
    const rules = await rulesRegistryGet({ status: 'active' })
    
    if (!rules || rules.length === 0) {
      warning_count++
      warnings.push('No active cohesion rules found — WINT-4050 may not have run')
    } else {
      logger.info(`[graph-checker] Phase 2: Query Graph - found ${rules.length} active rules`)
    }
    
    // Phase 3: Apply Rules
    logger.info('[graph-checker] Phase 3: Apply Rules - starting')
    
    // For each franken-feature, create a builtin violation
    for (const ff of frankenFeatures) {
      violations.push({
        rule_id: 'BUILTIN-CRUD-COMPLETENESS',
        feature_id: ff.featureId,
        feature_name: ff.featureName,
        description: `Feature has < 4 distinct CRUD lifecycle stages (missing: ${ff.missingCapabilities.join(', ')})`,
        severity: 'warning',
        actionable_hint: `Add ${ff.missingCapabilities.join(', ')} capability/capabilities to feature ${ff.featureName}`,
      })
    }
    
    // Apply active rules if they exist
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        // For each rule, match it against franken-features
        for (const ff of frankenFeatures) {
          // Check if rule applies to this feature
          // Simple pattern: check if feature name matches any pattern in rule conditions
          const ruleConditions = rule.conditions as any || {}
          const featurePatterns = ruleConditions.featurePatterns?.include || []
          
          let matches = featurePatterns.length === 0 // If no patterns, match all
          if (featurePatterns.length > 0) {
            matches = featurePatterns.some((pattern: string) => 
              ff.featureName.includes(pattern)
            )
          }
          
          if (matches) {
            violations.push({
              rule_id: rule.id,
              feature_id: ff.featureId,
              feature_name: ff.featureName,
              description: `Rule violation: ${rule.name}`,
              severity: rule.severity || 'warning',
              actionable_hint: rule.remediation || `Fix feature ${ff.featureName} to match rule ${rule.name}`,
            })
          }
        }
      }
    }
    
    logger.info(`[graph-checker] Phase 3: Apply Rules - generated ${violations.length} violations`)
    
    // Phase 4: Produce Output
    logger.info('[graph-checker] Phase 4: Produce Output - starting')
    
    const result: GraphCheckResult = {
      story_id: 'WINT-8060',
      generated_at: new Date().toISOString(),
      franken_features_found,
      violations,
      warnings,
      warning_count,
    }
    
    // Output as JSON to stdout
    process.stdout.write(JSON.stringify(result, null, 2))
    
  } catch (error) {
    logger.error('[graph-checker] Fatal error:', error)
    process.exit(1)
  }
}

main()
