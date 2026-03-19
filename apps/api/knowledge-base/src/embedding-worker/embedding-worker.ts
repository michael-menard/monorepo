/**
 * Embedding Worker
 *
 * Persistent background worker that:
 * 1. Subscribes to PostgreSQL NOTIFY events on the knowledge_embedding_needed channel
 * 2. Batches incoming notifications (time window + size triggers, deduplication)
 * 3. Generates embeddings via EmbeddingClient.generateEmbeddingsBatch()
 * 4. Writes results back via withRetry UPDATE
 * 5. Falls back to polling for missed rows (polling fallback)
 * 6. Runs a startup backfill for existing NULL-embedding rows
 * 7. Handles SIGTERM/SIGINT gracefully (finishes in-flight batch, releases pg.Client)
 *
 * @see CDBE-4030 AC-3, AC-4, AC-5, AC-6, AC-7, AC-11
 */

import type { Client as PgClient, Notification } from 'pg'
import { logger } from '@repo/logger'
import { EmbeddingClient } from '../embedding-client/index.js'
import { withRetry } from '../db/client.js'
import {
  WorkerConfigSchema,
  NotificationPayloadSchema,
  KNOWLEDGE_TABLES,
  type WorkerConfig,
  type KnowledgeTable,
  type EmbeddingWriteResult,
  type BackfillResult,
} from './__types__/index.js'

// ── Content column mapping ────────────────────────────────────────────────────
// Maps each knowledge table to the column(s) that represent the embeddable text.
// The worker concatenates relevant fields into a single string for embedding.

const TABLE_CONTENT_COLUMNS: Record<KnowledgeTable, string[]> = {
  lessons_learned: ['title', 'content'],
  adrs: ['title', 'context', 'decision'],
  code_standards: ['title', 'content'],
  rules: ['rule_text'],
  cohesion_rules: ['rule_name', 'conditions'],
}

// ── SQL injection defense ────────────────────────────────────────────────────
// Compile-time whitelist of safe table and column names. All dynamic SQL
// identifiers are validated against these sets before interpolation.
const SAFE_TABLES = new Set<string>(KNOWLEDGE_TABLES)
const SAFE_COLUMNS = new Set<string>(
  Object.values(TABLE_CONTENT_COLUMNS).flat().concat(['id', 'embedding', 'updated_at']),
)

function assertSafeIdentifier(value: string, kind: 'table' | 'column'): void {
  const allowlist = kind === 'table' ? SAFE_TABLES : SAFE_COLUMNS
  if (!allowlist.has(value)) {
    throw new Error(`[embedding-worker] Unsafe SQL ${kind} name rejected: ${value}`)
  }
}

// ── Signal handler guard ──────────────────────────────────────────────────────
// module-level flag prevents double-registration of SIGTERM/SIGINT handlers.
let _handlersRegistered = false

// ── EmbeddingWorker ───────────────────────────────────────────────────────────

export class EmbeddingWorker {
  private readonly config: WorkerConfig
  private readonly embeddingClient: EmbeddingClient
  private readonly pgClient: PgClient

  /** Buffer of pending notifications keyed by `${table}:${id}` for deduplication */
  private readonly pendingBuffer: Map<string, { table: KnowledgeTable; id: string }> = new Map()

  /** Timer handle for the batch window flush */
  private batchWindowTimer: ReturnType<typeof setTimeout> | null = null

  /** Whether a batch flush is currently in progress */
  private batchInProgress = false

  /** Whether the polling fallback run is currently in progress */
  private pollRunInProgress = false

  /** Whether shutdown has been requested */
  private shutdownRequested = false

  /** Promise that resolves when the in-flight batch completes during shutdown */
  private shutdownResolve: (() => void) | null = null

  /** Interval handle for the polling fallback */
  private pollIntervalHandle: ReturnType<typeof setInterval> | null = null

  constructor(
    embeddingClient: EmbeddingClient,
    pgClient: PgClient,
    config: Partial<WorkerConfig> = {},
  ) {
    this.embeddingClient = embeddingClient
    this.pgClient = pgClient
    this.config = WorkerConfigSchema.parse(config)
  }

  // ── LISTEN subscription ─────────────────────────────────────────────────────

  /**
   * Subscribe to the knowledge_embedding_needed channel and start the polling fallback.
   * Called once at startup (and again after reconnect in run.ts).
   */
  async startListening(): Promise<void> {
    await this.pgClient.query('LISTEN knowledge_embedding_needed')
    this.pgClient.on('notification', this._onNotification.bind(this))
    logger.info('[embedding-worker] LISTEN subscription active', {
      channel: 'knowledge_embedding_needed',
    })

    this._startPollingFallback()
  }

  // ── Notification handler ────────────────────────────────────────────────────

  private _onNotification(msg: Notification): void {
    if (msg.channel !== 'knowledge_embedding_needed') return

    const raw = msg.payload
    if (!raw) {
      logger.warn('[embedding-worker] Received notification with empty payload — discarding')
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      logger.warn('[embedding-worker] Malformed NOTIFY payload (not valid JSON) — discarding', {
        payload: raw,
      })
      return
    }

    const result = NotificationPayloadSchema.safeParse(parsed)
    if (!result.success) {
      logger.warn('[embedding-worker] NOTIFY payload failed Zod validation — discarding', {
        payload: raw,
        errors: result.error.issues,
      })
      return
    }

    const { table, id } = result.data

    // Validate that the table is one of the five known tables
    if (!KNOWLEDGE_TABLES.includes(table as KnowledgeTable)) {
      logger.warn('[embedding-worker] NOTIFY payload refers to unknown table — discarding', {
        table,
        id,
      })
      return
    }

    // Deduplicate: if the same (table, id) is already buffered, skip
    const key = `${table}:${id}`
    if (!this.pendingBuffer.has(key)) {
      this.pendingBuffer.set(key, { table: table as KnowledgeTable, id })
    }

    // Check if batch size limit reached — flush immediately
    if (this.pendingBuffer.size >= this.config.batchSize) {
      this._triggerBatchFlush()
      return
    }

    // Start the time-window timer if not already running
    if (!this.batchWindowTimer) {
      this.batchWindowTimer = setTimeout(() => {
        this.batchWindowTimer = null
        this._triggerBatchFlush()
      }, this.config.batchWindowMs)
    }
  }

  private _triggerBatchFlush(): void {
    // Cancel any pending window timer
    if (this.batchWindowTimer) {
      clearTimeout(this.batchWindowTimer)
      this.batchWindowTimer = null
    }

    // If a batch is already in progress, the buffer accumulates and will be
    // flushed by the next notification trigger after the current flush completes.
    if (this.batchInProgress) return

    this._flushBatch().catch(err => {
      logger.error('[embedding-worker] Unhandled error in batch flush', {
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }

  // ── Batch flush ─────────────────────────────────────────────────────────────

  private async _flushBatch(): Promise<void> {
    if (this.pendingBuffer.size === 0) return

    this.batchInProgress = true

    // Drain the buffer atomically
    const items = Array.from(this.pendingBuffer.values())
    this.pendingBuffer.clear()

    try {
      await this._processItems(items)
    } finally {
      this.batchInProgress = false

      // If shutdown was requested, signal that we're done
      if (this.shutdownRequested && this.shutdownResolve) {
        this.shutdownResolve()
      }
    }
  }

  /**
   * Process a batch of (table, id) items:
   * 1. Fetch content for each row
   * 2. Generate embeddings via EmbeddingClient
   * 3. Write back via withRetry UPDATE
   *
   * Per-row errors are logged and do NOT crash the loop.
   */
  private async _processItems(
    items: Array<{ table: KnowledgeTable; id: string }>,
  ): Promise<EmbeddingWriteResult[]> {
    // Group by table for efficient queries
    const byTable = new Map<KnowledgeTable, string[]>()
    for (const item of items) {
      const ids = byTable.get(item.table) ?? []
      ids.push(item.id)
      byTable.set(item.table, ids)
    }

    const results: EmbeddingWriteResult[] = []

    for (const [table, ids] of byTable) {
      const tableResults = await this._processTableBatch(table, ids)
      results.push(...tableResults)
    }

    return results
  }

  private async _processTableBatch(
    table: KnowledgeTable,
    ids: string[],
  ): Promise<EmbeddingWriteResult[]> {
    const results: EmbeddingWriteResult[] = []

    // Validate table and column names against compile-time whitelist (SQL injection defense)
    assertSafeIdentifier(table, 'table')
    const contentColumns = TABLE_CONTENT_COLUMNS[table]
    for (const col of contentColumns) assertSafeIdentifier(col, 'column')

    const selectCols = contentColumns.join(', ')
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')

    let rows: Array<{ id: string; [col: string]: string }>
    try {
      const queryResult = await this.pgClient.query<{ id: string; [col: string]: string }>(
        `SELECT id, ${selectCols} FROM ${table} WHERE id IN (${placeholders})`,
        ids,
      )
      rows = queryResult.rows
    } catch (err) {
      logger.error(`[embedding-worker] Failed to fetch content from ${table}`, {
        ids,
        error: err instanceof Error ? err.message : String(err),
      })
      // Return failure for all ids in this table
      for (const id of ids) {
        results.push({ table, id, success: false, error: 'content fetch failed' })
      }
      return results
    }

    if (rows.length === 0) {
      logger.warn(`[embedding-worker] No rows found in ${table} for ids`, { ids })
      return results
    }

    // Build text representation for each row
    const rowTexts = rows.map(row => {
      return contentColumns
        .map(col => {
          const val = row[col]
          if (val === null || val === undefined) return ''
          if (typeof val === 'object') return JSON.stringify(val)
          return String(val)
        })
        .filter(Boolean)
        .join(' ')
    })

    // Generate embeddings in batch
    let embeddings: number[][]
    try {
      embeddings = await this.embeddingClient.generateEmbeddingsBatch(rowTexts)
    } catch (err) {
      logger.error(`[embedding-worker] generateEmbeddingsBatch failed for ${table}`, {
        rowCount: rows.length,
        error: err instanceof Error ? err.message : String(err),
      })
      for (const row of rows) {
        results.push({ table, id: row.id, success: false, error: 'embedding generation failed' })
      }
      return results
    }

    // Write back each embedding individually with withRetry
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const embedding = embeddings[i]

      try {
        await withRetry(() =>
          this.pgClient.query(
            `UPDATE ${table} SET embedding = $1, updated_at = NOW() WHERE id = $2`,
            [`[${embedding.join(',')}]::vector`, row.id],
          ),
        )
        results.push({ table, id: row.id, success: true })
      } catch (err) {
        logger.error(`[embedding-worker] Failed to write embedding for ${table}:${row.id}`, {
          error: err instanceof Error ? err.message : String(err),
        })
        results.push({
          table,
          id: row.id,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
        // Per-row failure — continue processing other rows (AC-4)
      }
    }

    return results
  }

  // ── Polling fallback ────────────────────────────────────────────────────────

  private _startPollingFallback(): void {
    if (this.pollIntervalHandle) return

    this.pollIntervalHandle = setInterval(() => {
      this._runPollingTick().catch(err => {
        logger.error('[embedding-worker] Unhandled error in polling tick', {
          error: err instanceof Error ? err.message : String(err),
        })
      })
    }, this.config.pollIntervalMs)

    // Don't prevent process exit if polling is the only thing running
    if (this.pollIntervalHandle && typeof this.pollIntervalHandle === 'object') {
      ;(
        this.pollIntervalHandle as ReturnType<typeof setInterval> & { unref?: () => void }
      ).unref?.()
    }
  }

  async _runPollingTick(): Promise<void> {
    // Skip if previous run is still in progress (AC-5 overlap guard)
    if (this.pollRunInProgress) {
      logger.info('[embedding-worker] Polling run skipped: previous run still in progress')
      return
    }

    this.pollRunInProgress = true
    try {
      for (const table of KNOWLEDGE_TABLES) {
        if (this.shutdownRequested) break

        let rows: Array<{ id: string; [col: string]: string }>
        try {
          const contentColumns = TABLE_CONTENT_COLUMNS[table]
          const selectCols = contentColumns.join(', ')
          const result = await this.pgClient.query<{ id: string; [col: string]: string }>(
            `SELECT id, ${selectCols} FROM ${table} WHERE embedding IS NULL LIMIT 100`,
          )
          rows = result.rows
        } catch (err) {
          logger.error(`[embedding-worker] Polling: failed to query NULL rows from ${table}`, {
            error: err instanceof Error ? err.message : String(err),
          })
          continue
        }

        if (rows.length === 0) continue

        logger.info(
          `[embedding-worker] Polling: found ${rows.length} NULL-embedding rows in ${table}`,
        )

        const ids = rows.map(r => r.id)
        await this._processTableBatch(table, ids)
      }
    } finally {
      this.pollRunInProgress = false
    }
  }

  // ── Backfill ────────────────────────────────────────────────────────────────

  /**
   * Backfill all NULL-embedding rows across all five tables.
   * Processes rows in batches of backfillBatchSize with backfillDelayMs between batches.
   * Called at startup (via run.ts) and optionally as a standalone script.
   *
   * Uses a separate EmbeddingClient instance with maxConcurrentRequests: 3
   * (provided by caller from run.ts) to respect OpenAI rate limits.
   *
   * @param backfillClient - EmbeddingClient with maxConcurrentRequests: 3 for backfill
   */
  async runBackfill(backfillClient: EmbeddingClient): Promise<BackfillResult[]> {
    logger.info('[embedding-worker] Backfill starting', {
      backfillBatchSize: this.config.backfillBatchSize,
      backfillDelayMs: this.config.backfillDelayMs,
    })

    const results: BackfillResult[] = []

    for (const table of KNOWLEDGE_TABLES) {
      const tableResult = await this._backfillTable(table, backfillClient)
      results.push(tableResult)
    }

    const total = results.reduce((sum, r) => sum + r.rowsProcessed, 0)
    logger.info('[embedding-worker] Backfill complete', {
      total,
      perTable: results.map(r => ({ table: r.table, rows: r.rowsProcessed })),
    })

    return results
  }

  private async _backfillTable(
    table: KnowledgeTable,
    backfillClient: EmbeddingClient,
  ): Promise<BackfillResult> {
    assertSafeIdentifier(table, 'table')
    let totalProcessed = 0
    const contentColumns = TABLE_CONTENT_COLUMNS[table]
    for (const col of contentColumns) assertSafeIdentifier(col, 'column')
    const selectCols = contentColumns.join(', ')

    while (!this.shutdownRequested) {
      let rows: Array<{ id: string; [col: string]: string }>
      try {
        const result = await this.pgClient.query<{ id: string; [col: string]: string }>(
          `SELECT id, ${selectCols} FROM ${table} WHERE embedding IS NULL LIMIT $1`,
          [this.config.backfillBatchSize],
        )
        rows = result.rows
      } catch (err) {
        logger.error(`[embedding-worker] Backfill: failed to query NULL rows from ${table}`, {
          error: err instanceof Error ? err.message : String(err),
        })
        break
      }

      if (rows.length === 0) break

      // Build texts
      const rowTexts = rows.map(row =>
        contentColumns
          .map(col => {
            const val = row[col]
            if (val === null || val === undefined) return ''
            if (typeof val === 'object') return JSON.stringify(val)
            return String(val)
          })
          .filter(Boolean)
          .join(' '),
      )

      // Generate embeddings using the backfill client (rate-limited: maxConcurrentRequests=3)
      let embeddings: number[][]
      try {
        embeddings = await backfillClient.generateEmbeddingsBatch(rowTexts)
      } catch (err) {
        logger.error(`[embedding-worker] Backfill: embedding generation failed for ${table}`, {
          batchSize: rows.length,
          error: err instanceof Error ? err.message : String(err),
        })
        break
      }

      // Write back
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const embedding = embeddings[i]
        try {
          await withRetry(() =>
            this.pgClient.query(
              `UPDATE ${table} SET embedding = $1, updated_at = NOW() WHERE id = $2`,
              [`[${embedding.join(',')}]::vector`, row.id],
            ),
          )
          totalProcessed++
        } catch (err) {
          logger.error(
            `[embedding-worker] Backfill: failed to write embedding for ${table}:${row.id}`,
            { error: err instanceof Error ? err.message : String(err) },
          )
        }
      }

      logger.info(`[embedding-worker] Backfill: processed batch from ${table}`, {
        batchSize: rows.length,
        totalProcessed,
      })

      // Inter-batch delay to respect OpenAI rate limits
      if (rows.length === this.config.backfillBatchSize && !this.shutdownRequested) {
        await new Promise(resolve => setTimeout(resolve, this.config.backfillDelayMs))
      }
    }

    return { table, rowsProcessed: totalProcessed }
  }

  // ── Graceful shutdown ───────────────────────────────────────────────────────

  /**
   * Register SIGTERM and SIGINT handlers for graceful shutdown.
   * Uses module-level _handlersRegistered guard to prevent double-registration (AC-7).
   */
  registerShutdownHandlers(): void {
    if (_handlersRegistered) return
    _handlersRegistered = true

    const shutdown = async (signal: string) => {
      logger.info(`[embedding-worker] Received ${signal} — initiating graceful shutdown`)
      await this.shutdown()
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  }

  async shutdown(): Promise<void> {
    this.shutdownRequested = true

    // Stop polling fallback
    if (this.pollIntervalHandle) {
      clearInterval(this.pollIntervalHandle)
      this.pollIntervalHandle = null
    }

    // Cancel batch window timer
    if (this.batchWindowTimer) {
      clearTimeout(this.batchWindowTimer)
      this.batchWindowTimer = null
    }

    // Wait for any in-flight batch to complete
    if (this.batchInProgress) {
      logger.info('[embedding-worker] Waiting for in-flight batch to complete')
      await new Promise<void>(resolve => {
        this.shutdownResolve = resolve
      })
    }

    // Release the pg.Client
    try {
      await this.pgClient.end()
      logger.info('[embedding-worker] pg.Client released')
    } catch (err) {
      logger.warn('[embedding-worker] Error releasing pg.Client during shutdown', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    logger.info('[embedding-worker] Shutdown complete')
    process.exit(0)
  }

  // ── Expose internals for testing ───────────────────────────────────────────

  get isShutdownRequested(): boolean {
    return this.shutdownRequested
  }

  get isPollRunInProgress(): boolean {
    return this.pollRunInProgress
  }

  get bufferSize(): number {
    return this.pendingBuffer.size
  }

  /** Reset the module-level _handlersRegistered flag — for test isolation only */
  static resetHandlersRegisteredForTest(): void {
    _handlersRegistered = false
  }
}
