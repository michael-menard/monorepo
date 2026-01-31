/**
 * Seed Module for Knowledge Base
 *
 * This module exports bulk import functionality for seeding the knowledge base.
 *
 * @see KNOW-006 for implementation details and acceptance criteria
 *
 * @example
 * ```typescript
 * import {
 *   kbBulkImport,
 *   estimateImportCost,
 *   type BulkImportInput,
 *   type BulkImportResult,
 * } from './seed'
 *
 * // Bulk import entries
 * const result = await kbBulkImport({
 *   entries: parsedEntries,
 *   dry_run: false,
 * }, deps)
 * ```
 */

// Bulk import
export { kbBulkImport, type KbBulkImportDeps } from './kb-bulk-import.js'

// Types and schemas
export {
  // Schemas
  BulkImportInputSchema,
  BulkImportResultSchema,
  ImportErrorSchema,
  ImportProgressEventSchema,
  // Types
  type BulkImportInput,
  type BulkImportResult,
  type ImportError,
  type ImportProgressEvent,
  // Utilities
  estimateImportCost,
  formatCostEstimate,
  // Constants
  MAX_BULK_IMPORT_ENTRIES,
  BULK_IMPORT_BATCH_SIZE,
  PROGRESS_LOG_INTERVAL,
} from './__types__/index.js'
