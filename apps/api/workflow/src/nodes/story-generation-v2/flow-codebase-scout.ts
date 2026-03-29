/**
 * flow_codebase_scout Node (v2) — DETERMINISTIC
 *
 * For each flow in state.flows, searches the codebase for relevant files and
 * patterns. This is the key differentiator from v1 — every flow gets a
 * codebase research pass before any LLM work begins.
 *
 * No LLM calls — purely deterministic codebase introspection.
 * Injectable adapters for searchCodebase and readFileSummary.
 * Falls back gracefully (empty results) if no adapters provided.
 *
 * After processing all flows: sets generationV2Phase='story_slicer'
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { Flow } from '../../state/plan-refinement-state.js'
import type {
  FlowScoutResult,
  StoryGenerationV2State,
} from '../../state/story-generation-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Injectable codebase search function.
 * Returns an array of file paths matching the given pattern/term.
 */
export type SearchCodebaseFn = (pattern: string) => Promise<string[]>

/**
 * Injectable file summary reader.
 * Returns a brief summary of what the file contains.
 */
export type ReadFileSummaryFn = (filePath: string) => Promise<string>

// ============================================================================
// Config Schema
// ============================================================================

export const FlowCodebaseScoutConfigSchema = z.object({
  searchCodebase: z.function().optional(),
  readFileSummary: z.function().optional(),
})

export type FlowCodebaseScoutConfig = z.infer<typeof FlowCodebaseScoutConfigSchema>

// ============================================================================
// Pure Functions (exported for unit testability)
// ============================================================================

/**
 * Extract search terms from a flow: key nouns and verbs from name, actor,
 * and step descriptions that are likely to correspond to code identifiers.
 */
export function extractSearchTerms(flow: Flow): string[] {
  const terms = new Set<string>()

  // From flow name — split on spaces, take nouns/verbs (3+ chars)
  flow.name
    .split(/\s+/)
    .filter(w => w.length >= 3)
    .forEach(w => terms.add(w.toLowerCase()))

  // From actor
  flow.actor
    .split(/\s+/)
    .filter(w => w.length >= 3)
    .forEach(w => terms.add(w.toLowerCase()))

  // From step descriptions — extract meaningful words
  flow.steps.forEach(step => {
    step.description
      .split(/[\s,.:;()]+/)
      .filter(w => w.length >= 4)
      .forEach(w => terms.add(w.toLowerCase()))
  })

  // Also add camelCase variants for common terms (helps with code searches)
  const camelTerms: string[] = []
  terms.forEach(term => {
    // Convert multi-word terms to camelCase search terms
    if (term.includes('-') || term.includes('_')) {
      const camel = term
        .split(/[-_]/)
        .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('')
      camelTerms.push(camel)
    }
  })
  camelTerms.forEach(t => terms.add(t))

  return Array.from(terms)
}

/**
 * Deduplicate and sort an array of file paths.
 */
function deduplicateFiles(allPaths: string[][]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  allPaths.flat().forEach(p => {
    if (!seen.has(p)) {
      seen.add(p)
      result.push(p)
    }
  })
  return result.sort()
}

/**
 * Extract function-like references from step descriptions.
 * Looks for patterns like "call createFoo()", "update handleBar", etc.
 */
export function extractFunctionHints(stepDescriptions: string[]): string[] {
  const hints: string[] = []
  const fnPattern = /\b([a-z][a-zA-Z0-9]+(?:Fn|Handler|Service|Manager|Helper|Utils?)?)\b/g

  stepDescriptions.forEach(desc => {
    const matches = desc.matchAll(fnPattern)
    for (const match of matches) {
      if (match[1].length >= 5) {
        hints.push(match[1])
      }
    }
  })

  return [...new Set(hints)]
}

/**
 * Build a FlowScoutResult from search results and step descriptions.
 */
export function buildFlowScoutResult(
  flowId: string,
  searchResults: string[][],
  stepDescriptions: string[],
): FlowScoutResult {
  const relevantFiles = deduplicateFiles(searchResults)
  const functionHints = extractFunctionHints(stepDescriptions)

  // Infer needs-creation vs already-exists from file presence
  const alreadyExists = relevantFiles.length > 0 ? [`Files found: ${relevantFiles.join(', ')}`] : []
  const needsCreation =
    relevantFiles.length === 0 ? ['No existing files found — may need new modules'] : []

  return {
    flowId,
    relevantFiles,
    relevantFunctions: functionHints.map(name => ({
      file: relevantFiles[0] ?? 'unknown',
      name,
    })),
    existingPatterns: [],
    alreadyExists,
    needsCreation,
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the flow_codebase_scout LangGraph node (v2).
 *
 * DETERMINISTIC — no LLM calls.
 * For each flow: extracts search terms → searches codebase → builds FlowScoutResult.
 * If no adapters: returns empty FlowScoutResult per flow (never fails hard).
 *
 * Returns: { flowScoutResults: [...new results], generationV2Phase: 'story_slicer' }
 */
export function createFlowCodebaseScoutNode(
  config: {
    searchCodebase?: SearchCodebaseFn
    readFileSummary?: ReadFileSummaryFn
  } = {},
) {
  return async (state: StoryGenerationV2State): Promise<Partial<StoryGenerationV2State>> => {
    try {
      logger.info('flow_codebase_scout: starting', {
        planSlug: state.planSlug,
        flowCount: state.flows.length,
      })

      const newScoutResults: FlowScoutResult[] = []

      for (const flow of state.flows) {
        logger.info('flow_codebase_scout: scouting flow', {
          flowId: flow.id,
          flowName: flow.name,
        })

        if (!config.searchCodebase) {
          // No adapter — return empty scout result
          newScoutResults.push({
            flowId: flow.id,
            relevantFiles: [],
            relevantFunctions: [],
            existingPatterns: [],
            alreadyExists: [],
            needsCreation: [],
          })
          continue
        }

        const searchTerms = extractSearchTerms(flow)
        const stepDescriptions = flow.steps.map(s => s.description)

        // Search codebase for each term (parallel)
        const searchResults = await Promise.all(
          searchTerms.map(term =>
            config.searchCodebase!(term).catch(err => {
              logger.warn('flow_codebase_scout: search failed for term', { term, err })
              return [] as string[]
            }),
          ),
        )

        const scoutResult = buildFlowScoutResult(flow.id, searchResults, stepDescriptions)

        logger.info('flow_codebase_scout: flow complete', {
          flowId: flow.id,
          filesFound: scoutResult.relevantFiles.length,
          functionsFound: scoutResult.relevantFunctions.length,
        })

        newScoutResults.push(scoutResult)
      }

      logger.info('flow_codebase_scout: all flows scouted', {
        planSlug: state.planSlug,
        scoutCount: newScoutResults.length,
      })

      return {
        flowScoutResults: newScoutResults,
        generationV2Phase: 'story_slicer',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('flow_codebase_scout: unexpected error', { err, planSlug: state.planSlug })
      // Non-fatal — proceed with empty results rather than blocking the pipeline
      return {
        flowScoutResults: state.flows.map(f => ({
          flowId: f.id,
          relevantFiles: [],
          relevantFunctions: [],
          existingPatterns: [],
          alreadyExists: [],
          needsCreation: [],
        })),
        generationV2Phase: 'story_slicer',
        warnings: [`flow_codebase_scout failed (proceeding with empty results): ${message}`],
      }
    }
  }
}
