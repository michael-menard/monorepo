/**
 * model-assignments.ts
 *
 * TypeScript consumer for model-assignments.yaml.
 * Provides type-safe access to agent model assignments.
 *
 * @module config/model-assignments
 */

import { z } from 'zod'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parse as parseYaml } from 'yaml'

// ============================================================================
// Types
// ============================================================================

/**
 * Valid model values.
 */
export const ModelSchema = z.enum(['haiku', 'sonnet', 'opus'])

export type Model = z.infer<typeof ModelSchema>

/**
 * Model assignments map.
 */
export const ModelAssignmentsSchema = z.record(z.string(), ModelSchema)

export type ModelAssignments = z.infer<typeof ModelAssignmentsSchema>

// ============================================================================
// Default Assignments
// ============================================================================

/**
 * Default model assignments (fallback if YAML not found).
 */
export const DEFAULT_MODEL_ASSIGNMENTS: ModelAssignments = {
  // Setup leaders
  'elab-setup-leader': 'haiku',
  'dev-setup-leader': 'haiku',
  'qa-verify-setup-leader': 'haiku',

  // Work leaders
  'pm-story-generation-leader': 'sonnet',
  'elab-analyst': 'sonnet',
  'dev-implement-planning-leader': 'sonnet',

  // Workers
  'code-review-lint': 'haiku',
  'code-review-syntax': 'haiku',
  'code-review-style-compliance': 'haiku',
  'code-review-security': 'haiku',
  'code-review-typecheck': 'haiku',
  'code-review-build': 'haiku',
  'dev-implement-backend-coder': 'sonnet',
  'dev-implement-frontend-coder': 'sonnet',

  // Completion leaders
  'elab-completion-leader': 'haiku',
  'dev-documentation-leader': 'haiku',
  'qa-verify-completion-leader': 'haiku',
}

// ============================================================================
// YAML Loading
// ============================================================================

let cachedAssignments: ModelAssignments | null = null

/**
 * Loads model assignments from YAML file.
 * Caches the result for subsequent calls.
 */
export function loadModelAssignments(yamlPath?: string): ModelAssignments {
  if (cachedAssignments) {
    return cachedAssignments
  }

  // Try to find the YAML file
  const searchPaths = yamlPath
    ? [yamlPath]
    : [
        // Relative to this file (in dist)
        resolve(dirname(fileURLToPath(import.meta.url)), '../../../../.claude/config/model-assignments.yaml'),
        // Relative to project root (common case)
        resolve(process.cwd(), '.claude/config/model-assignments.yaml'),
      ]

  for (const path of searchPaths) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf-8')
        const parsed = parseYaml(content)

        // Filter out comments and validate
        const assignments: ModelAssignments = {}
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'string') {
            const result = ModelSchema.safeParse(value)
            if (result.success) {
              assignments[key] = result.data
            }
          }
        }

        cachedAssignments = assignments
        return assignments
      } catch {
        // Fall through to default
      }
    }
  }

  // Return defaults if YAML not found
  cachedAssignments = DEFAULT_MODEL_ASSIGNMENTS
  return cachedAssignments
}

/**
 * Clears the cached assignments (for testing).
 */
export function clearModelAssignmentsCache(): void {
  cachedAssignments = null
}

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Gets the model for an agent.
 *
 * @param agentName - Name of the agent (without .agent.md extension)
 * @param fallback - Default model if not found (default: 'sonnet')
 */
export function getModelForAgent(agentName: string, fallback: Model = 'sonnet'): Model {
  const assignments = loadModelAssignments()

  // Normalize agent name (remove extension if present)
  const normalizedName = agentName.replace(/\.agent\.md$/, '')

  return assignments[normalizedName] ?? fallback
}

/**
 * Gets all agents assigned to a specific model.
 */
export function getAgentsForModel(model: Model): string[] {
  const assignments = loadModelAssignments()

  return Object.entries(assignments)
    .filter(([_, m]) => m === model)
    .map(([agent]) => agent)
}

/**
 * Checks if an agent has a specific model assignment.
 */
export function hasModelAssignment(agentName: string): boolean {
  const assignments = loadModelAssignments()
  const normalizedName = agentName.replace(/\.agent\.md$/, '')
  return normalizedName in assignments
}

// ============================================================================
// Model Selection Helpers
// ============================================================================

/**
 * Model selection criteria.
 */
export const MODEL_SELECTION_CRITERIA = {
  haiku: {
    description: 'Fast, simple tasks',
    useCases: [
      'Setup leaders (validation)',
      'Completion leaders (status updates)',
      'Simple checks (lint, syntax)',
      'Template filling',
    ],
    characteristics: ['Low latency', 'Cost effective', 'Single-focus tasks'],
  },
  sonnet: {
    description: 'Analysis and code generation',
    useCases: [
      'Work leaders (analysis)',
      'Code generation (coders)',
      'Multi-factor decisions',
      'Complex synthesis',
    ],
    characteristics: ['Balanced capability', 'Good reasoning', 'Code quality'],
  },
  opus: {
    description: 'Complex judgment calls',
    useCases: ['Critical decisions', 'Nuanced analysis', 'High-stakes outputs'],
    characteristics: ['Best reasoning', 'Most capable', 'Highest cost'],
  },
} as const

/**
 * Suggests a model based on task characteristics.
 */
export function suggestModel(characteristics: {
  isValidation?: boolean
  isCodeGeneration?: boolean
  isComplexAnalysis?: boolean
  isCriticalDecision?: boolean
}): Model {
  if (characteristics.isCriticalDecision) {
    return 'opus'
  }

  if (characteristics.isComplexAnalysis || characteristics.isCodeGeneration) {
    return 'sonnet'
  }

  return 'haiku'
}
