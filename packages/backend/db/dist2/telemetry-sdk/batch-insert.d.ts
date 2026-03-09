/**
 * Batch Insert Function (INFR-0050 AC-4)
 *
 * Efficiently insert multiple workflow events using Drizzle batch insert API.
 * Handles chunking for PostgreSQL param limits and provides resilient error handling.
 */
import type { WorkflowEventInput } from '../workflow-events.js';
/**
 * Insert multiple workflow events in a single batch operation
 * AC-4: Use Drizzle batch insert with ON CONFLICT DO NOTHING for idempotency
 *
 * Resilient error handling: catches DB errors, logs warnings, never crashes
 * Chunking: splits large batches (>6500 events) to avoid PostgreSQL param limit
 *
 * @param events - Array of events to insert
 * @returns Promise that resolves when insert completes (or fails gracefully)
 */
export declare function insertWorkflowEventsBatch(events: WorkflowEventInput[]): Promise<void>;
//# sourceMappingURL=batch-insert.d.ts.map