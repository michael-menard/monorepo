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
import { storyListAdapter, getNextPlanWithEligibleStories } from '../services/kb-adapters.js'

// ============================================================================
// CLI Argument Schema
// ============================================================================

const CliArgsSchema = z.object({
  plan: z.string().optional(),
  story: z.array(z.string()).optional(),
  concurrency: z.number().int().min(1).default(1),
  continuous: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  help: z.boolean().default(false),
})

type CliArgs = z.infer<typeof CliArgsSchema>

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(argv: string[]): CliArgs {
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
  pnpm tsx src/scripts/run-pipeline.ts --help

Options:
  --plan <slug>         Process all ready stories from the given plan
  --story <id>          Process a specific story (repeatable)
  --continuous          Loop through all plans with eligible stories depth-first
  --dry-run             Verify all imports, adapters, and DB connections without processing
  --concurrency <n>     Max concurrent stories (default: 1)
  --help, -h            Show this help message

Continuous mode exhausts all eligible stories in a plan before moving to the
next plan. Plans are processed in priority order (P1 first). The loop exits
when no plans have eligible stories remaining or on SIGINT/SIGTERM.

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

  // Validate that at least one of --plan, --story, --continuous, or --dry-run is provided
  if (
    !cliArgs.continuous &&
    !cliArgs.dryRun &&
    !cliArgs.plan &&
    (!cliArgs.story || cliArgs.story.length === 0)
  ) {
    process.stderr.write(
      'Error: must provide --plan <slug>, --story <id>, --continuous, or --dry-run\n\n',
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
    requiredModel: 'qwen2.5-coder:14b',
    maxStories: 0,
    dryRun: cliArgs.dryRun,
    modelConfig: {
      primaryModel: 'sonnet',
      escalationModel: 'opus',
      ollamaModel: 'qwen2.5-coder:14b',
    },
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
        requiredModel: 'qwen2.5-coder:14b',
        maxStories: 0,
        modelConfig: {
          primaryModel: 'sonnet',
          escalationModel: 'opus',
          ollamaModel: 'qwen2.5-coder:14b',
        },
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
