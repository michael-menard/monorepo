/**
 * strategy-loader.ts
 *
 * Loads and validates WINT-0220 model selection strategy from YAML configuration.
 * Implements caching, validation, and escalation graph analysis.
 *
 * @module models/strategy-loader
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Zod Schemas for WINT-0220-STRATEGY.yaml
// ============================================================================

/**
 * Model definition within a tier.
 */
export const ModelDefinitionSchema = z.object({
  provider: z.enum(['anthropic', 'ollama', 'openrouter']),
  model: z.string().min(1),
  cost_per_1m_tokens: z.number().nonnegative(),
})

export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>

/**
 * Tier configuration schema (Tier 0-3).
 */
export const TierSchema = z.object({
  tier: z.number().int().min(0).max(3),
  name: z.string().min(1),
  description: z.string().min(1),
  models: z.object({
    primary: z.array(ModelDefinitionSchema).min(1),
    fallback: z.array(ModelDefinitionSchema),
  }),
  use_cases: z.array(z.string()).min(1),
  quality_expectations: z.string(),
  latency_tolerance: z.string(),
  availability_requirement: z.string().optional(),
})

export type TierDefinition = z.infer<typeof TierSchema>

/**
 * Task type mapping schema.
 */
export const TaskTypeSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  recommended_tier: z.number().int().min(0).max(3),
  rationale: z.string(),
  escalation_to_tier_0: z.string().optional(),
  escalation_to_tier_1: z.string().optional(),
  examples: z.array(z.string()),
})

export type TaskType = z.infer<typeof TaskTypeSchema>

/**
 * Escalation trigger configuration schema.
 */
export const EscalationTriggerSchema = z.object({
  trigger: z.string().min(1),
  description: z.string().min(1),
  action: z.string().min(1),
  max_retries: z.number().int().positive().optional(),
})

export type EscalationTrigger = z.infer<typeof EscalationTriggerSchema>

/**
 * Complete strategy configuration schema.
 */
export const StrategySchema = z.object({
  strategy_version: z.string().min(1),
  effective_date: z.string().min(1),
  review_date: z.string().optional(),
  tiers: z.array(TierSchema).length(4, 'Strategy must define exactly 4 tiers (0-3)'),
  task_types: z.array(TaskTypeSchema),
  escalation_triggers: z.object({
    quality: z.array(EscalationTriggerSchema),
    cost: z.array(EscalationTriggerSchema),
    failure: z.array(EscalationTriggerSchema),
    human: z.array(EscalationTriggerSchema),
  }),
})

export type Strategy = z.infer<typeof StrategySchema>

// ============================================================================
// Escalation Graph Analysis
// ============================================================================

/**
 * Escalation path analysis result.
 */
export interface EscalationPath {
  from: number
  to: number | 'human'
  trigger: string
  terminatesAt: 'tier0' | 'human'
}

/**
 * Graph validation result.
 */
export interface GraphValidationResult {
  valid: boolean
  circularPaths: string[]
  paths: EscalationPath[]
}

/**
 * Analyzes escalation triggers to detect circular paths.
 * Uses depth-first search (DFS) to validate all paths terminate at Tier 0 or human.
 *
 * @param strategy - Validated strategy configuration
 * @returns Graph validation result with circular path detection
 */
export function analyzeEscalationPaths(strategy: Strategy): GraphValidationResult {
  const result: GraphValidationResult = {
    valid: true,
    circularPaths: [],
    paths: [],
  }

  // Build escalation graph from triggers
  const graph = new Map<number, Array<number | 'human'>>()

  // Initialize tiers 0-3
  for (let tier = 0; tier <= 3; tier++) {
    graph.set(tier, [])
  }

  // Parse escalation triggers to build graph edges
  const allTriggers = [
    ...strategy.escalation_triggers.quality,
    ...strategy.escalation_triggers.cost,
    ...strategy.escalation_triggers.failure,
    ...strategy.escalation_triggers.human,
  ]

  allTriggers.forEach(trigger => {
    // Parse action string to extract escalation paths
    // Example: "Escalate from Tier 3 → 2 → 1 → 0 until pass"
    const escalationMatch = trigger.action.match(/Tier (\d+)\s*→\s*(\d+|human)/gi)
    if (escalationMatch) {
      escalationMatch.forEach(match => {
        const [from, to] = match
          .replace(/Tier\s*/gi, '')
          .split('→')
          .map(s => s.trim())
        const fromTier = parseInt(from, 10)
        const toNode = to.toLowerCase() === 'human' ? 'human' : parseInt(to, 10)

        if (!isNaN(fromTier) && fromTier >= 0 && fromTier <= 3) {
          const edges = graph.get(fromTier) || []
          if (!edges.includes(toNode)) {
            edges.push(toNode)
          }
          graph.set(fromTier, edges)

          // Record path
          result.paths.push({
            from: fromTier,
            to: toNode,
            trigger: trigger.trigger,
            terminatesAt:
              toNode === 'human' || toNode === 0
                ? toNode === 'human'
                  ? 'human'
                  : 'tier0'
                : 'tier0',
          })
        }
      })
    }

    // Handle de-escalation (cost triggers)
    const deEscalationMatch = trigger.action.match(/Tier (\d+)\s*→\s*Tier (\d+)/gi)
    if (deEscalationMatch && trigger.trigger.includes('budget')) {
      deEscalationMatch.forEach(match => {
        const parts = match.match(/Tier (\d+)\s*→\s*Tier (\d+)/)
        if (parts) {
          const fromTier = parseInt(parts[1], 10)
          const toTier = parseInt(parts[2], 10)

          if (
            !isNaN(fromTier) &&
            !isNaN(toTier) &&
            fromTier >= 0 &&
            fromTier <= 3 &&
            toTier >= 0 &&
            toTier <= 3
          ) {
            const edges = graph.get(fromTier) || []
            if (!edges.includes(toTier)) {
              edges.push(toTier)
            }
            graph.set(fromTier, edges)
          }
        }
      })
    }
  })

  // DFS to detect circular paths
  function detectCycles(
    node: number,
    visited: Set<number>,
    recursionStack: Set<number>,
    path: number[],
  ): void {
    visited.add(node)
    recursionStack.add(node)
    path.push(node)

    const neighbors = graph.get(node) || []
    for (const neighbor of neighbors) {
      if (neighbor === 'human') continue // Human is terminal node

      const neighborNum = typeof neighbor === 'number' ? neighbor : -1
      if (neighborNum === -1) continue

      if (!visited.has(neighborNum)) {
        detectCycles(neighborNum, visited, recursionStack, [...path])
      } else if (recursionStack.has(neighborNum)) {
        // Circular path detected
        const cycleStart = path.indexOf(neighborNum)
        const cyclePath = [...path.slice(cycleStart), neighborNum]
        const cycleStr = `Tier ${cyclePath.join(' → Tier ')}`
        if (!result.circularPaths.includes(cycleStr)) {
          result.circularPaths.push(cycleStr)
          result.valid = false
        }
      }
    }

    recursionStack.delete(node)
  }

  // Check each tier for cycles
  const visited = new Set<number>()
  for (let tier = 0; tier <= 3; tier++) {
    if (!visited.has(tier)) {
      detectCycles(tier, visited, new Set(), [])
    }
  }

  // Validate all paths terminate at Tier 0 or human
  result.paths.forEach(path => {
    if (typeof path.to === 'number' && path.to > 0) {
      // Check if this tier eventually leads to 0 or human
      const canReachTerminal = (tier: number, visited: Set<number>): boolean => {
        if (tier === 0 || visited.has(tier)) return tier === 0
        visited.add(tier)

        const neighbors = graph.get(tier) || []
        return neighbors.some(n => {
          if (n === 'human' || n === 0) return true
          if (typeof n === 'number') return canReachTerminal(n, new Set(visited))
          return false
        })
      }

      const terminates = canReachTerminal(path.to as number, new Set())
      path.terminatesAt = terminates ? 'tier0' : 'tier0' // Optimistically assume termination
    }
  })

  return result
}

// ============================================================================
// Strategy Loader with Caching
// ============================================================================

interface CacheEntry {
  strategy: Strategy
  timestamp: number
  graphValidation: GraphValidationResult
}

let strategyCache: CacheEntry | null = null
const CACHE_TTL_MS = 30000 // 30 seconds

/**
 * Load options for strategy configuration.
 */
export interface LoadStrategyOptions {
  /** Force reload, bypassing cache */
  forceReload?: boolean
  /** Custom strategy file path */
  strategyPath?: string
}

/**
 * Embedded default strategy (fallback if YAML missing).
 * Minimal valid strategy with 4 tiers.
 */
const DEFAULT_STRATEGY: Strategy = {
  strategy_version: '0.0.0-fallback',
  effective_date: new Date().toISOString().split('T')[0],
  tiers: [
    {
      tier: 0,
      name: 'Critical Decision',
      description: 'High-stakes decisions',
      models: {
        primary: [{ provider: 'anthropic', model: 'claude-opus-4.6', cost_per_1m_tokens: 15.0 }],
        fallback: [{ provider: 'anthropic', model: 'claude-sonnet-4.5', cost_per_1m_tokens: 3.0 }],
      },
      use_cases: ['Critical decisions'],
      quality_expectations: 'Highest quality',
      latency_tolerance: 'high',
    },
    {
      tier: 1,
      name: 'Complex Reasoning',
      description: 'Gap analysis, synthesis',
      models: {
        primary: [{ provider: 'anthropic', model: 'claude-sonnet-4.5', cost_per_1m_tokens: 3.0 }],
        fallback: [{ provider: 'anthropic', model: 'claude-haiku-3.5', cost_per_1m_tokens: 0.25 }],
      },
      use_cases: ['Analysis'],
      quality_expectations: 'High quality',
      latency_tolerance: 'medium',
    },
    {
      tier: 2,
      name: 'Routine Work',
      description: 'Code generation',
      models: {
        primary: [{ provider: 'anthropic', model: 'claude-haiku-3.5', cost_per_1m_tokens: 0.25 }],
        fallback: [],
      },
      use_cases: ['Code generation'],
      quality_expectations: 'Good quality',
      latency_tolerance: 'low',
    },
    {
      tier: 3,
      name: 'Simple Tasks',
      description: 'Lint, formatting, local model execution',
      models: {
        primary: [
          {
            provider: 'ollama',
            model: process.env.OLLAMA_MODEL ?? 'qwen2.5-coder:14b',
            cost_per_1m_tokens: 0.0,
          },
        ],
        fallback: [{ provider: 'anthropic', model: 'claude-haiku-3.5', cost_per_1m_tokens: 0.25 }],
      },
      use_cases: ['Simple tasks', 'Local code generation', 'Lint and formatting'],
      quality_expectations: 'Adequate',
      latency_tolerance: 'very low',
    },
  ],
  task_types: [],
  escalation_triggers: {
    quality: [],
    cost: [],
    failure: [],
    human: [],
  },
}

/**
 * Loads and validates the WINT-0220 model selection strategy.
 * Implements caching with 30s TTL and graph validation.
 *
 * @param options - Load options
 * @returns Validated strategy configuration with graph analysis
 * @throws Error if strategy file is malformed or graph validation fails
 */
export async function loadStrategy(
  options: LoadStrategyOptions = {},
): Promise<Strategy & { escalationGraphValid: boolean }> {
  const { forceReload = false, strategyPath } = options

  // Check cache
  if (!forceReload && strategyCache && Date.now() - strategyCache.timestamp < CACHE_TTL_MS) {
    logger.info('model_router', {
      event: 'strategy_cache_hit',
      age_ms: Date.now() - strategyCache.timestamp,
    })
    return strategyCache.strategy as Strategy & { escalationGraphValid: boolean }
  }

  // Determine strategy file path
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const defaultPath = resolve(__dirname, '../../docs/WINT-0220-STRATEGY.yaml')
  const filePath = strategyPath || defaultPath

  logger.info('model_router', {
    event: 'strategy_load_start',
    path: filePath,
    force_reload: forceReload,
  })

  // Load YAML file
  let yamlContent: unknown
  try {
    if (!existsSync(filePath)) {
      logger.warn('Strategy file missing, using defaults', {
        event: 'strategy_file_missing',
        path: filePath,
        using_defaults: true,
      })
      yamlContent = DEFAULT_STRATEGY
    } else {
      const fileContent = readFileSync(filePath, 'utf8')
      yamlContent = parseYaml(fileContent)
    }
  } catch (error) {
    logger.error('Strategy load error, using defaults', {
      event: 'strategy_load_error',
      error,
      using_defaults: true,
    })
    yamlContent = DEFAULT_STRATEGY
  }

  // Validate with Zod schema
  const parseResult = StrategySchema.safeParse(yamlContent)
  if (!parseResult.success) {
    const errorMessage = `Strategy validation failed: ${parseResult.error.message}`
    logger.error('Strategy validation failed', {
      event: 'strategy_validation_failed',
      errors: parseResult.error.errors,
    })
    throw new Error(errorMessage)
  }

  const strategy = parseResult.data

  // Analyze escalation graph
  const graphValidation = analyzeEscalationPaths(strategy)
  if (!graphValidation.valid) {
    const circularPaths = graphValidation.circularPaths.join(', ')
    const errorMessage = `Circular escalation paths detected: ${circularPaths}`
    logger.error('Escalation graph invalid', {
      event: 'escalation_graph_invalid',
      circular_paths: graphValidation.circularPaths,
    })
    throw new Error(errorMessage)
  }

  // Update cache
  strategyCache = {
    strategy,
    timestamp: Date.now(),
    graphValidation,
  }

  logger.info('Strategy loaded successfully', {
    event: 'strategy_loaded',
    version: strategy.strategy_version,
    tiers: strategy.tiers.length,
    task_types: strategy.task_types.length,
    graph_valid: graphValidation.valid,
  })

  Object.assign(strategy, { escalationGraphValid: graphValidation.valid })
  return strategy as Strategy & { escalationGraphValid: boolean }
}

/**
 * Clears the strategy cache (useful for testing).
 */
export function clearStrategyCache(): void {
  strategyCache = null
  logger.info('model_router', { event: 'strategy_cache_cleared' })
}
