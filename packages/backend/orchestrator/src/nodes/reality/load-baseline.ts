/**
 * Load Baseline Reality Node
 *
 * Reads the most recent BASELINE-REALITY-<date>.md file from plans/baselines/
 * and provides it as graph state for downstream nodes.
 *
 * FLOW-021: LangGraph Reality Intake Node - Baseline Loader
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'

/**
 * Pattern for baseline reality filename.
 * Format: BASELINE-REALITY-YYYY-MM-DD.md
 */
const BASELINE_FILENAME_PATTERN = /^BASELINE-REALITY-(\d{4}-\d{2}-\d{2})\.md$/

/**
 * Default baselines directory relative to project root.
 */
const DEFAULT_BASELINES_DIR = 'plans/baselines'

/**
 * Schema for parsed baseline reality content sections.
 */
export const BaselineRealitySectionSchema = z.object({
  /** Section heading */
  heading: z.string().min(1),
  /** Section content (markdown) */
  content: z.string(),
  /** Nested subsections */
  subsections: z.array(z.lazy(() => BaselineRealitySectionSchema)).optional(),
})

export type BaselineRealitySection = z.infer<typeof BaselineRealitySectionSchema>

/**
 * Schema for parsed baseline reality document.
 */
export const BaselineRealitySchema = z.object({
  /** Date of the baseline (from filename) */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  /** Full file path to the baseline */
  filePath: z.string().min(1),
  /** Raw markdown content */
  rawContent: z.string(),
  /** Parsed sections */
  sections: z.array(BaselineRealitySectionSchema),
  /** What exists in the codebase */
  whatExists: z.array(z.string()).optional(),
  /** What is in progress */
  whatInProgress: z.array(z.string()).optional(),
  /** Invalid assumptions identified */
  invalidAssumptions: z.array(z.string()).optional(),
  /** Items that must not be reworked */
  noRework: z.array(z.string()).optional(),
})

export type BaselineReality = z.infer<typeof BaselineRealitySchema>

/**
 * Schema for load baseline configuration.
 */
export const LoadBaselineConfigSchema = z.object({
  /** Directory containing baseline files (relative to project root or absolute) */
  baselinesDir: z.string().default(DEFAULT_BASELINES_DIR),
  /** Project root directory */
  projectRoot: z.string().optional(),
  /** Whether to require a baseline to exist (if false, returns null for missing baseline) */
  requireBaseline: z.boolean().default(false),
})

export type LoadBaselineConfig = z.infer<typeof LoadBaselineConfigSchema>

/**
 * Schema for load baseline result.
 */
export const LoadBaselineResultSchema = z.object({
  /** The loaded baseline reality, or null if not found and not required */
  baseline: BaselineRealitySchema.nullable(),
  /** Whether a baseline was successfully loaded */
  loaded: z.boolean(),
  /** Error message if baseline was required but not found */
  error: z.string().optional(),
})

export type LoadBaselineResult = z.infer<typeof LoadBaselineResultSchema>

/**
 * Finds all baseline files in the baselines directory.
 *
 * @param baselinesDir - Directory to search for baseline files
 * @returns Array of { filename, date } sorted by date descending (most recent first)
 */
export async function findBaselineFiles(
  baselinesDir: string,
): Promise<Array<{ filename: string; date: string }>> {
  try {
    const entries = await fs.readdir(baselinesDir, { withFileTypes: true })

    const baselineFiles = entries
      .filter(entry => entry.isFile())
      .map(entry => {
        const match = entry.name.match(BASELINE_FILENAME_PATTERN)
        if (!match) return null
        return { filename: entry.name, date: match[1] }
      })
      .filter((entry): entry is { filename: string; date: string } => entry !== null)

    // Sort by date descending (most recent first)
    return baselineFiles.sort((a, b) => b.date.localeCompare(a.date))
  } catch (error) {
    // Directory doesn't exist or is not readable
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

/**
 * Parses markdown content into sections.
 *
 * @param content - Raw markdown content
 * @returns Array of parsed sections
 */
export function parseMarkdownSections(content: string): BaselineRealitySection[] {
  const lines = content.split('\n')
  const sections: BaselineRealitySection[] = []
  let currentSection: BaselineRealitySection | null = null
  let currentContent: string[] = []

  for (const line of lines) {
    // Check for heading (## or ###)
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)

    if (headingMatch) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim()
        sections.push(currentSection)
      }

      // Start new section
      currentSection = {
        heading: headingMatch[2].trim(),
        content: '',
      }
      currentContent = []
    } else if (currentSection) {
      currentContent.push(line)
    }
  }

  // Save final section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim()
    sections.push(currentSection)
  }

  return sections
}

/**
 * Extracts list items from a section.
 *
 * @param section - Section to extract from
 * @returns Array of list item strings
 */
export function extractListItems(section: BaselineRealitySection): string[] {
  const items: string[] = []
  const lines = section.content.split('\n')

  for (const line of lines) {
    // Match list items (- or *)
    const listMatch = line.match(/^[-*]\s+(.+)$/)
    if (listMatch) {
      items.push(listMatch[1].trim())
    }
  }

  return items
}

/**
 * Parses a baseline reality markdown file.
 *
 * @param filePath - Path to the baseline file
 * @param date - Date from the filename
 * @returns Parsed baseline reality
 */
export async function parseBaselineFile(filePath: string, date: string): Promise<BaselineReality> {
  const rawContent = await fs.readFile(filePath, 'utf-8')
  const sections = parseMarkdownSections(rawContent)

  // Extract known sections by heading patterns
  const whatExistsSection = sections.find(
    s =>
      s.heading.toLowerCase().includes('what exists') || s.heading.toLowerCase().includes('exists'),
  )

  const whatInProgressSection = sections.find(
    s =>
      s.heading.toLowerCase().includes('in progress') ||
      s.heading.toLowerCase().includes('in-progress'),
  )

  const invalidAssumptionsSection = sections.find(
    s =>
      s.heading.toLowerCase().includes('invalid') || s.heading.toLowerCase().includes('assumption'),
  )

  const noReworkSection = sections.find(
    s =>
      s.heading.toLowerCase().includes('no rework') || s.heading.toLowerCase().includes('rework'),
  )

  const baseline: BaselineReality = {
    date,
    filePath,
    rawContent,
    sections,
    whatExists: whatExistsSection ? extractListItems(whatExistsSection) : undefined,
    whatInProgress: whatInProgressSection ? extractListItems(whatInProgressSection) : undefined,
    invalidAssumptions: invalidAssumptionsSection
      ? extractListItems(invalidAssumptionsSection)
      : undefined,
    noRework: noReworkSection ? extractListItems(noReworkSection) : undefined,
  }

  return BaselineRealitySchema.parse(baseline)
}

/**
 * Loads the most recent baseline reality file.
 *
 * @param config - Configuration options
 * @returns Load result with baseline or error
 */
export async function loadMostRecentBaseline(
  config: Partial<LoadBaselineConfig> = {},
): Promise<LoadBaselineResult> {
  const fullConfig = LoadBaselineConfigSchema.parse(config)

  // Resolve baselines directory
  let baselinesDir = fullConfig.baselinesDir
  if (!path.isAbsolute(baselinesDir) && fullConfig.projectRoot) {
    baselinesDir = path.join(fullConfig.projectRoot, baselinesDir)
  }

  // Find baseline files
  const baselineFiles = await findBaselineFiles(baselinesDir)

  if (baselineFiles.length === 0) {
    if (fullConfig.requireBaseline) {
      return {
        baseline: null,
        loaded: false,
        error: `No baseline reality files found in ${baselinesDir}`,
      }
    }
    return { baseline: null, loaded: false }
  }

  // Load the most recent baseline
  const mostRecent = baselineFiles[0]
  const filePath = path.join(baselinesDir, mostRecent.filename)

  try {
    const baseline = await parseBaselineFile(filePath, mostRecent.date)
    return { baseline, loaded: true }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error parsing baseline file'
    if (fullConfig.requireBaseline) {
      return {
        baseline: null,
        loaded: false,
        error: `Failed to parse baseline file: ${errorMessage}`,
      }
    }
    return { baseline: null, loaded: false }
  }
}

/**
 * Extended graph state with baseline reality.
 * Used by downstream nodes that consume baseline data.
 */
export interface GraphStateWithBaseline extends GraphState {
  /** The loaded baseline reality */
  baselineReality?: BaselineReality | null
  /** Whether a baseline was successfully loaded */
  baselineLoaded?: boolean
}

/**
 * Load Baseline Reality node implementation.
 *
 * Reads the most recent BASELINE-REALITY-<date>.md and adds it to graph state.
 * Uses the tool preset (lower retries, shorter timeout) since this is a file I/O operation.
 *
 * @param state - Current graph state
 * @returns Partial state update with baseline reality
 */
export const loadBaselineRealityNode = createToolNode(
  'load_baseline_reality',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_state: GraphState): Promise<Partial<GraphStateWithBaseline>> => {
    // Get project root from environment or use current working directory
    const projectRoot = process.env.PROJECT_ROOT || process.cwd()

    const result = await loadMostRecentBaseline({
      projectRoot,
      requireBaseline: false,
    })

    if (!result.loaded) {
      // No baseline found, but not required - continue with null
      return updateState({
        baselineReality: null,
        baselineLoaded: false,
      } as Partial<GraphStateWithBaseline>)
    }

    return updateState({
      baselineReality: result.baseline,
      baselineLoaded: true,
    } as Partial<GraphStateWithBaseline>)
  },
)

/**
 * Creates a load baseline reality node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createLoadBaselineNode(config: Partial<LoadBaselineConfig> = {}) {
  return createToolNode(
    'load_baseline_reality',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_state: GraphState): Promise<Partial<GraphStateWithBaseline>> => {
      const result = await loadMostRecentBaseline(config)

      if (!result.loaded) {
        if (result.error) {
          // Required baseline not found - this is an error condition
          // The node factory will handle error capture
          throw new Error(result.error)
        }

        return updateState({
          baselineReality: null,
          baselineLoaded: false,
        } as Partial<GraphStateWithBaseline>)
      }

      return updateState({
        baselineReality: result.baseline,
        baselineLoaded: true,
      } as Partial<GraphStateWithBaseline>)
    },
  )
}
