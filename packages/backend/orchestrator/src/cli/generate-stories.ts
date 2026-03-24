#!/usr/bin/env tsx
/**
 * generate-stories CLI
 *
 * Runs the story-generation LangGraph for a given plan slug.
 * Wires production adapters for plan loading, story ID generation, and KB writing.
 *
 * AC-3: CLI entry point that calls the story-generation graph
 * AC-4: --plan-slug <slug> argument, --help, exit code 1 on error
 * AC-5: Structured stdout output (plan_slug, stories_written, phase, errors)
 * AC-8: Injectable adapters wired at CLI level (documented injection points)
 *
 * Usage:
 *   npx tsx packages/backend/orchestrator/src/cli/generate-stories.ts --plan-slug <slug>
 *   npx tsx packages/backend/orchestrator/src/cli/generate-stories.ts --help
 *
 * Environment:
 *   MCP_KB_URL - Knowledge base MCP server URL (required for production use)
 *
 * INJECTION POINTS:
 *   kbGetPlan     - createPlanLoaderAdapter(kbGetPlan)
 *   kbListStories - createStoryIdGeneratorAdapter(kbListStories)
 *   kbIngestStory - createKbWriterAdapter(kbIngestStory, kbUpdatePlan)
 *   kbUpdatePlan  - (same as above)
 *
 * @see APRS-5030 AC-3, AC-4, AC-5, AC-8
 */

import { logger } from '@repo/logger'
import { createStoryGenerationGraph } from '../graphs/story-generation.js'
import { createPlanLoaderAdapter } from '../adapters/story-generation/plan-loader-adapter.js'
import { createStoryIdGeneratorAdapter } from '../adapters/story-generation/story-id-generator.js'
import { createKbWriterAdapter } from '../adapters/story-generation/kb-writer-adapter.js'
import type { KbGetPlanFn } from '../adapters/story-generation/plan-loader-adapter.js'
import type { KbListStoriesFn } from '../adapters/story-generation/story-id-generator.js'
import type {
  KbIngestStoryFn,
  KbUpdatePlanFn,
} from '../adapters/story-generation/kb-writer-adapter.js'

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(args: string[]): { planSlug?: string; help: boolean } {
  const result: { planSlug?: string; help: boolean } = { help: false }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      result.help = true
    } else if (arg === '--plan-slug' && args[i + 1]) {
      result.planSlug = args[i + 1]
      i++ // skip value
    }
  }

  return result
}

function printHelp(): void {
  process.stdout.write(`
generate-stories — Run the story-generation LangGraph for a given plan slug

USAGE
  npx tsx generate-stories.ts --plan-slug <slug>

OPTIONS
  --plan-slug <slug>   Plan slug to generate stories for (required).
  --help, -h           Print this help message.

ENVIRONMENT
  MCP_KB_URL           Knowledge base MCP server URL. Required for production use.
                       Example: http://localhost:3002

OUTPUT
  [generate-stories] plan_slug: <slug>
  [generate-stories] generation_phase: <phase>
  [generate-stories] stories_written: <n>
  [generate-stories] COMPLETE | FAILED: <reason>

EXIT CODES
  0   Graph completed successfully.
  1   Error: plan not found, KB unavailable, or graph failure.

`)
}

// ============================================================================
// Stub Implementations (used until MCP client is wired)
// ============================================================================

/**
 * INJECTION POINT: kbGetPlan
 * Replace with actual MCP client call to kb_get_plan.
 */
const stubKbGetPlan: KbGetPlanFn = async input => {
  logger.warn('generate-stories: using stub kbGetPlan — replace with MCP client', {
    plan_slug: input.plan_slug,
  })
  process.stdout.write(`[generate-stories] WARN: stub kbGetPlan called for ${input.plan_slug}\n`)
  return null
}

/**
 * INJECTION POINT: kbListStories
 * Replace with actual MCP client call to kb_list_stories.
 */
const stubKbListStories: KbListStoriesFn = async _input => {
  logger.warn('generate-stories: using stub kbListStories — replace with MCP client')
  return []
}

/**
 * INJECTION POINT: kbIngestStory
 * Replace with actual MCP client call to kb_ingest_story_from_yaml.
 */
const stubKbIngestStory: KbIngestStoryFn = async input => {
  logger.warn('generate-stories: using stub kbIngestStory — replace with MCP client', {
    story_id: input.story_id,
  })
  return { story_id: input.story_id }
}

/**
 * INJECTION POINT: kbUpdatePlan
 * Replace with actual MCP client call to kb_update_plan.
 */
const stubKbUpdatePlan: KbUpdatePlanFn = async input => {
  logger.warn('generate-stories: using stub kbUpdatePlan — replace with MCP client', {
    plan_slug: input.plan_slug,
  })
  return { plan_slug: input.plan_slug }
}

// ============================================================================
// Generation Logic
// ============================================================================

/**
 * Runs the story-generation graph for the given plan slug.
 *
 * AC-3: Calls createStoryGenerationGraph with production adapters.
 * AC-5: Structured stdout output.
 */
async function generateStories(planSlug: string): Promise<void> {
  logger.info('generate-stories: starting', { planSlug })
  process.stdout.write(`[generate-stories] plan_slug: ${planSlug}\n`)

  // Wire production adapters
  const planLoader = createPlanLoaderAdapter(stubKbGetPlan)
  const storyIdGenerator = createStoryIdGeneratorAdapter(stubKbListStories)
  const kbWriter = createKbWriterAdapter(stubKbIngestStory, stubKbUpdatePlan)

  const graph = createStoryGenerationGraph({
    planLoader,
    storyIdGenerator,
    kbWriter,
  })

  process.stdout.write(`[generate-stories] running graph...\n`)

  const result = await graph.invoke({ planSlug })

  process.stdout.write(
    `[generate-stories] generation_phase: ${result.generationPhase}\n` +
      `[generate-stories] stories_written: ${result.writeResult?.storiesWritten ?? 0}\n` +
      `[generate-stories] stories_failed: ${result.writeResult?.storiesFailed ?? 0}\n` +
      `[generate-stories] plan_status_updated: ${result.writeResult?.planStatusUpdated ?? false}\n`,
  )

  if (result.errors.length > 0) {
    process.stdout.write(`[generate-stories] errors: ${result.errors.join('; ')}\n`)
  }

  if (result.generationPhase === 'error') {
    process.stdout.write(
      `[generate-stories] FAILED: generation_phase=error, errors=${result.errors.join('; ')}\n`,
    )
    logger.error('generate-stories: graph ended in error phase', {
      planSlug,
      errors: result.errors,
    })
    process.exitCode = 1
    return
  }

  process.stdout.write(`[generate-stories] COMPLETE\n`)
  logger.info('generate-stories: complete', {
    planSlug,
    storiesWritten: result.writeResult?.storiesWritten ?? 0,
    generationPhase: result.generationPhase,
  })
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const parsed = parseArgs(args)

  if (parsed.help) {
    printHelp()
    return
  }

  if (!parsed.planSlug) {
    process.stderr.write('Error: --plan-slug <slug> is required\n')
    printHelp()
    process.exitCode = 1
    return
  }

  try {
    await generateStories(parsed.planSlug)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('generate-stories: fatal error', { error: message })
    process.stderr.write(`Error: ${message}\n`)
    process.exitCode = 1
  }
}

main().catch(error => {
  process.stderr.write(`Unhandled error: ${String(error)}\n`)
  process.exitCode = 1
})
