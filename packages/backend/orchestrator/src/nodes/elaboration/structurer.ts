/**
 * Elaboration Structurer Node
 *
 * Converts elaborated story acceptance criteria into an ordered list of
 * expected file changes (change_outline) with complexity estimates.
 * Flags stories exceeding a configurable split threshold for human review
 * before proceeding to implementation.
 *
 * FLOW-034: LangGraph Elaboration Node - Structurer
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { logger } from '@repo/logger'

// ============================================================================
// Schemas
// ============================================================================

/**
 * Configuration schema for the Structurer node.
 * AC-1: StructurerConfigSchema with required fields.
 */
export const StructurerConfigSchema = z.object({
  /** Whether the Structurer node is enabled */
  enabled: z.boolean().default(true),
  /** Maximum total estimated atomic changes before split is flagged (exclusive: > threshold) */
  splitThreshold: z.number().int().positive().default(15),
  /** Maximum estimated atomic changes per individual change item */
  maxChangesPerItem: z.number().int().positive().default(50),
  /** Node execution timeout in milliseconds */
  nodeTimeoutMs: z.number().positive().default(60000),
})

export type StructurerConfig = z.infer<typeof StructurerConfigSchema>

/**
 * Schema for an individual change outline item.
 * AC-2: ChangeOutlineItemSchema with required fields.
 */
export const ChangeOutlineItemSchema = z.object({
  /** Unique ID for the change item (e.g. "CO-1") */
  id: z.string().min(1),
  /** File path that will be created/modified/deleted */
  filePath: z.string().min(1),
  /** Type of change to be made */
  changeType: z.enum(['create', 'modify', 'delete']),
  /** Human-readable description of the change */
  description: z.string().min(1),
  /** Complexity estimate for this change */
  complexity: z.enum(['low', 'medium', 'high', 'unknown']),
  /** Estimated number of atomic changes (min 1) */
  estimatedAtomicChanges: z.number().int().min(1),
  /** IDs of acceptance criteria that drive this change */
  relatedAcIds: z.array(z.string()).default([]),
  /**
   * Forward-compatibility escape hatch for APIP-1020 spike additions.
   * ADR-001 Decision 3: intentionally minimal schema with extensions.
   */
  extensions: z.record(z.unknown()).optional(),
})

export type ChangeOutlineItem = z.infer<typeof ChangeOutlineItemSchema>

/**
 * Schema for the overall structurer result.
 * AC-3: StructurerResultSchema with required fields.
 */
export const StructurerResultSchema = z.object({
  /** Story ID structured */
  storyId: z.string().min(1),
  /** Ordered list of expected file changes */
  changeOutline: z.array(ChangeOutlineItemSchema),
  /** Sum of estimatedAtomicChanges across all items */
  totalEstimatedAtomicChanges: z.number().int().min(0),
  /** Whether total exceeds the split threshold (strictly > threshold) */
  splitRequired: z.boolean(),
  /** Human-readable explanation when splitRequired is true, null otherwise */
  splitReason: z.string().nullable(),
  /** ISO datetime when structuring was performed */
  structuredAt: z.string().datetime(),
  /** Duration of the structuring operation in milliseconds */
  durationMs: z.number().int().min(0),
  /** True if heuristic fallback was used instead of LLM estimation */
  fallbackUsed: z.boolean(),
})

export type StructurerResult = z.infer<typeof StructurerResultSchema>

// ============================================================================
// Complexity Estimation Heuristics
// ============================================================================

/**
 * Complexity levels with their estimated atomic change midpoints.
 * Per Architecture Notes:
 *   low:    1 system ref  → 1-3 changes, midpoint 2
 *   medium: 2 system refs → 3-8 changes, midpoint 5
 *   high:   3+ sys refs   → 8-15 changes, midpoint 11
 */
const COMPLEXITY_MIDPOINTS: Record<'low' | 'medium' | 'high' | 'unknown', number> = {
  low: 2,
  medium: 5,
  high: 11,
  unknown: 1,
}

/**
 * Common system/module reference patterns to detect in AC descriptions.
 * Each distinct reference type counts as one "system reference".
 */
const SYSTEM_REF_PATTERNS = [
  /database|db|aurora|postgres|sql|drizzle|migration|schema/i,
  /auth|authentication|authorization|jwt|session|token/i,
  /api|endpoint|route|handler|lambda|gateway/i,
  /cache|redis|elasticache|ttl/i,
  /queue|sqs|event|message|pubsub/i,
  /storage|s3|bucket|file|upload/i,
  /llm|model|claude|ollama|embedding|ai/i,
  /graph|langgraph|node|workflow|orchestrator/i,
  /frontend|ui|component|react|page|view/i,
  /package|library|module|dependency/i,
  /test|spec|coverage|vitest|playwright/i,
  /config|environment|env|setting|feature.flag/i,
]

/**
 * Counts the number of distinct system references in a description.
 *
 * @param description - AC description text
 * @returns Number of distinct system categories referenced
 */
function countSystemReferences(description: string): number {
  let count = 0
  for (const pattern of SYSTEM_REF_PATTERNS) {
    if (pattern.test(description)) {
      count++
    }
  }
  return count
}

/**
 * Determines complexity from system reference count.
 *
 * @param sysRefCount - Number of system references
 * @returns Complexity level
 */
function estimateComplexity(sysRefCount: number): 'low' | 'medium' | 'high' {
  if (sysRefCount <= 1) return 'low'
  if (sysRefCount === 2) return 'medium'
  return 'high'
}

/**
 * Bumps complexity up one level (for cross-cutting items).
 *
 * @param complexity - Original complexity level
 * @returns Bumped complexity level (high stays high)
 */
function bumpComplexity(complexity: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' {
  if (complexity === 'low') return 'medium'
  if (complexity === 'medium') return 'high'
  return 'high'
}

/** Zod schema for escape hatch evaluation entries */
const EscapeHatchEvaluationSchema = z.object({
  trigger: z.string(),
  detected: z.boolean(),
}).passthrough()

/** Zod schema for escape hatch result shape */
const EscapeHatchResultSchema = z.object({
  triggersActivated: z.array(z.string()).optional(),
  evaluations: z.array(EscapeHatchEvaluationSchema).optional(),
}).passthrough()

/**
 * Detects whether an AC is cross-cutting based on escape hatch result.
 *
 * @param _acId - Acceptance criterion ID (reserved for future per-AC filtering)
 * @param escapeHatchResult - Escape hatch evaluation result (if available)
 * @returns True if this AC is involved in cross-cutting changes
 */
function isCrossCutting(_acId: string, escapeHatchResult: unknown): boolean {
  const parsed = EscapeHatchResultSchema.safeParse(escapeHatchResult)
  if (!parsed.success) return false

  const result = parsed.data
  const triggersActivated = result.triggersActivated
  if (!Array.isArray(triggersActivated) || !triggersActivated.includes('cross_cutting')) {
    return false
  }

  // Check evaluations for cross-cutting detection
  const evaluations = result.evaluations
  if (Array.isArray(evaluations)) {
    for (const evaluation of evaluations) {
      if (evaluation.trigger === 'cross_cutting' && evaluation.detected === true) {
        return true
      }
    }
  }

  // If triggers activated but no evaluations, treat as cross-cutting
  return true
}

/**
 * Generates a change outline item for an acceptance criterion using heuristics.
 *
 * @param acId - AC ID
 * @param acDescription - AC description text
 * @param index - Zero-based index for CO ID generation
 * @param isCross - Whether this AC is cross-cutting
 * @param config - Structurer configuration
 * @returns ChangeOutlineItem
 */
function generateChangeOutlineItem(
  acId: string,
  acDescription: string,
  index: number,
  isCross: boolean,
  config: StructurerConfig,
): ChangeOutlineItem {
  const sysRefCount = countSystemReferences(acDescription)
  let complexity = estimateComplexity(sysRefCount)

  // Cross-cutting flag bumps estimate up one level
  if (isCross) {
    complexity = bumpComplexity(complexity)
  }

  const estimatedAtomicChanges = Math.min(COMPLEXITY_MIDPOINTS[complexity], config.maxChangesPerItem)

  // Derive a plausible file path from the AC description
  const filePath = deriveFilePath(acDescription, index)

  return ChangeOutlineItemSchema.parse({
    id: `CO-${index + 1}`,
    filePath,
    changeType: 'modify',
    description: `Changes required by ${acId}: ${acDescription.slice(0, 100)}${acDescription.length > 100 ? '...' : ''}`,
    complexity,
    estimatedAtomicChanges,
    relatedAcIds: [acId],
  })
}

/**
 * Derives a plausible file path from an AC description for the change outline.
 * This is a heuristic best-effort — the actual path is determined by the planner.
 *
 * @param description - AC description
 * @param index - Item index for fallback naming
 * @returns A plausible relative file path
 */
function deriveFilePath(description: string, index: number): string {
  const lower = description.toLowerCase()

  // Common pattern matches
  if (/frontend|ui|component|react|page/.test(lower)) {
    return `src/components/feature-${index + 1}.tsx`
  }
  if (/database|migration|schema/.test(lower)) {
    return `src/db/migrations/change-${index + 1}.sql`
  }
  if (/api|endpoint|handler|route/.test(lower)) {
    return `src/handlers/handler-${index + 1}.ts`
  }
  if (/test|spec/.test(lower)) {
    return `src/__tests__/feature-${index + 1}.test.ts`
  }
  if (/config|setting/.test(lower)) {
    return `src/config/config-${index + 1}.ts`
  }

  return `src/changes/change-${index + 1}.ts`
}

/**
 * Generates a split reason string for when total exceeds threshold.
 *
 * @param items - Change outline items
 * @param total - Total atomic changes
 * @param threshold - Split threshold
 * @returns Human-readable split reason
 */
function generateSplitReason(
  items: ChangeOutlineItem[],
  total: number,
  threshold: number,
): string {
  // Find the top contributors (highest estimatedAtomicChanges)
  const sorted = [...items].sort((a, b) => b.estimatedAtomicChanges - a.estimatedAtomicChanges)
  const topContributors = sorted.slice(0, 3)

  const contributorList = topContributors
    .map(item => `${item.id}: ${item.changeType} ${item.filePath} (${item.estimatedAtomicChanges})`)
    .join(', ')

  return (
    `Story exceeds split threshold: ${total} estimated atomic changes (threshold: ${threshold}). ` +
    `Contributing changes: [${contributorList}].`
  )
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Extended state schema for internal Structurer use.
 * Matches the fields added to ElaborationStateAnnotation in elaboration.ts.
 */
const StructurerElaborationStateSchema = z.object({
  storyId: z.string().optional(),
  currentStory: z.object({
    acceptanceCriteria: z.array(z.object({
      id: z.string(),
      description: z.string(),
    })),
  }).nullable().optional(),
  escapeHatchResult: z.unknown().optional(),
  warnings: z.array(z.string()).optional(),
})

type StructurerElaborationState = z.infer<typeof StructurerElaborationStateSchema>

/**
 * Creates a Structurer node with the given configuration.
 *
 * AC-4: createStructurerNode factory using createToolNode.
 *
 * @param config - Structurer configuration (partial — defaults applied)
 * @returns Configured LangGraph node function
 */
/**
 * Safely parses GraphState into the structurer's expected shape.
 * Single consolidated cast point — all downstream code uses validated fields.
 */
function parseStructurerState(state: GraphState): StructurerElaborationState {
  // GraphState is a superset; extract only the fields we need via Zod
  const parsed = StructurerElaborationStateSchema.safeParse(state)
  if (parsed.success) return parsed.data
  // Fallback: return minimal shape so callers handle gracefully
  return { storyId: undefined, currentStory: null, warnings: [] }
}

/**
 * Converts a structurer result object to Partial<GraphState>.
 * Single documented cast point for the node's return values.
 */
function toStateUpdate(update: Record<string, unknown>): Partial<GraphState> {
  return update as Partial<GraphState>
}

export function createStructurerNode(config: Partial<StructurerConfig> = {}) {
  const fullConfig = StructurerConfigSchema.parse(config)

  return createToolNode(
    'structurer',
    async (state: GraphState): Promise<Partial<GraphState>> => {
      const startTime = Date.now()
      const s = parseStructurerState(state)
      const storyId = s.storyId ?? 'unknown'

      logger.info('Structurer node starting', { storyId })

      // Guard: null or missing currentStory — AC-10
      if (!s.currentStory) {
        logger.warn('Structurer: currentStory is null — returning empty outline', { storyId })
        return toStateUpdate({
          changeOutline: [],
          splitRequired: false,
          splitReason: null,
          structurerComplete: true,
          warnings: ['Structurer: currentStory is null — returning empty change outline'],
        })
      }

      const acs = s.currentStory.acceptanceCriteria ?? []

      // Guard: empty ACs — AC-10
      if (acs.length === 0) {
        logger.warn('Structurer: no acceptance criteria — returning empty outline', { storyId })
        return toStateUpdate({
          changeOutline: [],
          splitRequired: false,
          splitReason: null,
          structurerComplete: true,
          warnings: ['Structurer: no acceptance criteria found — returning empty change outline'],
        })
      }

      try {
        // Build change outline using heuristic estimation
        const changeOutline: ChangeOutlineItem[] = acs.map((ac, idx) => {
          const crossCutting = isCrossCutting(ac.id, s.escapeHatchResult)
          return generateChangeOutlineItem(ac.id, ac.description, idx, crossCutting, fullConfig)
        })

        const totalEstimatedAtomicChanges = changeOutline.reduce(
          (sum, item) => sum + item.estimatedAtomicChanges,
          0,
        )

        // Split flagging: strictly > threshold (AC-9, ED-2)
        const splitRequired = totalEstimatedAtomicChanges > fullConfig.splitThreshold
        const splitReason = splitRequired
          ? generateSplitReason(changeOutline, totalEstimatedAtomicChanges, fullConfig.splitThreshold)
          : null

        const durationMs = Date.now() - startTime

        logger.info('Structurer node complete', {
          storyId,
          changeCount: changeOutline.length,
          totalEstimatedAtomicChanges,
          splitRequired,
          durationMs,
          fallbackUsed: false,
        })

        return toStateUpdate({
          changeOutline,
          splitRequired,
          splitReason,
          structurerComplete: true,
        })
      } catch (error) {
        // AC-11: Graceful fallback on any error
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('Structurer: error during estimation — using fallback', {
          storyId,
          error: errorMessage,
        })

        // One item per AC with complexity 'unknown' and estimatedAtomicChanges: 1
        const fallbackOutline: ChangeOutlineItem[] = acs.map((ac, idx) =>
          ChangeOutlineItemSchema.parse({
            id: `CO-${idx + 1}`,
            filePath: `src/changes/change-${idx + 1}.ts`,
            changeType: 'modify',
            description: `Changes required by ${ac.id}: ${ac.description.slice(0, 100)}`,
            complexity: 'unknown',
            estimatedAtomicChanges: 1,
            relatedAcIds: [ac.id],
          }),
        )

        const totalFallback = fallbackOutline.length
        const splitRequired = totalFallback > fullConfig.splitThreshold
        const splitReason = splitRequired
          ? generateSplitReason(fallbackOutline, totalFallback, fullConfig.splitThreshold)
          : null

        return toStateUpdate({
          changeOutline: fallbackOutline,
          splitRequired,
          splitReason,
          structurerComplete: true,
        })
      }
    },
  )
}

/**
 * Default structurer node instance with default configuration.
 * For use when no custom config is required.
 */
export const structurerNode = createStructurerNode()
