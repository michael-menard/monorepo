/**
 * Elaboration Delta Detection Node
 *
 * Identifies changes between elaboration iterations by comparing story sections.
 * Tracks modifications to ACs, non-goals, test hints, and known unknowns across
 * elaboration cycles to enable incremental refinement and change tracking.
 *
 * FLOW-031: LangGraph Elaboration Node - Delta Detection
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type {
  SynthesizedStory,
  FinalAcceptanceCriterion,
  NonGoal,
  TestHint,
  KnownUnknown,
} from '../story/synthesize.js'

/**
 * Schema for change types between story versions.
 */
export const ChangeTypeSchema = z.enum(['added', 'modified', 'removed', 'unchanged'])

export type ChangeType = z.infer<typeof ChangeTypeSchema>

/**
 * Schema for a section name that can be compared.
 */
export const SectionNameSchema = z.enum([
  'acceptanceCriteria',
  'nonGoals',
  'testHints',
  'knownUnknowns',
  'constraints',
  'affectedFiles',
  'dependencies',
])

export type SectionName = z.infer<typeof SectionNameSchema>

/**
 * Schema for an individual section change.
 */
export const SectionChangeSchema = z.object({
  /** Unique ID of the item (e.g., AC-1, NG-1, TH-1, KU-1) */
  itemId: z.string().min(1),
  /** Section where the change occurred */
  section: SectionNameSchema,
  /** Type of change detected */
  changeType: ChangeTypeSchema,
  /** Content before the change (null if added) */
  oldContent: z.string().nullable(),
  /** Content after the change (null if removed) */
  newContent: z.string().nullable(),
  /** Field-level changes for complex items */
  fieldChanges: z
    .array(
      z.object({
        field: z.string(),
        oldValue: z.unknown().nullable(),
        newValue: z.unknown().nullable(),
      }),
    )
    .default([]),
  /** Significance score (1-10, higher = more impactful) */
  significance: z.number().int().min(1).max(10).default(5),
})

export type SectionChange = z.infer<typeof SectionChangeSchema>

/**
 * Schema for summary statistics of detected deltas.
 */
export const DeltaSummaryStatsSchema = z.object({
  /** Total number of changes detected */
  totalChanges: z.number().int().min(0),
  /** Number of items added */
  addedCount: z.number().int().min(0),
  /** Number of items modified */
  modifiedCount: z.number().int().min(0),
  /** Number of items removed */
  removedCount: z.number().int().min(0),
  /** Number of items unchanged */
  unchangedCount: z.number().int().min(0),
  /** Changes by section */
  changesBySection: z.record(SectionNameSchema, z.number().int().min(0)).default({}),
  /** Average significance of changes */
  averageSignificance: z.number().min(0).max(10),
  /** Whether the changes are substantial (threshold-based) */
  hasSubstantialChanges: z.boolean(),
})

export type DeltaSummaryStats = z.infer<typeof DeltaSummaryStatsSchema>

/**
 * Schema for the complete delta detection result.
 */
export const DeltaDetectionResultSchema = z.object({
  /** Story ID being compared */
  storyId: z.string().regex(/^[a-z]+-\d+$/i),
  /** Timestamp of the comparison */
  detectedAt: z.string().datetime(),
  /** Iteration number of the previous story */
  previousIteration: z.number().int().min(0),
  /** Iteration number of the current story */
  currentIteration: z.number().int().min(1),
  /** All detected changes */
  changes: z.array(SectionChangeSchema),
  /** Summary statistics */
  stats: DeltaSummaryStatsSchema,
  /** Narrative summary of changes */
  summary: z.string().min(1),
  /** Whether delta detection was successful */
  detected: z.boolean(),
  /** Error message if detection failed */
  error: z.string().optional(),
})

export type DeltaDetectionResult = z.infer<typeof DeltaDetectionResultSchema>

/**
 * Configuration for delta detection.
 */
export const DeltaDetectionConfigSchema = z.object({
  /** Minimum significance to include in results */
  minSignificance: z.number().int().min(1).max(10).default(1),
  /** Threshold for substantial changes (number of changes) */
  substantialChangeThreshold: z.number().int().positive().default(3),
  /** Whether to track field-level changes */
  trackFieldChanges: z.boolean().default(true),
  /** Sections to compare (empty = all) */
  sectionsToCompare: z.array(SectionNameSchema).default([]),
})

export type DeltaDetectionConfig = z.infer<typeof DeltaDetectionConfigSchema>

/**
 * Schema for delta detection node result.
 */
export const DeltaDetectionNodeResultSchema = z.object({
  /** The delta detection result */
  deltaResult: DeltaDetectionResultSchema.nullable(),
  /** Whether detection was successful */
  deltaDetected: z.boolean(),
  /** Error message if detection failed */
  error: z.string().optional(),
})

export type DeltaDetectionNodeResult = z.infer<typeof DeltaDetectionNodeResultSchema>

/**
 * Extracts the description/content from an item for comparison.
 *
 * @param item - The item to extract content from
 * @returns The primary content string
 */
function extractItemContent(item: unknown): string {
  if (typeof item === 'string') {
    return item
  }
  if (typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>
    if ('description' in obj && typeof obj.description === 'string') {
      return obj.description
    }
  }
  return JSON.stringify(item)
}

/**
 * Extracts the ID from an item.
 *
 * @param item - The item to extract ID from
 * @param index - Fallback index for items without IDs
 * @returns The item ID
 */
function extractItemId(item: unknown, index: number): string {
  if (typeof item === 'string') {
    return `item-${index}`
  }
  if (typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>
    if ('id' in obj && typeof obj.id === 'string') {
      return obj.id
    }
  }
  return `item-${index}`
}

/**
 * Calculates significance of a change based on section and change type.
 *
 * @param section - The section name
 * @param changeType - The type of change
 * @param item - The changed item (for additional context)
 * @returns Significance score (1-10)
 */
function calculateSignificance(
  section: SectionName,
  changeType: ChangeType,
  item?: unknown,
): number {
  // Base significance by section
  const sectionWeights: Record<SectionName, number> = {
    acceptanceCriteria: 8,
    nonGoals: 6,
    testHints: 5,
    knownUnknowns: 7,
    constraints: 6,
    affectedFiles: 4,
    dependencies: 5,
  }

  let significance = sectionWeights[section] || 5

  // Adjust by change type
  if (changeType === 'added') {
    significance = Math.min(10, significance + 1)
  } else if (changeType === 'removed') {
    significance = Math.min(10, significance + 2)
  } else if (changeType === 'unchanged') {
    significance = 1
  }

  // Additional adjustments for ACs with high priority
  if (section === 'acceptanceCriteria' && typeof item === 'object' && item !== null) {
    const ac = item as FinalAcceptanceCriterion
    if (ac.priority === 1) {
      significance = Math.min(10, significance + 1)
    }
    if (ac.fromBaseline) {
      significance = Math.min(10, significance + 1)
    }
  }

  // Adjust for blocking known unknowns
  if (section === 'knownUnknowns' && typeof item === 'object' && item !== null) {
    const ku = item as KnownUnknown
    if (ku.impact === 'blocking') {
      significance = Math.min(10, significance + 2)
    }
  }

  return significance
}

/**
 * Detects field-level changes between two items.
 *
 * @param oldItem - Previous version of the item
 * @param newItem - Current version of the item
 * @returns Array of field changes
 */
function detectFieldChanges(
  oldItem: unknown,
  newItem: unknown,
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = []

  if (typeof oldItem !== 'object' || typeof newItem !== 'object' || !oldItem || !newItem) {
    return changes
  }

  const oldObj = oldItem as Record<string, unknown>
  const newObj = newItem as Record<string, unknown>

  // Get all fields from both objects
  const allFields = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

  for (const field of allFields) {
    // Skip id field
    if (field === 'id') continue

    const oldValue = oldObj[field]
    const newValue = newObj[field]

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field, oldValue: oldValue ?? null, newValue: newValue ?? null })
    }
  }

  return changes
}

/**
 * Classifies the type of change between two items.
 *
 * @param oldItem - Previous version (null if new)
 * @param newItem - Current version (null if removed)
 * @returns The change type
 */
export function classifyChange(oldItem: unknown, newItem: unknown): ChangeType {
  if (oldItem === null || oldItem === undefined) {
    return 'added'
  }
  if (newItem === null || newItem === undefined) {
    return 'removed'
  }

  // Compare content
  const oldContent = extractItemContent(oldItem)
  const newContent = extractItemContent(newItem)

  if (oldContent === newContent) {
    // Check for field-level changes in objects
    if (typeof oldItem === 'object' && typeof newItem === 'object') {
      const fieldChanges = detectFieldChanges(oldItem, newItem)
      if (fieldChanges.length > 0) {
        return 'modified'
      }
    }
    return 'unchanged'
  }

  return 'modified'
}

/**
 * Creates an index map of items by ID.
 *
 * @param items - Array of items to index
 * @returns Map of ID to item
 */
function createItemIndex(items: unknown[]): Map<string, unknown> {
  const index = new Map<string, unknown>()
  items.forEach((item, i) => {
    const id = extractItemId(item, i)
    index.set(id, item)
  })
  return index
}

/**
 * Compares two sections and detects changes.
 *
 * @param oldSection - Previous version of the section
 * @param newSection - Current version of the section
 * @param sectionName - Name of the section being compared
 * @param config - Detection configuration
 * @returns Array of section changes
 */
export function diffSections(
  oldSection: unknown[] | undefined,
  newSection: unknown[] | undefined,
  sectionName: SectionName,
  config: DeltaDetectionConfig,
): SectionChange[] {
  const changes: SectionChange[] = []

  const oldItems = oldSection ?? []
  const newItems = newSection ?? []

  const oldIndex = createItemIndex(oldItems)
  const newIndex = createItemIndex(newItems)

  // Track all IDs
  const allIds = new Set([...oldIndex.keys(), ...newIndex.keys()])

  for (const itemId of allIds) {
    const oldItem = oldIndex.get(itemId)
    const newItem = newIndex.get(itemId)

    const changeType = classifyChange(oldItem, newItem)
    const significance = calculateSignificance(sectionName, changeType, newItem || oldItem)

    // Skip if below minimum significance
    if (significance < config.minSignificance) {
      continue
    }

    const oldContent = oldItem ? extractItemContent(oldItem) : null
    const newContent = newItem ? extractItemContent(newItem) : null

    const fieldChanges = config.trackFieldChanges ? detectFieldChanges(oldItem, newItem) : []

    changes.push({
      itemId,
      section: sectionName,
      changeType,
      oldContent,
      newContent,
      fieldChanges,
      significance,
    })
  }

  return changes
}

/**
 * Generates a summary narrative for the detected changes.
 *
 * @param changes - Array of section changes
 * @param stats - Summary statistics
 * @param storyId - Story ID
 * @returns Summary narrative
 */
function generateSummary(
  changes: SectionChange[],
  stats: DeltaSummaryStats,
  storyId: string,
): string {
  const parts: string[] = []

  if (stats.totalChanges === 0) {
    return `No changes detected between elaboration iterations for story ${storyId}.`
  }

  parts.push(`Detected ${stats.totalChanges} change(s) for story ${storyId}:`)

  if (stats.addedCount > 0) {
    parts.push(`${stats.addedCount} item(s) added`)
  }
  if (stats.modifiedCount > 0) {
    parts.push(`${stats.modifiedCount} item(s) modified`)
  }
  if (stats.removedCount > 0) {
    parts.push(`${stats.removedCount} item(s) removed`)
  }

  // Highlight significant changes
  const significantChanges = changes.filter(c => c.significance >= 7)
  if (significantChanges.length > 0) {
    parts.push(
      `Notable changes in: ${[...new Set(significantChanges.map(c => c.section))].join(', ')}`,
    )
  }

  if (stats.hasSubstantialChanges) {
    parts.push('Changes are substantial and may require review.')
  }

  return parts.join('. ') + '.'
}

/**
 * Calculates summary statistics from detected changes.
 *
 * @param changes - Array of section changes
 * @param config - Detection configuration
 * @returns Summary statistics
 */
function calculateStats(changes: SectionChange[], config: DeltaDetectionConfig): DeltaSummaryStats {
  const addedCount = changes.filter(c => c.changeType === 'added').length
  const modifiedCount = changes.filter(c => c.changeType === 'modified').length
  const removedCount = changes.filter(c => c.changeType === 'removed').length
  const unchangedCount = changes.filter(c => c.changeType === 'unchanged').length

  const changesBySection: Partial<Record<SectionName, number>> = {}
  for (const change of changes) {
    if (change.changeType !== 'unchanged') {
      changesBySection[change.section] = (changesBySection[change.section] ?? 0) + 1
    }
  }

  const significantChanges = changes.filter(c => c.changeType !== 'unchanged')
  const averageSignificance =
    significantChanges.length > 0
      ? significantChanges.reduce((sum, c) => sum + c.significance, 0) / significantChanges.length
      : 0

  const totalActualChanges = addedCount + modifiedCount + removedCount

  return {
    totalChanges: totalActualChanges,
    addedCount,
    modifiedCount,
    removedCount,
    unchangedCount,
    changesBySection: changesBySection as Record<SectionName, number>,
    averageSignificance: Math.round(averageSignificance * 100) / 100,
    hasSubstantialChanges: totalActualChanges >= config.substantialChangeThreshold,
  }
}

/**
 * Main delta detection function that compares two story versions.
 *
 * @param previousStory - Previous version of the story (null for initial)
 * @param currentStory - Current version of the story
 * @param previousIteration - Iteration number of the previous story
 * @param currentIteration - Iteration number of the current story
 * @param config - Detection configuration
 * @returns Delta detection result
 */
export async function detectDeltas(
  previousStory: SynthesizedStory | null | undefined,
  currentStory: SynthesizedStory,
  previousIteration: number = 0,
  currentIteration: number = 1,
  config: Partial<DeltaDetectionConfig> = {},
): Promise<DeltaDetectionResult> {
  const fullConfig = DeltaDetectionConfigSchema.parse(config)

  try {
    const allChanges: SectionChange[] = []

    // Determine which sections to compare
    const sectionsToCompare: SectionName[] =
      fullConfig.sectionsToCompare.length > 0
        ? fullConfig.sectionsToCompare
        : [
            'acceptanceCriteria',
            'nonGoals',
            'testHints',
            'knownUnknowns',
            'constraints',
            'affectedFiles',
            'dependencies',
          ]

    // Compare each section
    for (const sectionName of sectionsToCompare) {
      const oldSection = previousStory
        ? (previousStory[sectionName] as unknown[] | undefined)
        : undefined
      const newSection = currentStory[sectionName] as unknown[] | undefined

      const sectionChanges = diffSections(oldSection, newSection, sectionName, fullConfig)
      allChanges.push(...sectionChanges)
    }

    // Filter out unchanged items from final results (keep them for stats)
    const significantChanges = allChanges.filter(c => c.changeType !== 'unchanged')

    // Calculate statistics
    const stats = calculateStats(allChanges, fullConfig)

    // Generate summary
    const summary = generateSummary(significantChanges, stats, currentStory.storyId)

    const result: DeltaDetectionResult = {
      storyId: currentStory.storyId,
      detectedAt: new Date().toISOString(),
      previousIteration,
      currentIteration,
      changes: significantChanges,
      stats,
      summary,
      detected: true,
    }

    // Validate against schema
    return DeltaDetectionResultSchema.parse(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during detection'
    return {
      storyId: currentStory.storyId,
      detectedAt: new Date().toISOString(),
      previousIteration,
      currentIteration,
      changes: [],
      stats: {
        totalChanges: 0,
        addedCount: 0,
        modifiedCount: 0,
        removedCount: 0,
        unchangedCount: 0,
        changesBySection: {},
        averageSignificance: 0,
        hasSubstantialChanges: false,
      },
      summary: `Delta detection failed: ${errorMessage}`,
      detected: false,
      error: errorMessage,
    }
  }
}

/**
 * Extended graph state with delta detection results.
 */
export interface GraphStateWithDeltaDetection extends GraphState {
  /** Previous synthesized story for comparison */
  previousSynthesizedStory?: SynthesizedStory | null
  /** Current synthesized story */
  synthesizedStory?: SynthesizedStory | null
  /** Iteration number of the previous story */
  previousElaborationIteration?: number
  /** Iteration number of the current story */
  currentElaborationIteration?: number
  /** Delta detection result */
  deltaDetectionResult?: DeltaDetectionResult | null
  /** Whether delta detection was successful */
  deltaDetected?: boolean
}

/**
 * Delta Detection node implementation.
 *
 * Compares the current synthesized story with the previous version
 * to identify changes across elaboration iterations.
 * Uses the tool preset (lower retries, shorter timeout) since this is
 * primarily computation with no external calls.
 *
 * @param state - Current graph state (must have synthesized story)
 * @returns Partial state update with delta detection results
 */
export const deltaDetectionNode = createToolNode(
  'delta_detection',
  async (state: GraphState): Promise<Partial<GraphStateWithDeltaDetection>> => {
    const stateWithStory = state as GraphStateWithDeltaDetection

    // Require current synthesized story
    if (!stateWithStory.synthesizedStory) {
      return updateState({
        deltaDetectionResult: null,
        deltaDetected: false,
      } as Partial<GraphStateWithDeltaDetection>)
    }

    const previousIteration = stateWithStory.previousElaborationIteration ?? 0
    const currentIteration = stateWithStory.currentElaborationIteration ?? 1

    const result = await detectDeltas(
      stateWithStory.previousSynthesizedStory,
      stateWithStory.synthesizedStory,
      previousIteration,
      currentIteration,
    )

    if (!result.detected) {
      return updateState({
        deltaDetectionResult: result,
        deltaDetected: false,
      } as Partial<GraphStateWithDeltaDetection>)
    }

    return updateState({
      deltaDetectionResult: result,
      deltaDetected: true,
    } as Partial<GraphStateWithDeltaDetection>)
  },
)

/**
 * Creates a delta detection node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createDeltaDetectionNode(config: Partial<DeltaDetectionConfig> = {}) {
  return createToolNode(
    'delta_detection',
    async (state: GraphState): Promise<Partial<GraphStateWithDeltaDetection>> => {
      const stateWithStory = state as GraphStateWithDeltaDetection

      // Require current synthesized story
      if (!stateWithStory.synthesizedStory) {
        throw new Error('Synthesized story is required for delta detection')
      }

      const previousIteration = stateWithStory.previousElaborationIteration ?? 0
      const currentIteration = stateWithStory.currentElaborationIteration ?? 1

      const result = await detectDeltas(
        stateWithStory.previousSynthesizedStory,
        stateWithStory.synthesizedStory,
        previousIteration,
        currentIteration,
        config,
      )

      if (!result.detected) {
        if (result.error) {
          throw new Error(result.error)
        }

        return updateState({
          deltaDetectionResult: result,
          deltaDetected: false,
        } as Partial<GraphStateWithDeltaDetection>)
      }

      return updateState({
        deltaDetectionResult: result,
        deltaDetected: true,
      } as Partial<GraphStateWithDeltaDetection>)
    },
  )
}
