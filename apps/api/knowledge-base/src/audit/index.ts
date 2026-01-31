/**
 * Audit Logging Module
 *
 * Exports audit logging functionality for the knowledge base MCP server.
 *
 * @see KNOW-018 for audit logging requirements
 */

// Types
export * from './__types__/index.js'

// Core audit logger
export { AuditLogger, createAuditLogger, createEntrySnapshot } from './audit-logger.js'
export type { AuditLoggerDeps, AuditUserContext, EntrySnapshot } from './audit-logger.js'

// Query functions
export { queryAuditByEntry, queryAuditByTimeRange } from './queries.js'
export type { AuditQueryDeps } from './queries.js'

// Retention policy
export { runRetentionCleanup, calculateCutoffDate } from './retention-policy.js'
export type { RetentionCleanupDeps } from './retention-policy.js'
