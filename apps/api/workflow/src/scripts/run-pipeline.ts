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
import { createPipelineOrchestratorV2Graph } from '../graphs/pipeline-orchestrator-v2.js'
import type { PipelineOrchestratorV2GraphConfig } from '../graphs/pipeline-orchestrator-v2.js'
import type { InputMode } from '../state/pipeline-orchestrator-v2-state.js'
import { defaultShellExec } from '../nodes/pipeline-orchestrator/worktree-manager.js'
import { createNotiAdapter, createNoopNotiAdapter } from '../services/noti-adapter.js'
import { createEventEmitter } from '../nodes/pipeline-orchestrator/event-emitter.js'
import { createLlmAdapterFactory } from '../services/llm-adapter-factory.js'
import { storyListAdapter } from '../services/kb-adapters.js'

// ============================================================================
// CLI Argument Schema
// ============================================================================

const CliArgsSchema = z.object({
  plan: z.string().optional(),
  story: z.array(z.string()).optional(),
  concurrency: z.number().int().min(1).default(1),
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
  pnpm tsx src/scripts/run-pipeline.ts --help

Options:
  --plan <slug>         Process all ready stories from the given plan
  --story <id>          Process a specific story (repeatable)
  --concurrency <n>     Max concurrent stories (default: 1)
  --help, -h            Show this help message

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

  // Validate that at least one of --plan or --story is provided
  if (!cliArgs.plan && (!cliArgs.story || cliArgs.story.length === 0)) {
    process.stderr.write('Error: must provide --plan <slug> or --story <id>\n\n')
    printUsage()
    process.exit(1)
  }

  // Determine input mode
  const inputMode: InputMode = cliArgs.plan ? 'plan' : 'story'
  const planSlug = cliArgs.plan ?? null
  const storyIds = cliArgs.story ?? []

  // Resolve configuration from environment
  const monorepoRoot = await detectMonorepoRoot()
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const defaultBaseBranch = process.env.DEFAULT_BASE_BRANCH ?? 'main'
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY

  logger.info('run-pipeline: starting pipeline orchestrator V2', {
    inputMode,
    planSlug,
    storyIds,
    concurrency: cliArgs.concurrency,
    monorepoRoot,
    ollamaBaseUrl,
    defaultBaseBranch,
    hasAnthropicKey: !!anthropicApiKey,
  })

  // Build adapters
  const notiAdapter = buildNotiAdapter()
  const _emitter = createEventEmitter({ notiAdapter })
  const _llmFactory = createLlmAdapterFactory({
    ollamaBaseUrl,
    anthropicApiKey,
  })

  // Build graph config
  const graphConfig: PipelineOrchestratorV2GraphConfig = {
    monorepoRoot,
    ollamaBaseUrl,
    defaultBaseBranch,
    shellExec: defaultShellExec,
    storyListAdapter,
  }

  // Build initial state
  const initialState = {
    inputMode,
    planSlug,
    storyIds,
    modelConfig: {
      primaryModel: 'sonnet',
      escalationModel: 'opus',
      ollamaModel: 'qwen2.5-coder:14b',
    },
  }

  // Compile and invoke graph
  const startTime = Date.now()

  try {
    const compiledGraph = createPipelineOrchestratorV2Graph(graphConfig)

    logger.info('run-pipeline: graph compiled, invoking...')

    const finalState = await compiledGraph.invoke(initialState)

    const durationMs = Date.now() - startTime
    const completedCount = finalState.completedStories?.length ?? 0
    const blockedCount = finalState.blockedStories?.length ?? 0
    const errors = finalState.errors ?? []
    const phase = finalState.pipelinePhase

    logger.info('run-pipeline: pipeline finished', {
      phase,
      completedCount,
      blockedCount,
      errorCount: errors.length,
      durationMs,
    })

    // Print summary to stdout for CLI consumers
    process.stdout.write('\n--- Pipeline Summary ---\n')
    process.stdout.write(`Phase: ${phase}\n`)
    process.stdout.write(`Completed: ${completedCount}\n`)
    process.stdout.write(`Blocked: ${blockedCount}\n`)
    process.stdout.write(`Errors: ${errors.length}\n`)
    process.stdout.write(`Duration: ${(durationMs / 1000).toFixed(1)}s\n`)

    if (errors.length > 0) {
      process.stdout.write('\nErrors:\n')
      for (const err of errors) {
        process.stdout.write(`  - ${err}\n`)
      }
    }

    if (blockedCount > 0) {
      process.stdout.write('\nBlocked stories:\n')
      for (const id of finalState.blockedStories ?? []) {
        process.stdout.write(`  - ${id}\n`)
      }
    }

    // Exit code: 0 on pipeline_complete, 1 on stalled/error
    if (phase === 'pipeline_stalled' || errors.length > 0) {
      process.exit(1)
    }

    process.exit(0)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const durationMs = Date.now() - startTime

    logger.error('run-pipeline: fatal error', { error: msg, durationMs })
    process.stderr.write(`\nFatal error: ${msg}\n`)
    process.exit(1)
  }
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
