/**
 * story_enricher_agent Node (v2) — AGENTIC
 *
 * The most important new node. Produces HIGH-SPECIFICITY stories with:
 *   - File references
 *   - Function names
 *   - Implementation hints
 *   - Scope boundaries (inScope / outOfScope)
 *   - AC-to-flow-step traceability
 *
 * Each story is enriched independently. Postconditions checked per story.
 * If any stories fail AND retryCount < maxEnricherRetries: phase stays
 * 'story_enricher' to trigger a retry with failure feedback.
 *
 * Token usage tracked and appended to state.tokenUsage.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  FlowScoutResult,
  EnrichedStory,
  StoryPostconditionResult,
  TokenUsage,
  StoryGenerationV2State,
} from '../../state/story-generation-v2-state.js'
import type { GeneratedStory } from '../../state/story-generation-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export type LlmEnrichment = {
  relevantFiles: string[]
  relevantFunctions: string[]
  implementationHints: string[]
  scopeBoundary: { inScope: string[]; outOfScope: string[] }
  acceptance_criteria: string[]
  subtasks: string[]
  acFlowTraceability: Array<{ acIndex: number; flowStepRef: string }>
  inputTokens: number
  outputTokens: number
}

export type EnricherLlmAdapterFn = (prompt: string) => Promise<LlmEnrichment>

// ============================================================================
// Config Schema
// ============================================================================

export const StoryEnricherConfigSchema = z.object({
  llmAdapter: z.function().optional(),
})

export type StoryEnricherConfig = z.infer<typeof StoryEnricherConfigSchema>

// ============================================================================
// Pure Functions (exported for unit testability)
// ============================================================================

/**
 * Build the enrichment prompt for a single story.
 * Includes scout result and previous failures for retry feedback.
 */
export function buildEnrichmentPrompt(
  story: GeneratedStory,
  scoutResult: FlowScoutResult,
  failures: string[],
): string {
  const failureSection =
    failures.length > 0
      ? `\nPREVIOUS FAILURES TO FIX:\n${failures.map(f => `- ${f}`).join('\n')}\n`
      : ''

  const filesSection =
    scoutResult.relevantFiles.length > 0
      ? scoutResult.relevantFiles.join('\n')
      : 'No files found in codebase search'

  const functionsSection =
    scoutResult.relevantFunctions.length > 0
      ? scoutResult.relevantFunctions.map(f => `${f.file}: ${f.name}()`).join('\n')
      : 'No existing functions found'

  const existsSection =
    scoutResult.alreadyExists.length > 0
      ? scoutResult.alreadyExists.join('\n')
      : 'Nothing found yet'

  const needsSection =
    scoutResult.needsCreation.length > 0 ? scoutResult.needsCreation.join('\n') : 'To be determined'

  return `You are a senior engineer enriching a user story with implementation specifics.

STORY TO ENRICH:
Title: ${story.title}
Description: ${story.description}
Parent flow: ${story.parent_flow_id}
Flow step reference: ${story.flow_step_reference}

CURRENT ACCEPTANCE CRITERIA:
${story.acceptance_criteria.map((ac, i) => `${i}. ${ac}`).join('\n')}

CODEBASE CONTEXT:
Relevant files:
${filesSection}

Existing functions:
${functionsSection}

Already exists in codebase:
${existsSection}

Needs to be created:
${needsSection}

Existing patterns: ${scoutResult.existingPatterns.join(', ') || 'none documented'}
${failureSection}
POSTCONDITIONS YOUR RESPONSE MUST SATISFY:
1. acceptance_criteria must have >= 2 items, each referencing a specific file or function
2. acFlowTraceability must be non-empty (map each AC to a flow step)
3. relevantFiles must be non-empty (list actual files)
4. subtasks must have >= 1 item with a file reference (e.g. "Update src/foo.ts: addBar()")
5. scopeBoundary.inScope must be non-empty
6. scopeBoundary.outOfScope must be non-empty

OUTPUT FORMAT (JSON):
{
  "relevantFiles": ["<file paths>"],
  "relevantFunctions": ["<file.ts: functionName()>"],
  "implementationHints": ["<pattern to follow or gotcha>"],
  "scopeBoundary": {
    "inScope": ["<what IS in scope>"],
    "outOfScope": ["<what is NOT in scope>"]
  },
  "acceptance_criteria": ["<enriched AC with code references>"],
  "subtasks": ["<subtask with file name e.g. Update src/foo.ts: addBar()>"],
  "acFlowTraceability": [
    { "acIndex": 0, "flowStepRef": "${story.parent_flow_id}/step-1" }
  ]
}

Return ONLY valid JSON. No explanation outside JSON.`
}

/**
 * Merge LLM enrichment output into an EnrichedStory.
 */
export function mergeEnrichment(
  outline: GeneratedStory,
  enrichment: LlmEnrichment,
  _scoutResult: FlowScoutResult,
): EnrichedStory {
  return {
    ...outline,
    acceptance_criteria:
      enrichment.acceptance_criteria.length > 0
        ? enrichment.acceptance_criteria
        : outline.acceptance_criteria,
    subtasks: enrichment.subtasks.length > 0 ? enrichment.subtasks : outline.subtasks,
    relevantFiles: enrichment.relevantFiles,
    relevantFunctions: enrichment.relevantFunctions,
    implementationHints: enrichment.implementationHints,
    scopeBoundary: enrichment.scopeBoundary,
    acFlowTraceability: enrichment.acFlowTraceability,
    postconditionsPassed: false, // will be set after postcondition check
    enrichmentFailures: [],
  }
}

/**
 * Check postconditions for a single enriched story.
 * Returns a StoryPostconditionResult indicating pass/fail with details.
 */
export function checkStoryPostconditions(story: EnrichedStory): StoryPostconditionResult {
  const failures: Array<{ check: string; reason: string }> = []

  // 1. AC count >= 2
  if (story.acceptance_criteria.length < 2) {
    failures.push({
      check: 'ac_count',
      reason: `Expected >= 2 acceptance criteria, got ${story.acceptance_criteria.length}`,
    })
  }

  // 2. acFlowTraceability non-empty
  if (story.acFlowTraceability.length === 0) {
    failures.push({
      check: 'ac_traceability',
      reason: 'acFlowTraceability is empty — each AC must reference a flow step',
    })
  }

  // 3. relevantFiles non-empty
  if (story.relevantFiles.length === 0) {
    failures.push({
      check: 'relevant_files',
      reason: 'relevantFiles is empty — must reference at least one file',
    })
  }

  // 4. At least 1 subtask with a file reference
  const hasFileRefInSubtask = story.subtasks.some(
    s => s.includes('.ts') || s.includes('.js') || s.includes('src/') || s.includes(':'),
  )
  if (!hasFileRefInSubtask) {
    failures.push({
      check: 'subtask_file_ref',
      reason: 'No subtask references a specific file (e.g. "Update src/foo.ts: addBar()")',
    })
  }

  // 5. scopeBoundary.inScope non-empty
  if (story.scopeBoundary.inScope.length === 0) {
    failures.push({
      check: 'scope_in',
      reason: 'scopeBoundary.inScope is empty',
    })
  }

  // 6. scopeBoundary.outOfScope non-empty
  if (story.scopeBoundary.outOfScope.length === 0) {
    failures.push({
      check: 'scope_out',
      reason: 'scopeBoundary.outOfScope is empty',
    })
  }

  return {
    storyTitle: story.title,
    passed: failures.length === 0,
    failures,
  }
}

/**
 * Create a passthrough enriched story when no LLM adapter is available.
 * Adds empty enrichment fields so the story fits EnrichedStory shape.
 * postconditionsPassed is set to true to bypass checks in no-adapter mode.
 */
function toEnrichedStoryNoOp(outline: GeneratedStory): EnrichedStory {
  return {
    ...outline,
    relevantFiles: [],
    relevantFunctions: [],
    implementationHints: [],
    scopeBoundary: { inScope: [], outOfScope: [] },
    acFlowTraceability: [],
    postconditionsPassed: true, // skip postcondition checks when no adapter
    enrichmentFailures: [],
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the story_enricher_agent LangGraph node (v2).
 *
 * Agentic: enriches each story with file refs, function names, impl hints.
 * Postcondition-checked per story.
 * If failures AND retryCount < maxEnricherRetries: phase stays 'story_enricher'.
 * Otherwise: phase advances to 'dependency_wirer'.
 *
 * Returns: { enrichedStories, tokenUsage, enricherRetryCount, generationV2Phase }
 */
export function createStoryEnricherAgentNode(
  config: {
    llmAdapter?: EnricherLlmAdapterFn
  } = {},
) {
  return async (state: StoryGenerationV2State): Promise<Partial<StoryGenerationV2State>> => {
    try {
      logger.info('story_enricher_agent: starting', {
        planSlug: state.planSlug,
        storyCount: state.storyOutlines.length,
        retryCount: state.enricherRetryCount,
        hasLlmAdapter: !!config.llmAdapter,
      })

      if (!config.llmAdapter) {
        // No adapter — passthrough with empty enrichment fields
        const enrichedStories = state.storyOutlines.map(toEnrichedStoryNoOp)
        return {
          enrichedStories,
          generationV2Phase: 'dependency_wirer',
        }
      }

      const scoutMap = new Map(state.flowScoutResults.map(r => [r.flowId, r]))
      const newTokenUsage: TokenUsage[] = []
      const enrichedStories: EnrichedStory[] = []

      // On retry: build a lookup of previously enriched stories that passed
      // so we can skip re-enriching them.
      const prevPassedMap = new Map<string, EnrichedStory>()
      if (state.enricherRetryCount > 0) {
        state.enrichedStories
          .filter(s => s.postconditionsPassed)
          .forEach(s => prevPassedMap.set(s.title, s))
      }

      for (const story of state.storyOutlines) {
        // On retry: skip stories that already passed postconditions
        if (state.enricherRetryCount > 0) {
          const prevPassed = prevPassedMap.get(story.title)
          if (prevPassed) {
            enrichedStories.push(prevPassed)
            continue
          }
        }

        // Find the previous failed enrichment for this story (for retry feedback)
        const prevFailed = state.enrichedStories.find(
          e => e.title === story.title && !e.postconditionsPassed,
        )
        const previousFailures = prevFailed?.enrichmentFailures ?? []

        const scout = scoutMap.get(story.parent_flow_id) ?? {
          flowId: story.parent_flow_id,
          relevantFiles: [],
          relevantFunctions: [],
          existingPatterns: [],
          alreadyExists: [],
          needsCreation: [],
        }

        const prompt = buildEnrichmentPrompt(story, scout, previousFailures)

        let enriched: EnrichedStory

        const enrichment = await config.llmAdapter(prompt)

        newTokenUsage.push({
          nodeId: 'story_enricher_agent',
          inputTokens: enrichment.inputTokens,
          outputTokens: enrichment.outputTokens,
        })

        enriched = mergeEnrichment(story, enrichment, scout)

        // Check postconditions
        const postconditionResult = checkStoryPostconditions(enriched)
        enriched.postconditionsPassed = postconditionResult.passed
        enriched.enrichmentFailures = postconditionResult.failures.map(
          f => `${f.check}: ${f.reason}`,
        )

        logger.info('story_enricher_agent: story enriched', {
          storyTitle: story.title,
          passed: postconditionResult.passed,
          failureCount: postconditionResult.failures.length,
        })

        enrichedStories.push(enriched)
      }

      const anyFailed = enrichedStories.some(s => !s.postconditionsPassed)
      const newRetryCount = state.enricherRetryCount + (anyFailed ? 1 : 0)

      // Decide next phase
      let nextPhase: StoryGenerationV2State['generationV2Phase']
      if (anyFailed && newRetryCount <= state.maxEnricherRetries) {
        logger.warn('story_enricher_agent: some stories failed postconditions, will retry', {
          planSlug: state.planSlug,
          retryCount: newRetryCount,
          maxRetries: state.maxEnricherRetries,
          failedCount: enrichedStories.filter(s => !s.postconditionsPassed).length,
        })
        nextPhase = 'story_enricher'
      } else {
        if (anyFailed) {
          logger.warn('story_enricher_agent: max retries reached, proceeding with failures', {
            planSlug: state.planSlug,
            failedCount: enrichedStories.filter(s => !s.postconditionsPassed).length,
          })
        }
        nextPhase = 'dependency_wirer'
      }

      logger.info('story_enricher_agent: complete', {
        planSlug: state.planSlug,
        enrichedCount: enrichedStories.length,
        passedCount: enrichedStories.filter(s => s.postconditionsPassed).length,
        nextPhase,
      })

      return {
        enrichedStories,
        tokenUsage: newTokenUsage,
        enricherRetryCount: newRetryCount,
        generationV2Phase: nextPhase,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('story_enricher_agent: unexpected error', { err, planSlug: state.planSlug })
      return {
        generationV2Phase: 'error',
        errors: [`story_enricher_agent failed: ${message}`],
      }
    }
  }
}
