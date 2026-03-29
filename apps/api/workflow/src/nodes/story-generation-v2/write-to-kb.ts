/**
 * write_to_kb Node (v2) — DETERMINISTIC
 *
 * Writes enriched stories (with extra context fields) to the KB.
 * Logs total token usage before writing.
 * Uses injectable adapters for KB write and token logging.
 *
 * Returns: { writeResult, generationV2Phase: 'complete' | 'error' }
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  EnrichedStory,
  TokenUsage,
  WriteResultV2,
  StoryGenerationV2State,
} from '../../state/story-generation-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Injectable KB writer for enriched stories.
 * Default: no-op stub returning success.
 */
export type KbWriterFn = (
  stories: EnrichedStory[],
  planSlug: string,
) => Promise<{
  storiesWritten: number
  storiesFailed: number
  errors: string[]
}>

/**
 * Injectable token logger.
 * Called once before writing to log aggregate token usage.
 */
export type TokenLoggerFn = (
  planSlug: string,
  phase: string,
  inputTokens: number,
  outputTokens: number,
) => Promise<void>

/**
 * Injectable story ID generator.
 * Returns generated story IDs for a given prefix and count.
 */
export type StoryIdGeneratorFn = (prefix: string, index: number) => string

// ============================================================================
// Config Schema
// ============================================================================

export const WriteToKbV2ConfigSchema = z.object({
  kbWriter: z.function().optional(),
  tokenLogger: z.function().optional(),
  storyIdGenerator: z.function().optional(),
})

export type WriteToKbV2Config = z.infer<typeof WriteToKbV2ConfigSchema>

// ============================================================================
// Default No-Op Implementations
// ============================================================================

/**
 * Default no-op KB writer. Returns success for all stories.
 */
export async function defaultKbWriterFn(
  stories: EnrichedStory[],
  _planSlug: string,
): Promise<{ storiesWritten: number; storiesFailed: number; errors: string[] }> {
  return {
    storiesWritten: stories.length,
    storiesFailed: 0,
    errors: [],
  }
}

/**
 * Default no-op token logger. Does nothing.
 */
export async function defaultTokenLoggerFn(
  _planSlug: string,
  _phase: string,
  _inputTokens: number,
  _outputTokens: number,
): Promise<void> {
  // no-op
}

/**
 * Default story ID generator. Sequential with prefix and step=10.
 */
export function defaultStoryIdGenerator(prefix: string, index: number): string {
  const startSequence = 1010
  const step = 10
  return `${prefix}-${startSequence + index * step}`
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Aggregate token usage from state.tokenUsage.
 */
export function aggregateTokenUsage(tokenUsage: TokenUsage[]): {
  totalInput: number
  totalOutput: number
  byNode: Record<string, { input: number; output: number }>
} {
  const byNode: Record<string, { input: number; output: number }> = {}
  let totalInput = 0
  let totalOutput = 0

  tokenUsage.forEach(t => {
    totalInput += t.inputTokens
    totalOutput += t.outputTokens
    const existing = byNode[t.nodeId] ?? { input: 0, output: 0 }
    byNode[t.nodeId] = {
      input: existing.input + t.inputTokens,
      output: existing.output + t.outputTokens,
    }
  })

  return { totalInput, totalOutput, byNode }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the write_to_kb_v2 LangGraph node.
 *
 * Before writing: logs total token usage via tokenLogger.
 * Writes enriched stories via kbWriter.
 * On full success: generationV2Phase='complete'
 * On any failure: generationV2Phase='error'
 */
export function createWriteToKbV2Node(
  config: {
    kbWriter?: KbWriterFn
    tokenLogger?: TokenLoggerFn
    storyIdGenerator?: StoryIdGeneratorFn
  } = {},
) {
  const kbWriter = config.kbWriter ?? defaultKbWriterFn
  const tokenLogger = config.tokenLogger ?? defaultTokenLoggerFn

  return async (state: StoryGenerationV2State): Promise<Partial<StoryGenerationV2State>> => {
    try {
      const stories = state.orderedStories

      logger.info('write_to_kb_v2: starting', {
        planSlug: state.planSlug,
        storyCount: stories.length,
        bakeOffVersion: state.bakeOffVersion,
      })

      // Log token totals before writing
      if (state.tokenUsage.length > 0) {
        const { totalInput, totalOutput, byNode } = aggregateTokenUsage(state.tokenUsage)

        logger.info('write_to_kb_v2: token usage summary', {
          planSlug: state.planSlug,
          totalInputTokens: totalInput,
          totalOutputTokens: totalOutput,
          byNode,
        })

        try {
          await tokenLogger(state.planSlug, 'story-generation-v2', totalInput, totalOutput)
        } catch (logErr) {
          logger.warn('write_to_kb_v2: token logger failed (non-fatal)', { logErr })
        }
      }

      // Empty stories → no-op success
      if (stories.length === 0) {
        logger.info('write_to_kb_v2: no stories to write', { planSlug: state.planSlug })
        return {
          writeResult: {
            storiesWritten: 0,
            storiesFailed: 0,
            errors: [],
          },
          generationV2Phase: 'complete',
        }
      }

      // Write to KB
      const result = await kbWriter(stories, state.planSlug)

      const writeResult: WriteResultV2 = {
        storiesWritten: result.storiesWritten,
        storiesFailed: result.storiesFailed,
        errors: result.errors,
      }

      logger.info('write_to_kb_v2: complete', {
        planSlug: state.planSlug,
        storiesWritten: result.storiesWritten,
        storiesFailed: result.storiesFailed,
      })

      if (result.storiesFailed > 0) {
        logger.error('write_to_kb_v2: partial failure', {
          planSlug: state.planSlug,
          storiesFailed: result.storiesFailed,
          errors: result.errors,
        })
        return {
          writeResult,
          generationV2Phase: 'error',
          errors: result.errors,
        }
      }

      return {
        writeResult,
        generationV2Phase: 'complete',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('write_to_kb_v2: unexpected error', { err, planSlug: state.planSlug })
      return {
        writeResult: {
          storiesWritten: 0,
          storiesFailed: 0,
          errors: [message],
        },
        generationV2Phase: 'error',
        errors: [`write_to_kb_v2 failed: ${message}`],
      }
    }
  }
}
