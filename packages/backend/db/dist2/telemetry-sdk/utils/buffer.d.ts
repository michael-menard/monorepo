/**
 * Event Buffer State Management (INFR-0050 AC-3)
 *
 * Provides in-memory event buffer with auto-flush on size threshold or interval.
 * Thread-safe concurrent additions with overflow handling.
 */
import type { BufferedEvent, BufferState, TelemetrySdkConfig } from '../__types__/index.js';
import type { WorkflowEventInput } from '../../workflow-events.js';
/**
 * Create initial buffer state
 */
export declare function createBufferState(): BufferState;
/**
 * Add event to buffer with overflow handling
 * AC-3: Drop oldest events when buffer is full (configurable strategy)
 *
 * @param state - Current buffer state
 * @param event - Event to add
 * @param config - SDK configuration
 * @returns Updated buffer state
 */
export declare function addEventToBuffer(state: BufferState, event: WorkflowEventInput, config: TelemetrySdkConfig): BufferState;
/**
 * Get events to flush and clear buffer
 * AC-3: Returns buffered events and resets buffer state
 *
 * @param state - Current buffer state
 * @returns Tuple of [events to flush, updated state]
 */
export declare function getEventsToFlush(state: BufferState): [BufferedEvent[], BufferState];
/**
 * Mark flush as complete
 *
 * @param state - Current buffer state
 * @returns Updated state with isFlushing=false
 */
export declare function markFlushComplete(state: BufferState): BufferState;
/**
 * Check if buffer should auto-flush based on size threshold
 *
 * @param state - Current buffer state
 * @param config - SDK configuration
 * @returns True if buffer size >= configured threshold
 */
export declare function shouldFlushBySize(state: BufferState, config: TelemetrySdkConfig): boolean;
/**
 * Check if buffer should auto-flush based on time interval
 *
 * @param state - Current buffer state
 * @param config - SDK configuration
 * @returns True if time since last flush >= configured interval
 */
export declare function shouldFlushByInterval(state: BufferState, config: TelemetrySdkConfig): boolean;
/**
 * Check if buffer has events to flush
 *
 * @param state - Current buffer state
 * @returns True if buffer is not empty
 */
export declare function hasEventsToFlush(state: BufferState): boolean;
//# sourceMappingURL=buffer.d.ts.map