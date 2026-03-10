/**
 * Telemetry Hook Functions (INFR-0050 AC-1, AC-2, AC-5)
 *
 * Hook-based API for automatic event emission with OTel auto-enrichment.
 * - withStepTracking: Wraps step operations, emits step_completed events
 * - withStateTracking: Emits item_state_changed events immediately
 */
import type { StepTrackingOptions, StateTrackingOptions, TelemetrySdkConfig, BufferState } from './__types__/index.js';
/**
 * AC-1: Create withStepTracking hook function
 * Wraps a step operation, auto-emits step_completed event on success/error
 *
 * @param stepName - Name of the step being tracked
 * @param operation - Async operation to execute
 * @param options - Optional metadata (tokens, model, etc.)
 * @param config - SDK configuration
 * @param bufferState - Buffer state for event buffering
 * @returns Result of the operation (transparent wrapper)
 */
export declare function withStepTracking<T>(stepName: string, operation: () => Promise<T>, options: StepTrackingOptions | undefined, config: TelemetrySdkConfig, bufferStateRef: {
    current: BufferState;
}): Promise<T>;
/**
 * AC-2: Create withStateTracking function
 * Emits item_state_changed event immediately (bypasses buffer)
 *
 * @param itemId - ID of the item changing state
 * @param fromState - Previous state
 * @param toState - New state
 * @param options - Optional metadata (reason, etc.)
 * @param config - SDK configuration
 * @returns Promise that resolves when event is emitted
 */
export declare function withStateTracking(itemId: string, fromState: string, toState: string, options: Partial<StateTrackingOptions> | undefined, config: TelemetrySdkConfig): Promise<void>;
//# sourceMappingURL=hooks.d.ts.map