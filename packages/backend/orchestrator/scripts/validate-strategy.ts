/**
 * validate-strategy.ts
 *
 * Validates WINT-0220-STRATEGY.yaml against Zod schema.
 * Ensures machine-readable strategy configuration is well-formed.
 *
 * Usage:
 *   pnpm --filter @repo/orchestrator exec tsx scripts/validate-strategy.ts
 */

import { z } from 'zod'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parse as parseYaml } from 'yaml'
import { logger } from '@repo/logger'

// ============================================================================
// Zod Schemas
// ============================================================================

const ProviderModelSchema = z.object({
  provider: z.enum(['anthropic', 'ollama']),
  model: z.string(),
  cost_per_1m_tokens: z.number().nonnegative(),
})

const TierSchema = z.object({
  tier: z.number().int().min(0).max(3),
  name: z.string(),
  description: z.string(),
  models: z.object({
    primary: z.array(ProviderModelSchema),
    fallback: z.array(ProviderModelSchema),
  }),
  use_cases: z.array(z.string()),
  quality_expectations: z.string(),
  latency_tolerance: z.string(),
  availability_requirement: z.string().optional(),
})

const TaskTypeSchema = z.object({
  type: z.string(),
  description: z.string(),
  recommended_tier: z.number().int().min(0).max(3),
  rationale: z.string(),
  escalation_to_tier_0: z.string().optional(),
  escalation_to_tier_1: z.string().optional(),
  examples: z.array(z.string()),
})

const EscalationTriggerSchema = z.object({
  trigger: z.string(),
  description: z.string(),
  action: z.string(),
  max_retries: z.number().int().positive().optional(),
})

const CostAnalysisSchema = z.object({
  baseline_scenario: z.string(),
  baseline_workflow_cost: z.object({
    setup: z.number(),
    analysis: z.number(),
    generation: z.number(),
    validation: z.number(),
    total: z.number(),
  }),
  proposed_scenario: z.string(),
  proposed_workflow_cost: z.object({
    setup: z.number(),
    analysis: z.number(),
    generation: z.number(),
    validation: z.number(),
    total: z.number(),
  }),
  savings: z.object({
    absolute: z.number(),
    percentage: z.number(),
    assumptions: z.array(z.string()),
  }),
  projected_monthly: z.object({
    workflows_per_month: z.number().int().positive(),
    baseline_monthly_cost: z.number(),
    proposed_monthly_cost: z.number(),
    monthly_savings: z.number(),
    annual_savings: z.number(),
  }),
})

const IntegrationSchema = z.object({
  modl_0010: z.object({
    status: z.string(),
    coordination: z.string(),
    provider_format: z.string(),
    backward_compatibility: z.string(),
  }),
  model_assignments_ts: z.object({
    location: z.string(),
    extension_required: z.string(),
    breaking_changes: z.string(),
    migration_path: z.string(),
  }),
  ollama_requirements: z.object({
    minimum_models: z.object({
      tier_2: z.array(z.string()),
      tier_3: z.array(z.string()),
    }),
    fallback_policy: z.string(),
    health_check: z.string(),
  }),
})

const MigrationWaveSchema = z.object({
  priority: z.string(),
  agents: z.array(z.string()),
  timeline: z.string(),
  risk: z.string(),
})

const AgentMigrationSchema = z.object({
  analysis_summary: z.object({
    total_agents: z.number().int().positive(),
    with_model_assignment: z.number().int().nonnegative(),
    without_model_assignment: z.number().int().nonnegative(),
    current_distribution: z.record(z.string(), z.number()),
  }),
  proposed_distribution: z.record(z.string(), z.number()),
  migration_waves: z.object({
    wave_1_critical: MigrationWaveSchema,
    wave_2_recommended: MigrationWaveSchema,
    wave_3_optimization: MigrationWaveSchema,
  }),
})

const VersioningSchema = z.object({
  current_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  review_schedule: z.string(),
  success_metrics: z.array(z.string()),
  revision_triggers: z.array(z.string()),
})

/**
 * Complete strategy configuration schema.
 */
const StrategySchema = z.object({
  strategy_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  tiers: z.array(TierSchema).length(4),
  task_types: z.array(TaskTypeSchema).min(10),

  escalation_triggers: z.object({
    quality: z.array(EscalationTriggerSchema).min(1),
    cost: z.array(EscalationTriggerSchema).min(1),
    failure: z.array(EscalationTriggerSchema).min(1),
    human: z.array(EscalationTriggerSchema).min(1),
  }),

  cost_analysis: CostAnalysisSchema,
  integration: IntegrationSchema,
  agent_migration: AgentMigrationSchema,
  versioning: VersioningSchema,
})

export type StrategyConfig = z.infer<typeof StrategySchema>

// ============================================================================
// Validation Function
// ============================================================================

/**
 * Validates the strategy YAML file.
 */
function validateStrategy(yamlPath: string): void {
  logger.info('Validating WINT-0220-STRATEGY.yaml...')

  // Read YAML file
  let content: string
  try {
    content = readFileSync(yamlPath, 'utf-8')
  } catch (error) {
    logger.error(`Failed to read file: ${yamlPath}`, { error: (error as Error).message })
    process.exit(1)
  }

  // Parse YAML
  let parsed: unknown
  try {
    parsed = parseYaml(content)
  } catch (error) {
    logger.error('Failed to parse YAML', { error: (error as Error).message })
    process.exit(1)
  }

  // Validate against schema
  const result = StrategySchema.safeParse(parsed)

  if (!result.success) {
    logger.error('Validation failed', { errors: result.error.format() })
    process.exit(1)
  }

  // Success - print summary
  const strategy = result.data

  logger.info('Validation passed', {
    strategyVersion: strategy.strategy_version,
    effectiveDate: strategy.effective_date,
    reviewDate: strategy.review_date,
  })

  logger.info('Configuration Summary', {
    tiers: strategy.tiers.length,
    taskTypes: strategy.task_types.length,
    qualityEscalationTriggers: strategy.escalation_triggers.quality.length,
    costEscalationTriggers: strategy.escalation_triggers.cost.length,
    failureEscalationTriggers: strategy.escalation_triggers.failure.length,
    humanInLoopTriggers: strategy.escalation_triggers.human.length,
  })

  logger.info('Cost Analysis', {
    baseline: `$${strategy.cost_analysis.baseline_workflow_cost.total.toFixed(3)} per workflow`,
    proposed: `$${strategy.cost_analysis.proposed_workflow_cost.total.toFixed(3)} per workflow`,
    savings: `${strategy.cost_analysis.savings.percentage.toFixed(1)}%`,
  })

  logger.info('Agent Migration', {
    totalAgents: strategy.agent_migration.analysis_summary.total_agents,
    tier0: strategy.agent_migration.proposed_distribution.tier_0,
    tier1: strategy.agent_migration.proposed_distribution.tier_1,
    tier2: strategy.agent_migration.proposed_distribution.tier_2,
    tier3: strategy.agent_migration.proposed_distribution.tier_3,
  })

  logger.info('Strategy configuration is valid and ready for use.')
}

// ============================================================================
// Main
// ============================================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const strategyPath = resolve(__dirname, '../docs/WINT-0220-STRATEGY.yaml')

validateStrategy(strategyPath)
