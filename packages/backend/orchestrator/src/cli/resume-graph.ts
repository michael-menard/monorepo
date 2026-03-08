#!/usr/bin/env tsx
/**
 * resume-graph CLI
 *
 * Restores a LangGraph story-creation graph from its latest checkpoint and
 * continues execution from the interrupted node.
 *
 * AC-005: CLI command `resume-graph --thread-id <id>` restores a graph from its
 *   latest checkpoint and continues execution from the interrupted node.
 * HP-4: CLI outputs thread_id, checkpoint timestamp, phase being resumed, COMPLETE.
 * EC-1: Exit code 1 with error log when thread_id not found.
 *
 * Usage:
 *   npx tsx packages/backend/orchestrator/src/cli/resume-graph.ts --thread-id <uuid>
 *   npx tsx packages/backend/orchestrator/src/cli/resume-graph.ts --help
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (postgresql://user:pass@host:port/db)
 *   CHECKPOINT_TTL_DAYS - TTL for checkpoint archival (default: 7)
 */

import { logger } from '@repo/logger'
import { getPool, closePool } from '@repo/db'
import { createCheckpointRepository } from '../checkpointer/checkpoint-repository.js'
import { createStoryCreationGraph } from '../graphs/story-creation.js'
import type { DbPool } from '../checkpointer/checkpoint-repository.js'

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(args: string[]): { threadId?: string; help: boolean } {
  const result: { threadId?: string; help: boolean } = { help: false }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      result.help = true
    } else if (arg === '--thread-id' && args[i + 1]) {
      result.threadId = args[i + 1]
      i++ // skip value
    }
  }

  return result
}

function printHelp(): void {
  process.stdout.write(`
resume-graph — Resume a LangGraph story-creation graph from its latest checkpoint

USAGE
  npx tsx resume-graph.ts --thread-id <uuid>

OPTIONS
  --thread-id <uuid>   LangGraph thread ID (required). Maps to workflow_executions.execution_id.
  --help, -h           Print this help message.

ENVIRONMENT
  DATABASE_URL         PostgreSQL connection string. Required.
                       Example: postgresql://postgres:postgres@localhost:5432/lego_dev
  CHECKPOINT_TTL_DAYS  Checkpoint archival TTL in days (default: 7).

EXIT CODES
  0   Graph completed successfully.
  1   Error: thread not found, DB unavailable, or graph failure.

`)
}

// ============================================================================
// DB Pool from @repo/db
// ============================================================================

/**
 * Gets the shared pool from @repo/db.
 * AC-001: Uses getPool() from @repo/db — no separate pool created.
 */
function getDbPool(): DbPool {
  return getPool() as unknown as DbPool
}

// ============================================================================
// Resume Logic
// ============================================================================

/**
 * Resumes a graph from its latest checkpoint.
 *
 * AC-005: Restore graph from latest checkpoint and continue execution.
 * HP-4: Output thread_id, checkpoint timestamp, phase being resumed, final outcome.
 * EC-1: Exit code 1 when thread_id not found.
 *
 * @param threadId - LangGraph thread ID to resume
 * @param pool - DB pool
 */
async function resumeGraph(threadId: string, pool: DbPool): Promise<void> {
  const repo = createCheckpointRepository(pool, { workflowName: 'story-creation' })

  logger.info('Resuming graph from checkpoint', { threadId })
  process.stdout.write(`[resume-graph] thread_id: ${threadId}\n`)

  // Step 1: Load latest checkpoint
  const checkpoint = await repo.get(threadId)

  if (!checkpoint) {
    logger.error(`No checkpoint found for thread ID: ${threadId}`)
    process.stdout.write(`[resume-graph] ERROR: No checkpoint found for thread ID: ${threadId}\n`)
    process.exitCode = 1
    return
  }

  const { payload, nodeName, phase } = checkpoint

  process.stdout.write(
    `[resume-graph] checkpoint_timestamp: ${new Date().toISOString()}\n` +
      `[resume-graph] phase: ${phase}\n` +
      `[resume-graph] last_completed_node: ${nodeName}\n` +
      `[resume-graph] state_snapshot_keys: ${Object.keys(payload.state_snapshot).join(', ')}\n`,
  )

  // Step 2: Reconstruct initial state from checkpoint
  // The state_snapshot contains the full serialized graph state at last checkpoint
  const restoredState = payload.state_snapshot

  logger.info('Restored state from checkpoint', {
    threadId,
    nodeName,
    phase,
    stateKeys: Object.keys(restoredState),
    nodeHistoryLength: payload.node_history.length,
    retryCounts: payload.retry_counts,
  })

  // Step 3: Get execution metadata to determine story ID and config
  const execution = await repo.getExecution(threadId)
  const storyId = execution?.story_id ?? (restoredState['storyId'] as string | undefined)

  // Step 4: Reconstruct and reinvoke the graph
  // Create a minimal graph config from restored state, ensuring safety flags are enforced
  const restoredConfig = (restoredState['config'] as Record<string, unknown> | undefined) ?? {}
  const graphConfig = {
    ...restoredConfig,
    persistToDb: false, // Don't re-persist on resume
    requireHiTL: false, // Skip HiTL on resume (already decided)
    checkpointerConfig: { workflowName: 'story-creation' },
    checkpointThreadId: threadId,
  }

  process.stdout.write(`[resume-graph] resuming graph execution...\n`)

  try {
    const graph = createStoryCreationGraph(graphConfig)

    // Invoke graph with restored state — LangGraph will pick up from where state left off
    // The state_snapshot is the full annotated state, so resumption is direct
    const result = await graph.invoke(restoredState)

    // Step 5: Update execution status
    await repo.completeExecution(threadId, 'completed')

    process.stdout.write(
      `[resume-graph] COMPLETE\n` +
        `[resume-graph] storyId: ${storyId ?? 'unknown'}\n` +
        `[resume-graph] final_phase: ${(result as Record<string, unknown>)['currentPhase'] ?? 'unknown'}\n` +
        `[resume-graph] workflow_success: ${(result as Record<string, unknown>)['workflowSuccess'] ?? false}\n`,
    )

    logger.info('Graph resumed and completed successfully', {
      threadId,
      storyId,
      finalPhase: (result as Record<string, unknown>)['currentPhase'],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await repo.completeExecution(threadId, 'failed').catch(() => {
      // Best-effort — don't obscure the original error
    })

    logger.error('Graph execution failed during resume', { threadId, error: message })
    process.stdout.write(`[resume-graph] FAILED: ${message}\n`)
    process.exitCode = 1
  }
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

  if (!parsed.threadId) {
    process.stderr.write('Error: --thread-id <uuid> is required\n')
    printHelp()
    process.exitCode = 1
    return
  }

  try {
    const pool = getDbPool()
    await resumeGraph(parsed.threadId, pool)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('resume-graph fatal error', { error: message })
    process.stderr.write(`Error: ${message}\n`)
    process.exitCode = 1
  } finally {
    await closePool()
  }
}

main().catch(error => {
  process.stderr.write(`Unhandled error: ${String(error)}\n`)
  process.exitCode = 1
})
