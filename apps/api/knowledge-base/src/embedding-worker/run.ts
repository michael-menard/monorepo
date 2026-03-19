/**
 * Embedding Worker Entrypoint
 *
 * Process entrypoint for the embedding worker.
 * - Preflight check: OPENAI_API_KEY must be present
 * - Constructs pg.Client and EmbeddingClient instances
 * - Registers exponential backoff reconnect handler
 * - Runs startup backfill
 * - Starts LISTEN loop
 *
 * CLI flags:
 *   --backfill-only   Run backfill, log results, and exit (no LISTEN loop)
 *
 * @see CDBE-4030 AC-12, AC-13
 */

import { Client as PgClient } from 'pg'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { logger } from '@repo/logger'
import { EmbeddingClient } from '../embedding-client/index.js'
import { EmbeddingWorker } from './embedding-worker.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from package root
config({ path: resolve(__dirname, '../../.env') })

// ── Module-level signal handler guard ─────────────────────────────────────────
// This guard lives here (in run.ts) for the reconnect handler's LISTEN re-subscription.
// The worker's _handlersRegistered guard covers SIGTERM/SIGINT.

// ── Reconnect configuration ───────────────────────────────────────────────────

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000]
const RECONNECT_CAP_MS = 30000

function getReconnectDelayMs(attempt: number): number {
  if (attempt < RECONNECT_DELAYS_MS.length) {
    return RECONNECT_DELAYS_MS[attempt]
  }
  return RECONNECT_CAP_MS
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isBackfillOnly = process.argv.includes('--backfill-only')

  // ── AC-13: Preflight check ────────────────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    logger.error('[embedding-worker] Startup preflight failed: OPENAI_API_KEY is not set', {
      remediation:
        'Set OPENAI_API_KEY in your .env file or environment before starting the worker.',
    })
    process.exit(1)
  }

  // ── Construct EmbeddingClient (realtime path — default maxConcurrentRequests=10) ──
  const embeddingClient = new EmbeddingClient({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.EMBEDDING_MODEL,
    maxConcurrentRequests: 10,
  })

  // ── Construct EmbeddingClient for backfill (rate-limited: maxConcurrentRequests=3) ──
  const backfillEmbeddingClient = new EmbeddingClient({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.EMBEDDING_MODEL,
    maxConcurrentRequests: 3,
  })

  // ── Construct pg.Client for LISTEN connection ─────────────────────────────
  const pgClient = new PgClient({
    host: process.env.KB_DB_HOST || 'localhost',
    port: parseInt(process.env.KB_DB_PORT || '5433', 10),
    database: process.env.KB_DB_NAME || 'knowledgebase',
    user: process.env.KB_DB_USER || 'kbuser',
    password: process.env.KB_DB_PASSWORD,
    keepAlive: true,
  })

  // ── Connect to DB ─────────────────────────────────────────────────────────
  try {
    await pgClient.connect()
    logger.info('[embedding-worker] DB connection established', {
      host: process.env.KB_DB_HOST || 'localhost',
      port: process.env.KB_DB_PORT || '5433',
      database: process.env.KB_DB_NAME || 'knowledgebase',
    })
  } catch (err) {
    logger.error('[embedding-worker] Failed to connect to DB at startup', {
      error: err instanceof Error ? err.message : String(err),
    })
    process.exit(1)
  }

  // ── Construct EmbeddingWorker ─────────────────────────────────────────────
  const worker = new EmbeddingWorker(embeddingClient, pgClient)
  worker.registerShutdownHandlers()

  // ── AC-12: Exponential backoff reconnect handler ──────────────────────────
  let reconnectAttempt = 0

  pgClient.on('error', (err: Error) => {
    logger.warn('[embedding-worker] pg.Client connection error — attempting reconnect', {
      error: err.message,
      attempt: reconnectAttempt + 1,
    })

    const delayMs = getReconnectDelayMs(reconnectAttempt)
    reconnectAttempt++

    setTimeout(async () => {
      try {
        const freshClient = new PgClient({
          host: process.env.KB_DB_HOST || 'localhost',
          port: parseInt(process.env.KB_DB_PORT || '5433', 10),
          database: process.env.KB_DB_NAME || 'knowledgebase',
          user: process.env.KB_DB_USER || 'kbuser',
          password: process.env.KB_DB_PASSWORD,
          keepAlive: true,
        })

        await freshClient.connect()
        logger.info('[embedding-worker] Reconnected to DB successfully', {
          attempt: reconnectAttempt,
          delayMs,
        })

        // Re-issue LISTEN after successful reconnect (AC-12)
        await freshClient.query('LISTEN knowledge_embedding_needed')
        logger.info('[embedding-worker] LISTEN re-subscribed after reconnect', {
          channel: 'knowledge_embedding_needed',
        })

        // Reset backoff on success
        reconnectAttempt = 0
      } catch (reconnectErr) {
        logger.error('[embedding-worker] Reconnect attempt failed', {
          attempt: reconnectAttempt,
          nextDelayMs: getReconnectDelayMs(reconnectAttempt),
          error: reconnectErr instanceof Error ? reconnectErr.message : String(reconnectErr),
        })
        // The next error event on the original client (or if we retry) will handle further attempts
      }
    }, delayMs)
  })

  // ── Backfill-only mode ────────────────────────────────────────────────────
  if (isBackfillOnly) {
    logger.info('[embedding-worker] Running in backfill-only mode')
    logger.info('[embedding-worker] Backfill starting', {
      mode: 'standalone',
    })

    try {
      const results = await worker.runBackfill(backfillEmbeddingClient)
      const total = results.reduce((sum, r) => sum + r.rowsProcessed, 0)

      logger.info('[embedding-worker] Backfill complete', {
        total,
        perTable: results.map(r => ({ table: r.table, rows: r.rowsProcessed })),
      })
    } catch (err) {
      logger.error('[embedding-worker] Backfill failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      process.exit(1)
    }

    await pgClient.end()
    process.exit(0)
  }

  // ── Startup backfill ──────────────────────────────────────────────────────
  logger.info('[embedding-worker] Backfill starting')
  try {
    const backfillResults = await worker.runBackfill(backfillEmbeddingClient)
    const total = backfillResults.reduce((sum, r) => sum + r.rowsProcessed, 0)
    logger.info('[embedding-worker] Backfill complete', {
      total,
      perTable: backfillResults.map(r => ({ table: r.table, rows: r.rowsProcessed })),
    })
  } catch (err) {
    logger.warn(
      '[embedding-worker] Startup backfill encountered an error — continuing with LISTEN',
      {
        error: err instanceof Error ? err.message : String(err),
      },
    )
  }

  // ── Start LISTEN loop ─────────────────────────────────────────────────────
  await worker.startListening()
  logger.info('[embedding-worker] Worker is running — listening for embedding notifications')
}

main().catch(err => {
  logger.error('[embedding-worker] Fatal startup error', {
    error: err instanceof Error ? err.message : String(err),
  })
  process.exit(1)
})
