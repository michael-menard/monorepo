/**
 * task-contract.ts
 *
 * Task contract schema and types for task-based model selection.
 * Defines task characteristics (complexity, quality, security) that drive
 * tier selection in the model router.
 *
 * @module models/__types__/task-contract
 */

import { z } from 'zod'

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Task complexity levels.
 * - low: Simple, well-defined tasks (lint, formatting, status updates)
 * - medium: Standard development tasks (single-file generation, refactoring)
 * - high: Complex reasoning tasks (multi-file generation, architecture)
 */
export const ComplexityEnum = z.enum(['low', 'medium', 'high'])
export type Complexity = z.infer<typeof ComplexityEnum>

/**
 * Quality requirement levels.
 * - adequate: Basic correctness (simple tasks, non-critical)
 * - good: Standard quality (routine work)
 * - high: High quality (complex reasoning, multiple factors)
 * - critical: Highest quality (security-sensitive, high-stakes decisions)
 */
export const QualityRequirementEnum = z.enum(['adequate', 'good', 'high', 'critical'])
export type QualityRequirement = z.infer<typeof QualityRequirementEnum>

// ============================================================================
// Task Contract Schema
// ============================================================================

/**
 * Task contract schema.
 * Defines task characteristics that drive model tier selection.
 *
 * @example Simple code generation
 * ```typescript
 * const contract = TaskContractSchema.parse({
 *   taskType: 'code_generation',
 *   complexity: 'low',
 *   qualityRequirement: 'adequate',
 * })
 * // → Tier 3 (Ollama)
 * ```
 *
 * @example Security analysis
 * ```typescript
 * const contract = TaskContractSchema.parse({
 *   taskType: 'security_analysis',
 *   complexity: 'high',
 *   qualityRequirement: 'critical',
 *   securitySensitive: true,
 *   allowOllama: false,
 * })
 * // → Tier 0 (Opus)
 * ```
 */
export const TaskContractSchema = z.object({
  /**
   * Task type from WINT-0220 strategy taxonomy.
   * Must match a task type defined in WINT-0220-STRATEGY.yaml.
   */
  taskType: z.string().min(1),

  /**
   * Task complexity level.
   * High complexity triggers tier escalation.
   */
  complexity: ComplexityEnum,

  /**
   * Quality requirement level.
   * Critical quality forces Tier 0 (Opus).
   */
  qualityRequirement: QualityRequirementEnum,

  /**
   * Maximum token budget for task execution.
   * Triggers tier de-escalation if budget is constrained.
   * Optional - no budget constraint if omitted.
   */
  budgetTokens: z.number().int().positive().optional(),

  /**
   * Flag for reasoning-intensive tasks.
   * Requires models with strong reasoning capabilities.
   */
  requiresReasoning: z.boolean(),

  /**
   * Flag for security-sensitive tasks.
   * Forces Tier 0/1 (no Ollama), requires high-quality models.
   */
  securitySensitive: z.boolean(),

  /**
   * Flag to allow/prohibit Ollama models.
   * Set to false for production-critical tasks requiring managed providers.
   */
  allowOllama: z.boolean(),
})

export type TaskContract = z.infer<typeof TaskContractSchema>

// ============================================================================
// Partial Contract Schema (for builder pattern)
// ============================================================================

/**
 * Partial task contract schema.
 * Used by createTaskContract() to build contracts with defaults.
 */
export const PartialTaskContractSchema = TaskContractSchema.partial().required({ taskType: true })

export type PartialTaskContract = z.infer<typeof PartialTaskContractSchema>

// ============================================================================
// Contract Builder
// ============================================================================

/**
 * Default contract values.
 * Applied when fields are omitted from partial contracts.
 */
const DEFAULT_CONTRACT: Omit<TaskContract, 'taskType'> = {
  complexity: 'medium',
  qualityRequirement: 'good',
  budgetTokens: undefined,
  requiresReasoning: false,
  securitySensitive: false,
  allowOllama: true,
}

/**
 * Create a task contract with sensible defaults.
 * Validates partial contract and fills missing fields with defaults.
 *
 * @param partial - Partial contract with at least taskType
 * @returns Complete TaskContract with defaults applied
 * @throws ZodError if validation fails
 *
 * @example Full defaults
 * ```typescript
 * const contract = createTaskContract({ taskType: 'code_generation' })
 * // {
 * //   taskType: 'code_generation',
 * //   complexity: 'medium',
 * //   qualityRequirement: 'good',
 * //   requiresReasoning: false,
 * //   securitySensitive: false,
 * //   allowOllama: true,
 * // }
 * ```
 *
 * @example Partial override
 * ```typescript
 * const contract = createTaskContract({
 *   taskType: 'security_analysis',
 *   securitySensitive: true,
 * })
 * // {
 * //   taskType: 'security_analysis',
 * //   complexity: 'medium', // default
 * //   qualityRequirement: 'good', // default
 * //   requiresReasoning: false, // default
 * //   securitySensitive: true, // overridden
 * //   allowOllama: true, // default
 * // }
 * ```
 */
export function createTaskContract(partial: PartialTaskContract): TaskContract {
  // Validate partial contract
  const validated = PartialTaskContractSchema.parse(partial)

  // Merge with defaults
  const contract: TaskContract = {
    ...DEFAULT_CONTRACT,
    ...validated,
  }

  // Validate complete contract
  return TaskContractSchema.parse(contract)
}
