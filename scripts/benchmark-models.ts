/**
 * scripts/benchmark-models.ts
 *
 * Developer-local CLI script to run the Ollama model benchmark harness.
 *
 * AC-6: This script is developer-local ONLY. It is NOT referenced in any CI configuration.
 * Unit tests use vi.mock for Ollama, not live network calls.
 *
 * Usage:
 *   pnpm tsx scripts/benchmark-models.ts [options]
 *   pnpm tsx scripts/benchmark-models.ts --leaderboard-path /tmp/test-leaderboard.yaml
 *   pnpm tsx scripts/benchmark-models.ts --models deepseek-coder-v2:16b,codellama:13b
 *
 * Prerequisites:
 *   1. Ollama running locally: ollama serve
 *   2. Required models installed: see packages/backend/orchestrator/scripts/setup-ollama-models.sh
 *
 * WINT-0270: Benchmark Harness for Ollama Model Selection
 */

import { logger } from '@repo/logger'
import { runBenchmarkHarness } from '../packages/backend/orchestrator/src/model-selector/benchmark-harness.js'
import {
  MODEL_LEADERBOARD_PATH,
  REQUIRED_MODELS,
} from '../packages/backend/orchestrator/src/model-selector/constants.js'
import { QUALITY_EVALUATOR_LIMITATION } from '../packages/backend/orchestrator/src/model-selector/benchmark-harness.js'

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(argv: string[]): {
  leaderboardPath: string
  models: string[]
  ollamaBaseUrl: string
} {
  let leaderboardPath = MODEL_LEADERBOARD_PATH
  let models = [...REQUIRED_MODELS]
  let ollamaBaseUrl = 'http://127.0.0.1:11434'

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--leaderboard-path' && argv[i + 1]) {
      leaderboardPath = argv[++i]
    } else if (arg === '--models' && argv[i + 1]) {
      models = argv[++i]
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0)
    } else if (arg === '--ollama-url' && argv[i + 1]) {
      ollamaBaseUrl = argv[++i]
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return { leaderboardPath, models, ollamaBaseUrl }
}

function printHelp(): void {
  logger.info('benchmark_cli', {
    event: 'help',
    message: `
Benchmark Models CLI — Developer-local Ollama model benchmarking tool

USAGE:
  pnpm tsx scripts/benchmark-models.ts [options]

OPTIONS:
  --leaderboard-path <path>   Path to leaderboard YAML file
                              Default: ${MODEL_LEADERBOARD_PATH}
  --models <csv>              Comma-separated list of Ollama models to test
                              Default: ${REQUIRED_MODELS.join(',')}
  --ollama-url <url>          Ollama API base URL
                              Default: http://127.0.0.1:11434
  --help, -h                  Show this help message

PREREQUISITES:
  1. Ollama running locally: ollama serve
  2. Required models installed: packages/backend/orchestrator/scripts/setup-ollama-models.sh

QUALITY EVALUATOR LIMITATION:
  ${QUALITY_EVALUATOR_LIMITATION}

EXAMPLES:
  # Run full benchmark with all required models
  pnpm tsx scripts/benchmark-models.ts

  # Run with custom leaderboard path
  pnpm tsx scripts/benchmark-models.ts --leaderboard-path /tmp/my-leaderboard.yaml

  # Test only two models
  pnpm tsx scripts/benchmark-models.ts --models deepseek-coder-v2:16b,qwen2.5-coder:7b
`,
  })
}

// ============================================================================
// Ollama Health Check
// ============================================================================

async function checkOllamaHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    })
    return response.ok
  } catch {
    return false
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const { leaderboardPath, models, ollamaBaseUrl } = parseArgs(process.argv)

  logger.info('benchmark_cli', {
    event: 'start',
    leaderboard_path: leaderboardPath,
    models,
    ollama_url: ollamaBaseUrl,
  })

  // Check Ollama is running
  const ollamaRunning = await checkOllamaHealth(ollamaBaseUrl)
  if (!ollamaRunning) {
    logger.warn('benchmark_cli', {
      event: 'ollama_not_running',
      message: `Ollama is not running at ${ollamaBaseUrl}. Start it with: ollama serve`,
    })
    logger.warn('benchmark_cli', {
      event: 'proceeding_anyway',
      message: 'Proceeding anyway — each model call will fail and be recorded with error.',
    })
  } else {
    logger.info('benchmark_cli', {
      event: 'ollama_health_ok',
      ollama_url: ollamaBaseUrl,
    })
  }

  // Run the benchmark harness
  const summary = await runBenchmarkHarness({
    leaderboardPath,
    models,
    ollamaBaseUrl,
  })

  logger.info('benchmark_cli', {
    event: 'complete',
    total_runs: summary.totalRuns,
    successful_runs: summary.successfulRuns,
    failed_runs: summary.failedRuns,
    leaderboard_written_to: summary.leaderboardPath,
  })

  // Exit with error code if more than half the runs failed
  if (summary.failedRuns > summary.totalRuns / 2) {
    logger.warn('benchmark_cli', {
      event: 'high_failure_rate',
      message: `${summary.failedRuns}/${summary.totalRuns} runs failed. Check Ollama and model availability.`,
    })
    process.exit(1)
  }
}

main().catch(err => {
  logger.warn('benchmark_cli', {
    event: 'fatal_error',
    error: err instanceof Error ? err.message : String(err),
  })
  process.exit(1)
})
