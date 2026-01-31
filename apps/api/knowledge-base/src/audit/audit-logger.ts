/**
 * Audit Logger Service
 *
 * Core audit logging service for tracking knowledge base modifications.
 * Provides transactional audit logging with soft-fail support.
 *
 * @see KNOW-018 AC1-AC5 for audit logging requirements
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { auditLog, type KnowledgeEntry } from '../db/schema.js'
import { parseAuditConfig, type AuditOperation, type AuditConfig } from './__types__/index.js'

/**
 * Dependencies for AuditLogger.
 */
export interface AuditLoggerDeps {
  /** Drizzle database client */
  db: NodePgDatabase<typeof import('../db/schema.js')>
}

/**
 * Context available from MCP tool invocation.
 */
export interface AuditUserContext {
  /** Correlation ID from tool call context */
  correlation_id?: string
  /** Additional session metadata */
  [key: string]: unknown
}

/**
 * Entry snapshot for audit logging.
 * Excludes embedding vectors (too large).
 */
export interface EntrySnapshot {
  id: string
  content: string
  role: string
  tags: string[] | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Create an entry snapshot suitable for audit logging.
 * Excludes the embedding vector (too large for storage).
 *
 * @param entry - Knowledge entry to snapshot
 * @returns Entry snapshot without embedding
 */
export function createEntrySnapshot(entry: KnowledgeEntry): EntrySnapshot {
  return {
    id: entry.id,
    content: entry.content,
    role: entry.role,
    tags: entry.tags,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }
}

/**
 * Audit Logger class.
 *
 * Provides methods for logging knowledge base operations with:
 * - Transactional integrity
 * - Soft-fail support (configurable)
 * - Performance tracking
 * - Structured logging
 */
export class AuditLogger {
  private config: AuditConfig

  constructor(
    private deps: AuditLoggerDeps,
    config?: Partial<AuditConfig>,
  ) {
    const parsedConfig = parseAuditConfig()
    this.config = { ...parsedConfig, ...config }
  }

  /**
   * Check if audit logging is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Log an add operation.
   *
   * @param entryId - ID of the created entry
   * @param newEntry - The created entry
   * @param userContext - MCP session context
   */
  async logAdd(
    entryId: string,
    newEntry: KnowledgeEntry,
    userContext?: AuditUserContext,
  ): Promise<void> {
    await this.logOperation('add', entryId, null, createEntrySnapshot(newEntry), userContext)
  }

  /**
   * Log an update operation.
   *
   * @param entryId - ID of the updated entry
   * @param previousEntry - Entry state before update
   * @param newEntry - Entry state after update
   * @param userContext - MCP session context
   */
  async logUpdate(
    entryId: string,
    previousEntry: KnowledgeEntry,
    newEntry: KnowledgeEntry,
    userContext?: AuditUserContext,
  ): Promise<void> {
    await this.logOperation(
      'update',
      entryId,
      createEntrySnapshot(previousEntry),
      createEntrySnapshot(newEntry),
      userContext,
    )
  }

  /**
   * Log a delete operation.
   *
   * @param entryId - ID of the deleted entry
   * @param deletedEntry - Entry state before deletion
   * @param userContext - MCP session context
   */
  async logDelete(
    entryId: string,
    deletedEntry: KnowledgeEntry,
    userContext?: AuditUserContext,
  ): Promise<void> {
    await this.logOperation('delete', entryId, createEntrySnapshot(deletedEntry), null, userContext)
  }

  /**
   * Core operation logging method.
   *
   * @param operation - Type of operation (add, update, delete)
   * @param entryId - ID of the entry
   * @param previousValue - Entry state before (null for add)
   * @param newValue - Entry state after (null for delete)
   * @param userContext - MCP session context
   */
  async logOperation(
    operation: AuditOperation,
    entryId: string,
    previousValue: EntrySnapshot | null,
    newValue: EntrySnapshot | null,
    userContext?: AuditUserContext,
  ): Promise<void> {
    // Skip if audit logging is disabled
    if (!this.config.enabled) {
      logger.debug('Audit logging disabled, skipping', { operation, entryId })
      return
    }

    const startTime = Date.now()
    const correlationId = userContext?.correlation_id ?? 'no-correlation-id'

    try {
      await this.deps.db.insert(auditLog).values({
        entryId,
        operation,
        previousValue: previousValue as Record<string, unknown> | null,
        newValue: newValue as Record<string, unknown> | null,
        timestamp: new Date(),
        userContext: (userContext as Record<string, unknown>) ?? null,
      })

      const durationMs = Date.now() - startTime

      logger.info('Audit log entry created', {
        operation,
        entry_id: entryId,
        correlation_id: correlationId,
        duration_ms: durationMs,
      })
    } catch (error) {
      const durationMs = Date.now() - startTime

      if (this.config.softFail) {
        // Soft fail: log error but don't throw
        logger.error('Audit log write failed (soft fail enabled)', {
          operation,
          entry_id: entryId,
          correlation_id: correlationId,
          duration_ms: durationMs,
          error: error instanceof Error ? error.message : String(error),
        })

        // TODO: Emit monitoring metric (audit_write_failure counter)
        // This would integrate with CloudWatch, Prometheus, or similar
      } else {
        // Hard fail: throw error
        logger.error('Audit log write failed (soft fail disabled)', {
          operation,
          entry_id: entryId,
          correlation_id: correlationId,
          duration_ms: durationMs,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    }
  }
}

/**
 * Create an AuditLogger instance with default configuration.
 *
 * @param deps - Database dependencies
 * @returns Configured AuditLogger instance
 */
export function createAuditLogger(deps: AuditLoggerDeps): AuditLogger {
  return new AuditLogger(deps)
}
