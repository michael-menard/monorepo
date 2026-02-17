/**
 * Event Buffer State Management (INFR-0050 AC-3)
 *
 * Provides in-memory event buffer with auto-flush on size threshold or interval.
 * Thread-safe concurrent additions with overflow handling.
 */

import { logger } from '@repo/logger'
import type { BufferedEvent, BufferState, TelemetrySdkConfig } from '../__types__/index'
import type { WorkflowEventInput } from '../../workflow-events'

/**
 * Create initial buffer state
 */
export function createBufferState(): BufferState {
  return {
    events: [],
    isFlushing: false,
    lastFlushTime: new Date(),
  }
}

/**
 * Add event to buffer with overflow handling
 * AC-3: Drop oldest events when buffer is full (configurable strategy)
 *
 * @param state - Current buffer state
 * @param event - Event to add
 * @param config - SDK configuration
 * @returns Updated buffer state
 */
export function addEventToBuffer(
  state: BufferState,
  event: WorkflowEventInput,
  config: TelemetrySdkConfig,
): BufferState {
  const bufferedEvent: BufferedEvent = {
    event,
    timestamp: new Date(),
  }

  // Handle buffer overflow based on strategy
  if (state.events.length >= config.bufferSize) {
    switch (config.overflowStrategy) {
      case 'drop-oldest':
        // Remove oldest event and warn
        const dropped = state.events.shift()
        logger.warn('[telemetry-sdk] Buffer overflow: dropping oldest event', {
          droppedEventId: dropped?.event.eventId,
          bufferSize: config.bufferSize,
        })
        break

      case 'error':
        throw new Error(
          `[telemetry-sdk] Buffer overflow: buffer size limit ${config.bufferSize} reached`,
        )

      case 'block':
        // Block is handled by caller (don't add event until flush completes)
        logger.warn('[telemetry-sdk] Buffer overflow: blocking event emission', {
          bufferSize: config.bufferSize,
        })
        return state
    }
  }

  return {
    ...state,
    events: [...state.events, bufferedEvent],
  }
}

/**
 * Get events to flush and clear buffer
 * AC-3: Returns buffered events and resets buffer state
 *
 * @param state - Current buffer state
 * @returns Tuple of [events to flush, updated state]
 */
export function getEventsToFlush(state: BufferState): [BufferedEvent[], BufferState] {
  if (state.isFlushing) {
    // Already flushing, return empty array
    return [[], state]
  }

  const eventsToFlush = [...state.events]

  return [
    eventsToFlush,
    {
      events: [],
      isFlushing: true,
      lastFlushTime: new Date(),
    },
  ]
}

/**
 * Mark flush as complete
 *
 * @param state - Current buffer state
 * @returns Updated state with isFlushing=false
 */
export function markFlushComplete(state: BufferState): BufferState {
  return {
    ...state,
    isFlushing: false,
  }
}

/**
 * Check if buffer should auto-flush based on size threshold
 *
 * @param state - Current buffer state
 * @param config - SDK configuration
 * @returns True if buffer size >= configured threshold
 */
export function shouldFlushBySize(state: BufferState, config: TelemetrySdkConfig): boolean {
  return state.events.length >= config.bufferSize
}

/**
 * Check if buffer should auto-flush based on time interval
 *
 * @param state - Current buffer state
 * @param config - SDK configuration
 * @returns True if time since last flush >= configured interval
 */
export function shouldFlushByInterval(state: BufferState, config: TelemetrySdkConfig): boolean {
  const timeSinceLastFlush = Date.now() - state.lastFlushTime.getTime()
  return timeSinceLastFlush >= config.flushIntervalMs
}

/**
 * Check if buffer has events to flush
 *
 * @param state - Current buffer state
 * @returns True if buffer is not empty
 */
export function hasEventsToFlush(state: BufferState): boolean {
  return state.events.length > 0
}
