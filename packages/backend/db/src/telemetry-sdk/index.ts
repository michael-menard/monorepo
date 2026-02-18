/**
 * Telemetry SDK Public API (INFR-0050)
 *
 * Event SDK for automatic telemetry event emission with:
 * - Hook-based API (withStepTracking, withStateTracking)
 * - Auto-enrichment with OpenTelemetry correlation IDs
 * - Buffered ingestion with configurable flush interval
 * - Graceful shutdown handling
 *
 * @example
 * ```typescript
 * import { initTelemetrySdk } from '@repo/db/telemetry-sdk'
 *
 * const sdk = initTelemetrySdk({ source: 'orchestrator' })
 *
 * // Track a step with automatic event emission
 * const result = await sdk.withStepTracking('analyze', async () => {
 *   // step logic
 *   return analysis
 * }, { tokensUsed: 500, model: 'sonnet' })
 *
 * // Track state transitions
 * await sdk.withStateTracking('STORY-001', 'backlog', 'in-progress')
 *
 * // Graceful shutdown
 * await sdk.shutdown()
 * ```
 */

// Core initialization
export { initTelemetrySdk, getSdkInstance } from './init.js'

// Configuration
export { validateConfig, DEFAULT_SDK_CONFIG } from './config.js'

// Type exports
export type {
  TelemetrySdkConfig,
  TelemetrySdk,
  StepTrackingOptions,
  StateTrackingOptions,
  BufferedEvent,
  BufferState,
} from './__types__/index.js'

// Utility exports (for advanced usage)
export { insertWorkflowEventsBatch } from './batch-insert.js'
export { chunkArray, BATCH_CHUNK_SIZE } from './utils/batch-chunker.js'
