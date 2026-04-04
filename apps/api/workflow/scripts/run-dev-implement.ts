/**
 * run-dev-implement.ts
 *
 * One-shot script to run the dev-implement-v2 graph for a given story.
 * Loads env from the monorepo root .env, overrides model assignments
 * to use Anthropic (fallback when Ollama is unavailable).
 *
 * Usage:
 *   cd apps/api/workflow
 *   MONOREPO_ROOT=/Users/michaelmenard/Development/monorepo \
 *   STORY_ID=NOTI-0010 \
 *   bun run scripts/run-dev-implement.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// MAIN_REPO_ROOT: where the root .env and model-assignments.yaml live (never changes)
const MAIN_REPO_ROOT = '/Users/michaelmenard/Development/monorepo'

// Load root .env before any other imports that may read env vars
config({ path: resolve(MAIN_REPO_ROOT, '.env') })

// Alias OPEN_ROUTER_API_KEY → OPENROUTER_API_KEY (root .env uses the former)
if (process.env.OPEN_ROUTER_API_KEY && !process.env.OPENROUTER_API_KEY) {
  process.env.OPENROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY
}

// WORKTREE_PATH: where file I/O goes (feature branch worktree)
// Override MONOREPO_ROOT so tool-adapters write into the worktree, not main repo.
const WORKTREE_PATH = process.env.WORKTREE_PATH ?? resolve(MAIN_REPO_ROOT, '../worktrees/NOTI-0010')
process.env.MONOREPO_ROOT = WORKTREE_PATH

import { logger } from '@repo/logger'
import { createDevImplementV2Graph } from '../src/graphs/dev-implement-v2.js'
import { createKbAdapters } from '../src/services/kb-adapters.js'
import { createToolAdapters } from '../src/services/tool-adapters.js'
import { createLlmAdapter, createClaudeCodeExecutorAdapter } from '../src/services/llm-adapters.js'

const storyId = process.env.STORY_ID ?? 'NOTI-0010'

// Planner: claude-code/sonnet for planning (ReAct JSON simulation)
// Executor: dedicated claude-code executor that uses --dangerously-skip-permissions
//           to write files natively instead of simulating a JSON tool loop
const PLANNER_MODEL = 'claude-code/sonnet'

logger.info('run-dev-implement: starting', {
  storyId,
  mainRepoRoot: MAIN_REPO_ROOT,
  worktreePath: WORKTREE_PATH,
  plannerModel: PLANNER_MODEL,
  executorMode: 'claude-code-native (--dangerously-skip-permissions)',
})

const kbAdapters = createKbAdapters()
const toolAdapters = createToolAdapters()
const plannerLlmAdapter = createLlmAdapter({ modelString: PLANNER_MODEL })
const executorLlmAdapter = createClaudeCodeExecutorAdapter('sonnet')

const graph = createDevImplementV2Graph({
  kbStoryAdapter: kbAdapters.kbStoryAdapter,
  queryKb: kbAdapters.queryKb,
  plannerLlmAdapter,
  executorLlmAdapter,
  readFile: toolAdapters.readFile,
  writeFile: toolAdapters.writeFile,
  searchCodebase: toolAdapters.searchCodebase,
  runTests: toolAdapters.runTests,
  maxInternalIterations: 15,
  maxPlannerIterations: 3,
})

const startTime = Date.now()

try {
  logger.info('run-dev-implement: invoking graph', { storyId })
  const result = await graph.invoke({ storyId })

  const durationMs = Date.now() - startTime
  const verdict = result.executorOutcome?.verdict ?? 'unknown'
  const phase = result.devImplementV2Phase ?? 'unknown'

  logger.info('run-dev-implement: graph completed', {
    storyId,
    verdict,
    phase,
    durationMs,
    filesCreated: result.executorOutcome?.filesCreated ?? [],
    filesModified: result.executorOutcome?.filesModified ?? [],
    errors: result.errors ?? [],
  })

  if (result.postconditionResult) {
    logger.info('run-dev-implement: postcondition gate result', {
      passed: result.postconditionResult.passed,
      checks: result.postconditionResult.checks,
    })
  }

  if (verdict === 'complete' && (result.errors ?? []).length === 0) {
    logger.info('run-dev-implement: SUCCESS — implementation complete', { storyId })
    process.exit(0)
  } else {
    logger.warn('run-dev-implement: graph finished with issues', {
      verdict,
      diagnosis: result.executorOutcome?.diagnosis,
      errors: result.errors,
    })
    process.exit(1)
  }
} catch (err) {
  const durationMs = Date.now() - startTime
  logger.error('run-dev-implement: fatal error', {
    storyId,
    durationMs,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })
  process.exit(1)
}
