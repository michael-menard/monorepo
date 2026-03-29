/**
 * story_scout Node (dev-implement-v2) — DETERMINISTIC
 *
 * Reads story from KB, searches codebase for relevant files referenced in
 * AC and subtasks. Produces StoryGroundingContext for the planner.
 *
 * Never fails hard — degrades gracefully when adapters are absent.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  StoryGroundingContext,
  DevImplementV2State,
} from '../../state/dev-implement-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export type KbStoryAdapterFn = (storyId: string) => Promise<{
  title: string
  acceptanceCriteria: string[]
  subtasks: string[]
  relatedStories?: Array<{ storyId: string; title: string; state: string }>
} | null>

export type CodebaseSearchFn = (terms: string[]) => Promise<{
  files: string[]
  functions: Array<{ file: string; name: string; signature?: string }>
  patterns: string[]
}>

// ============================================================================
// Config Schema
// ============================================================================

export const StoryScoutConfigSchema = z.object({
  kbAdapter: z.function().optional(),
  codebaseSearch: z.function().optional(),
})

export type StoryScoutConfig = {
  kbAdapter?: KbStoryAdapterFn
  codebaseSearch?: CodebaseSearchFn
}

// ============================================================================
// Exported Pure Functions
// ============================================================================

/**
 * Extracts search terms from acceptance criteria and subtasks.
 * Looks for noun phrases, file references, function names.
 */
export function extractSearchTerms(ac: string[]): string[] {
  const terms: string[] = []
  for (const text of ac) {
    // Extract quoted identifiers
    const quoted = text.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) ?? []
    // Extract camelCase/PascalCase identifiers
    const identifiers = text.match(/\b[a-zA-Z][a-zA-Z0-9]{2,}(?:[A-Z][a-zA-Z0-9]+)+\b/g) ?? []
    // Extract file-like patterns
    const fileRefs = text.match(/\b\w+\.(ts|tsx|js|jsx|sql|yaml|json)\b/g) ?? []
    terms.push(...quoted, ...identifiers, ...fileRefs)
  }
  // Deduplicate
  return [...new Set(terms)].slice(0, 20)
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the story_scout LangGraph node.
 *
 * DETERMINISTIC — no LLM calls. Reads story from KB, scouts codebase.
 * Returns StoryGroundingContext.
 */
export function createStoryScoutNode(config: StoryScoutConfig = {}) {
  return async (state: DevImplementV2State): Promise<Partial<DevImplementV2State>> => {
    const { storyId } = state

    logger.info(`story_scout: starting for story ${storyId}`, {
      hasKbAdapter: !!config.kbAdapter,
      hasCodebaseSearch: !!config.codebaseSearch,
    })

    let storyTitle = storyId
    let acceptanceCriteria: string[] = []
    let subtasks: string[] = []
    let relatedStories: StoryGroundingContext['relatedStories'] = []

    // Load story from KB
    if (config.kbAdapter) {
      try {
        const story = await config.kbAdapter(storyId)
        if (story) {
          storyTitle = story.title
          acceptanceCriteria = story.acceptanceCriteria
          subtasks = story.subtasks
          relatedStories = story.relatedStories ?? []
        } else {
          logger.warn(`story_scout: story ${storyId} not found in KB`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(`story_scout: KB adapter threw`, { error: msg })
      }
    }

    // Scout codebase
    let relevantFiles: string[] = []
    let relevantFunctions: StoryGroundingContext['relevantFunctions'] = []
    let existingPatterns: string[] = []

    if (config.codebaseSearch) {
      try {
        const terms = extractSearchTerms([...acceptanceCriteria, ...subtasks])
        if (terms.length > 0) {
          const result = await config.codebaseSearch(terms)
          relevantFiles = result.files
          relevantFunctions = result.functions
          existingPatterns = result.patterns
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(`story_scout: codebase search threw`, { error: msg })
      }
    }

    const groundingContext: StoryGroundingContext = {
      storyId,
      storyTitle,
      acceptanceCriteria,
      subtasks,
      relevantFiles,
      relevantFunctions,
      existingPatterns,
      relatedStories,
    }

    logger.info(`story_scout: complete`, {
      storyId,
      filesFound: relevantFiles.length,
      functionsFound: relevantFunctions.length,
    })

    return {
      storyGroundingContext: groundingContext,
      devImplementV2Phase: 'implementation_planner',
    }
  }
}
