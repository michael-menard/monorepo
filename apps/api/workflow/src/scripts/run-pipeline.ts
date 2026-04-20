#!/usr/bin/env tsx
/**
 * Pipeline Orchestrator V2 — CLI Runner
 *
 * Assembles all real adapters and invokes the pipeline graph end-to-end.
 *
 * Usage:
 *   pnpm tsx src/scripts/run-pipeline.ts --plan <slug>
 *   pnpm tsx src/scripts/run-pipeline.ts --story <id> [--story <id2>]
 *   pnpm tsx src/scripts/run-pipeline.ts --plan <slug> --concurrency 2
 *   pnpm tsx src/scripts/run-pipeline.ts --continuous
 *   pnpm tsx src/scripts/run-pipeline.ts --help
 *
 * Environment Variables:
 *   MONOREPO_ROOT       — root path of the monorepo (default: detected from cwd)
 *   OLLAMA_BASE_URL     — Ollama server URL (default: http://localhost:11434)
 *   ANTHROPIC_API_KEY   — Anthropic API key for Claude models
 *   NOTI_SERVER_URL     — NOTI notifications server URL (default: http://localhost:3098)
 *   NOTI_HMAC_SECRET    — HMAC secret for NOTI event signing (optional)
 *   DEFAULT_BASE_BRANCH — git base branch for PRs (default: main)
 */

import 'dotenv/config'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { runPipelineSupervisor } from '../graphs/pipeline-supervisor.js'
import type { SupervisorConfig, SupervisorAdapters } from '../graphs/pipeline-supervisor.js'
import type { InputMode } from '../state/pipeline-orchestrator-v2-state.js'
import { defaultShellExec } from '../nodes/pipeline-orchestrator/worktree-manager.js'
import { createNotiAdapter, createNoopNotiAdapter } from '../services/noti-adapter.js'
import { createLlmAdapterFactory } from '../services/llm-adapter-factory.js'
import { DEFAULT_MODEL_CONFIG } from '../config/model-config.js'
import {
  storyListAdapter,
  getNextPlanWithEligibleStories,
  getPlansWithoutStories,
  updatePlanStatus,
} from '../services/kb-adapters.js'

// ============================================================================
// CLI Argument Schema
// ============================================================================

export const CliArgsSchema = z.object({
  plan: z.string().optional(),
  story: z.array(z.string()).optional(),
  concurrency: z.number().int().min(1).default(1),
  continuous: z.boolean().default(false),
  generateStories: z.boolean().default(false),
  planStatus: z.string().default('draft,accepted'),
  dryRun: z.boolean().default(false),
  help: z.boolean().default(false),
})

type CliArgs = z.infer<typeof CliArgsSchema>

// ============================================================================
// Argument Parsing
// ============================================================================

export function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, unknown> = {}
  const stories: string[] = []
  let i = 0

  while (i < argv.length) {
    const arg = argv[i]

    if (arg === '--help' || arg === '-h') {
      args.help = true
      i++
      continue
    }

    if (arg === '--plan') {
      i++
      if (i >= argv.length) {
        process.stderr.write('Error: --plan requires a value\n')
        process.exit(1)
      }
      args.plan = argv[i]
      i++
      continue
    }

    if (arg === '--story') {
      i++
      if (i >= argv.length) {
        process.stderr.write('Error: --story requires a value\n')
        process.exit(1)
      }
      stories.push(argv[i])
      i++
      continue
    }

    if (arg === '--continuous') {
      args.continuous = true
      i++
      continue
    }

    if (arg === '--generate-stories') {
      args.generateStories = true
      i++
      continue
    }

    if (arg === '--plan-status') {
      i++
      if (i >= argv.length) {
        process.stderr.write('Error: --plan-status requires a value\n')
        process.exit(1)
      }
      args.planStatus = argv[i]
      i++
      continue
    }

    if (arg === '--dry-run') {
      args.dryRun = true
      i++
      continue
    }

    if (arg === '--concurrency') {
      i++
      if (i >= argv.length) {
        process.stderr.write('Error: --concurrency requires a value\n')
        process.exit(1)
      }
      const val = parseInt(argv[i], 10)
      if (isNaN(val) || val < 1) {
        process.stderr.write('Error: --concurrency must be a positive integer\n')
        process.exit(1)
      }
      args.concurrency = val
      i++
      continue
    }

    process.stderr.write(`Error: unknown argument: ${arg}\n`)
    printUsage()
    process.exit(1)
  }

  if (stories.length > 0) {
    args.story = stories
  }

  return CliArgsSchema.parse(args)
}

// ============================================================================
// Usage
// ============================================================================

function printUsage(): void {
  process.stdout.write(`
Pipeline Orchestrator V2 — CLI Runner

Usage:
  pnpm tsx src/scripts/run-pipeline.ts --plan <slug>
  pnpm tsx src/scripts/run-pipeline.ts --story <id> [--story <id2> ...]
  pnpm tsx src/scripts/run-pipeline.ts --continuous
  pnpm tsx src/scripts/run-pipeline.ts --generate-stories [--plan-status <statuses>]
  pnpm tsx src/scripts/run-pipeline.ts --help

Options:
  --plan <slug>              Process all ready stories from the given plan
  --story <id>               Process a specific story (repeatable)
  --continuous               Loop through all plans with eligible stories depth-first
  --generate-stories         Iterate plans without stories, run refinement + generation only
  --plan-status <statuses>   Comma-separated plan statuses to process (default: draft,accepted)
  --dry-run                  Verify imports/adapters (or preview --generate-stories batch)
  --concurrency <n>          Max concurrent stories (default: 1)
  --help, -h                 Show this help message

Continuous mode exhausts all eligible stories in a plan before moving to the
next plan. Plans are processed in priority order (P1 first). The loop exits
when no plans have eligible stories remaining or on SIGINT/SIGTERM.

Generate-stories mode iterates all plans matching --plan-status that have no
stories yet, runs refinement (for drafts) and story generation, then stops.
Human reviews stories before running --continuous for dev execution.

Environment Variables:
  MONOREPO_ROOT         Root path of the monorepo (default: auto-detected)
  OLLAMA_BASE_URL       Ollama server URL (default: http://localhost:11434)
  ANTHROPIC_API_KEY     Anthropic API key for Claude models
  NOTI_SERVER_URL       NOTI server URL (default: http://localhost:3098)
  NOTI_HMAC_SECRET      HMAC secret for NOTI event signing
  DEFAULT_BASE_BRANCH   Git base branch for PRs (default: main)
`)
}

// ============================================================================
// Monorepo Root Detection
// ============================================================================

async function detectMonorepoRoot(): Promise<string> {
  if (process.env.MONOREPO_ROOT) {
    return process.env.MONOREPO_ROOT
  }

  // Walk up from cwd looking for pnpm-workspace.yaml
  const { existsSync } = await import('fs')
  const { resolve, dirname } = await import('path')

  let dir = process.cwd()
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      return dir
    }
    dir = dirname(dir)
  }

  // Fallback
  return process.cwd()
}

// ============================================================================
// NOTI Adapter with Graceful Degradation
// ============================================================================

function buildNotiAdapter() {
  const notiServerUrl = process.env.NOTI_SERVER_URL
  const hmacSecret = process.env.NOTI_HMAC_SECRET

  if (!notiServerUrl) {
    logger.info('run-pipeline: no NOTI_SERVER_URL set, using noop adapter')
    return createNoopNotiAdapter()
  }

  logger.info('run-pipeline: connecting to NOTI server', { url: notiServerUrl })
  return createNotiAdapter({
    baseUrl: notiServerUrl,
    hmacSecret,
  })
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv.slice(2))

  if (cliArgs.help) {
    printUsage()
    process.exit(0)
  }

  // Validate that at least one mode is provided
  if (
    !cliArgs.continuous &&
    !cliArgs.generateStories &&
    !cliArgs.dryRun &&
    !cliArgs.plan &&
    (!cliArgs.story || cliArgs.story.length === 0)
  ) {
    process.stderr.write(
      'Error: must provide --plan <slug>, --story <id>, --continuous, --generate-stories, or --dry-run\n\n',
    )
    printUsage()
    process.exit(1)
  }

  // Validate that --continuous is not combined with --plan or --story
  if (cliArgs.continuous && (cliArgs.plan || (cliArgs.story && cliArgs.story.length > 0))) {
    process.stderr.write('Error: --continuous cannot be combined with --plan or --story\n\n')
    printUsage()
    process.exit(1)
  }

  // Validate that --generate-stories is not combined with --plan, --story, or --continuous
  if (
    cliArgs.generateStories &&
    (cliArgs.plan || (cliArgs.story && cliArgs.story.length > 0) || cliArgs.continuous)
  ) {
    process.stderr.write(
      'Error: --generate-stories cannot be combined with --plan, --story, or --continuous\n\n',
    )
    printUsage()
    process.exit(1)
  }

  // Validate that --plan-status requires --generate-stories
  if (cliArgs.planStatus !== 'draft,accepted' && !cliArgs.generateStories) {
    process.stderr.write('Error: --plan-status requires --generate-stories\n\n')
    printUsage()
    process.exit(1)
  }

  // Resolve configuration from environment
  const monorepoRoot = await detectMonorepoRoot()
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const defaultBaseBranch = process.env.DEFAULT_BASE_BRANCH ?? 'main'
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY

  // Build adapters
  const notiAdapter = buildNotiAdapter()
  const _llmFactory = createLlmAdapterFactory({
    ollamaBaseUrl,
    anthropicApiKey,
  })

  // Lazily import KB adapter builders to avoid env validation at module load
  const { buildKbAdapter, getStoryStateAdapter } = await import('../services/kb-adapters.js')

  // Build supervisor adapters
  const supervisorAdapters: SupervisorAdapters = {
    storyListAdapter,
    getStoryState: getStoryStateAdapter,
    kbAdapter: buildKbAdapter(),
    shellExec: defaultShellExec,
    eventEmitterAdapters: { notiAdapter },
  }

  // Generate-stories mode — iterate plans without stories, run refinement + generation
  if (cliArgs.generateStories) {
    const statuses = cliArgs.planStatus.split(',').map(s => s.trim())

    logger.info('run-pipeline: starting generate-stories mode', {
      statuses,
      dryRun: cliArgs.dryRun,
      monorepoRoot,
      ollamaBaseUrl,
      defaultBaseBranch,
      hasAnthropicKey: !!anthropicApiKey,
    })

    await runGenerateStoriesMode(statuses, cliArgs.dryRun, supervisorAdapters, {
      monorepoRoot,
      ollamaBaseUrl,
      defaultBaseBranch,
    })
    return
  }

  // Continuous mode — loop through all plans depth-first
  if (cliArgs.continuous) {
    logger.info('run-pipeline: starting continuous mode', {
      monorepoRoot,
      ollamaBaseUrl,
      defaultBaseBranch,
      hasAnthropicKey: !!anthropicApiKey,
    })

    await runContinuousMode(supervisorAdapters, {
      monorepoRoot,
      ollamaBaseUrl,
      defaultBaseBranch,
    })
    return
  }

  // Single-plan or single-story mode
  const inputMode: InputMode = cliArgs.plan ? 'plan' : 'story'
  const planSlug = cliArgs.plan ?? null
  const storyIds = cliArgs.story ?? []

  logger.info('run-pipeline: starting pipeline supervisor', {
    inputMode,
    planSlug,
    storyIds,
    concurrency: cliArgs.concurrency,
    monorepoRoot,
    ollamaBaseUrl,
    defaultBaseBranch,
    hasAnthropicKey: !!anthropicApiKey,
  })

  // Build supervisor config
  const supervisorConfig: SupervisorConfig = {
    inputMode,
    planSlug,
    storyIds,
    monorepoRoot,
    defaultBaseBranch,
    ollamaBaseUrl,
    requiredModel: DEFAULT_MODEL_CONFIG.requiredLocalModel,
    maxStories: 0,
    dryRun: cliArgs.dryRun,
    modelConfig: DEFAULT_MODEL_CONFIG,
  }

  try {
    logger.info('run-pipeline: invoking supervisor...')

    const result = await runPipelineSupervisor(supervisorConfig, supervisorAdapters)

    logger.info('run-pipeline: pipeline finished', {
      phase: result.finalPhase,
      completedCount: result.completed.length,
      blockedCount: result.blocked.length,
      errorCount: result.errors.length,
      durationMs: result.durationMs,
    })

    // Print summary to stdout for CLI consumers
    process.stdout.write('\n--- Pipeline Summary ---\n')
    process.stdout.write(`Phase: ${result.finalPhase}\n`)
    process.stdout.write(`Completed: ${result.completed.length}\n`)
    process.stdout.write(`Blocked: ${result.blocked.length}\n`)
    process.stdout.write(`Errors: ${result.errors.length}\n`)
    process.stdout.write(`Duration: ${(result.durationMs / 1000).toFixed(1)}s\n`)

    if (result.errors.length > 0) {
      process.stdout.write('\nErrors:\n')
      for (const err of result.errors) {
        process.stdout.write(`  - ${err}\n`)
      }
    }

    if (result.blocked.length > 0) {
      process.stdout.write('\nBlocked stories:\n')
      for (const id of result.blocked) {
        process.stdout.write(`  - ${id}\n`)
      }
    }

    // Exit code: 0 on pipeline_complete, 1 on stalled/error
    if (result.finalPhase === 'pipeline_stalled' || result.errors.length > 0) {
      process.exit(1)
    }

    process.exit(0)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    logger.error('run-pipeline: fatal error', { error: msg })
    process.stderr.write(`\nFatal error: ${msg}\n`)
    process.exit(1)
  }
}

// ============================================================================
// Continuous Mode
// ============================================================================

/**
 * Runs the pipeline in continuous mode: loops through all plans with eligible
 * stories, processing them depth-first (exhaust all eligible stories in one
 * plan before moving to the next).
 *
 * Plans are selected by priority (P1 first), then creation date.
 * The loop exits when no plans have eligible stories or on shutdown signal.
 */
async function runContinuousMode(
  supervisorAdapters: SupervisorAdapters,
  envConfig: {
    monorepoRoot: string
    ollamaBaseUrl: string
    defaultBaseBranch: string
  },
): Promise<void> {
  let totalCompleted = 0
  let totalBlocked = 0
  let totalErrors = 0
  let plansProcessed = 0
  const overallStart = Date.now()

  while (!shutdownRequested) {
    const planSlug = await getNextPlanWithEligibleStories()

    if (!planSlug) {
      logger.info('continuous: no more plans with eligible stories')
      break
    }

    plansProcessed++
    logger.info('continuous: processing plan', { planSlug, plansProcessed })

    const planStart = Date.now()

    try {
      const supervisorConfig: SupervisorConfig = {
        inputMode: 'plan',
        planSlug,
        storyIds: [],
        monorepoRoot: envConfig.monorepoRoot,
        defaultBaseBranch: envConfig.defaultBaseBranch,
        ollamaBaseUrl: envConfig.ollamaBaseUrl,
        requiredModel: DEFAULT_MODEL_CONFIG.requiredLocalModel,
        maxStories: 0,
        modelConfig: DEFAULT_MODEL_CONFIG,
      }

      const result = await runPipelineSupervisor(supervisorConfig, supervisorAdapters)

      const planDurationMs = Date.now() - planStart

      totalCompleted += result.completed.length
      totalBlocked += result.blocked.length
      totalErrors += result.errors.length

      logger.info('continuous: plan finished', {
        planSlug,
        completed: result.completed.length,
        blocked: result.blocked.length,
        errors: result.errors.length,
        phase: result.finalPhase,
        durationMs: planDurationMs,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const planDurationMs = Date.now() - planStart

      logger.error('continuous: plan failed with error', {
        planSlug,
        error: msg,
        durationMs: planDurationMs,
      })

      totalErrors++
      // Continue to next plan — don't let one plan failure stop the loop
    }
  }

  const overallDurationMs = Date.now() - overallStart

  // Print overall summary
  logger.info('continuous: all plans exhausted', {
    plansProcessed,
    totalCompleted,
    totalBlocked,
    totalErrors,
    durationMs: overallDurationMs,
    shutdownRequested,
  })

  process.stdout.write('\n--- Continuous Mode Summary ---\n')
  process.stdout.write(`Plans processed: ${plansProcessed}\n`)
  process.stdout.write(`Total completed: ${totalCompleted}\n`)
  process.stdout.write(`Total blocked: ${totalBlocked}\n`)
  process.stdout.write(`Total errors: ${totalErrors}\n`)
  process.stdout.write(`Duration: ${(overallDurationMs / 1000).toFixed(1)}s\n`)

  if (shutdownRequested) {
    process.stdout.write('Exited due to shutdown signal.\n')
  }

  process.exit(totalErrors > 0 ? 1 : 0)
}

// ============================================================================
// Generate Stories Mode
// ============================================================================

/**
 * Iterates all plans matching the given statuses that have no stories,
 * runs refinement (for drafts) and story generation via the supervisor,
 * then updates plan status. Stops after generation — no dev/review/QA.
 *
 * Circuit breaker: aborts after 3 consecutive failures.
 */
export async function runGenerateStoriesMode(
  statuses: string[],
  dryRun: boolean,
  supervisorAdapters: SupervisorAdapters,
  envConfig: {
    monorepoRoot: string
    ollamaBaseUrl: string
    defaultBaseBranch: string
  },
): Promise<void> {
  const plans = await getPlansWithoutStories(statuses)

  if (plans.length === 0) {
    logger.info('generate-stories: no plans without stories found', { statuses })
    process.stdout.write('\nNo plans without stories found.\n')
    process.exit(0)
  }

  // Dry-run: list plans and exit
  if (dryRun) {
    logger.info('generate-stories: dry-run — listing plans', { count: plans.length })
    for (const plan of plans) {
      logger.info('generate-stories: would process', {
        planSlug: plan.planSlug,
        status: plan.status,
        priority: plan.priority,
        title: plan.title,
      })
    }
    process.stdout.write(`\n--- Dry Run ---\n`)
    process.stdout.write(`Plans to process: ${plans.length}\n`)
    for (const plan of plans) {
      process.stdout.write(
        `  ${plan.priority ?? '??'} ${plan.planSlug} [${plan.status}] — ${plan.title ?? '(no title)'}\n`,
      )
    }
    process.exit(0)
  }

  // Batch processing
  const overallStart = Date.now()
  let plansSucceeded = 0
  let plansFailed = 0
  let totalStoriesGenerated = 0
  let consecutiveFailures = 0
  const CIRCUIT_BREAKER_THRESHOLD = 3
  const errors: string[] = []

  logger.info('generate-stories: starting batch', { planCount: plans.length, statuses })

  for (let idx = 0; idx < plans.length; idx++) {
    if (shutdownRequested) {
      logger.info('generate-stories: shutdown requested, stopping batch')
      break
    }

    if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      logger.error('generate-stories: circuit breaker tripped — aborting batch', {
        consecutiveFailures,
        remaining: plans.length - idx,
      })
      errors.push(`Circuit breaker: ${consecutiveFailures} consecutive failures, aborting`)
      break
    }

    const plan = plans[idx]
    const planStart = Date.now()

    logger.info(`generate-stories: processing plan ${idx + 1}/${plans.length}`, {
      planSlug: plan.planSlug,
      status: plan.status,
      priority: plan.priority,
    })

    try {
      const supervisorConfig: SupervisorConfig = {
        inputMode: 'plan',
        planSlug: plan.planSlug,
        storyIds: [],
        monorepoRoot: envConfig.monorepoRoot,
        defaultBaseBranch: envConfig.defaultBaseBranch,
        ollamaBaseUrl: envConfig.ollamaBaseUrl,
        requiredModel: DEFAULT_MODEL_CONFIG.requiredLocalModel,
        maxStories: 0,
        dryRun: false,
        skipDevPhase: true,
        planStatus: plan.status,
        modelConfig: DEFAULT_MODEL_CONFIG,
      }

      const result = await runPipelineSupervisor(supervisorConfig, supervisorAdapters)
      const planDurationMs = Date.now() - planStart

      if (result.errors.length > 0) {
        logger.warn('generate-stories: supervisor returned errors', {
          planSlug: plan.planSlug,
          errors: result.errors,
          durationMs: planDurationMs,
        })
        errors.push(...result.errors.map(e => `${plan.planSlug}: ${e}`))
        plansFailed++
        consecutiveFailures++
        continue
      }

      // Verify stories were actually created before updating status
      const stories = await storyListAdapter(plan.planSlug)
      if (stories.length === 0) {
        logger.warn('generate-stories: supervisor succeeded but zero stories generated', {
          planSlug: plan.planSlug,
          durationMs: planDurationMs,
        })
        // Don't update status — stories-created should mean stories exist
        // Don't trip circuit breaker — this is plan-specific, not systemic
        plansSucceeded++ // supervisor didn't error, just nothing to generate
        consecutiveFailures = 0
        continue
      }

      // Update plan status
      if (plan.status === 'draft') {
        await updatePlanStatus(plan.planSlug, 'accepted')
      }
      await updatePlanStatus(plan.planSlug, 'stories-created')

      totalStoriesGenerated += stories.length
      plansSucceeded++
      consecutiveFailures = 0

      logger.info('generate-stories: plan complete', {
        planSlug: plan.planSlug,
        stories: stories.length,
        durationMs: planDurationMs,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const planDurationMs = Date.now() - planStart

      logger.error('generate-stories: plan failed', {
        planSlug: plan.planSlug,
        error: msg,
        durationMs: planDurationMs,
      })

      errors.push(`${plan.planSlug}: ${msg}`)
      plansFailed++
      consecutiveFailures++
    }
  }

  const overallDurationMs = Date.now() - overallStart

  // Print summary
  logger.info('generate-stories: batch complete', {
    plansProcessed: plansSucceeded + plansFailed,
    plansSucceeded,
    plansFailed,
    totalStoriesGenerated,
    durationMs: overallDurationMs,
  })

  process.stdout.write('\n--- Generate Stories Summary ---\n')
  process.stdout.write(`Plans processed: ${plansSucceeded + plansFailed}\n`)
  process.stdout.write(`Plans succeeded: ${plansSucceeded}\n`)
  process.stdout.write(`Plans failed: ${plansFailed}\n`)
  process.stdout.write(`Total stories generated: ${totalStoriesGenerated}\n`)
  process.stdout.write(`Duration: ${(overallDurationMs / 1000).toFixed(1)}s\n`)

  if (errors.length > 0) {
    process.stdout.write('\nErrors:\n')
    for (const err of errors) {
      process.stdout.write(`  - ${err}\n`)
    }
  }

  if (shutdownRequested) {
    process.stdout.write('Exited due to shutdown signal.\n')
  }

  process.exit(plansFailed > 0 ? 1 : 0)
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

let shutdownRequested = false

function handleShutdown(signal: string): void {
  if (shutdownRequested) {
    logger.warn('run-pipeline: forced shutdown')
    process.exit(1)
  }

  shutdownRequested = true
  logger.info('run-pipeline: shutdown requested', { signal })
  process.stdout.write(`\nReceived ${signal}, shutting down gracefully...\n`)

  // Give the pipeline a few seconds to wrap up current node
  setTimeout(() => {
    logger.warn('run-pipeline: shutdown timeout, forcing exit')
    process.exit(1)
  }, 10_000)
}

process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('SIGTERM', () => handleShutdown('SIGTERM'))

// ============================================================================
// Entry Point
// ============================================================================

main().catch(err => {
  const msg = err instanceof Error ? err.message : String(err)
  logger.error('run-pipeline: unhandled error', { error: msg })
  process.stderr.write(`\nUnhandled error: ${msg}\n`)
  process.exit(1)
})
