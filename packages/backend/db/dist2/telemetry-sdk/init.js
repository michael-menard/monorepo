/**
 * Telemetry SDK Initialization (INFR-0050 AC-6, AC-8)
 *
 * Provides initTelemetrySdk() for SDK initialization with:
 * - Singleton pattern
 * - Flush timer management
 * - SIGTERM/SIGINT shutdown handlers
 * - Graceful shutdown with timeout
 */
import { logger } from '@repo/logger';
import { validateConfig } from './config.js';
import { createBufferState, getEventsToFlush, markFlushComplete, hasEventsToFlush, } from './utils/buffer.js';
import { startFlushTimer, stopFlushTimer } from './utils/flush-timer.js';
import { insertWorkflowEventsBatch } from './batch-insert.js';
import { withStepTracking as withStepTrackingImpl, withStateTracking as withStateTrackingImpl, } from './hooks.js';
/**
 * Singleton SDK instance
 */
let sdkInstance = null;
let sdkConfig = null;
let bufferState = null;
let flushTimer = null;
let shutdownHandlersRegistered = false;
/**
 * Flush buffer to database
 * Called by timer or manual flush
 */
async function flushBuffer() {
    if (!bufferState || !sdkConfig) {
        return;
    }
    const [eventsToFlush, newState] = getEventsToFlush(bufferState);
    bufferState = newState;
    if (eventsToFlush.length === 0) {
        bufferState = markFlushComplete(bufferState);
        return;
    }
    logger.debug('[telemetry-sdk] Flushing buffer', { eventCount: eventsToFlush.length });
    try {
        await insertWorkflowEventsBatch(eventsToFlush.map(e => e.event));
        logger.debug('[telemetry-sdk] Buffer flush complete', { eventCount: eventsToFlush.length });
    }
    catch (error) {
        logger.warn('[telemetry-sdk] Buffer flush failed', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
    finally {
        if (bufferState) {
            bufferState = markFlushComplete(bufferState);
        }
    }
}
/**
 * Shutdown SDK and flush remaining events
 * AC-6: Graceful shutdown with 5s timeout
 */
async function shutdown() {
    logger.info('[telemetry-sdk] Shutting down');
    // Stop flush timer
    if (flushTimer) {
        stopFlushTimer(flushTimer);
        flushTimer = null;
    }
    // Flush remaining events with timeout
    if (bufferState && hasEventsToFlush(bufferState)) {
        const flushPromise = flushBuffer();
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));
        try {
            await Promise.race([flushPromise, timeoutPromise]);
            logger.info('[telemetry-sdk] Shutdown flush complete');
        }
        catch (error) {
            logger.warn('[telemetry-sdk] Shutdown flush failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    // Clear state
    sdkInstance = null;
    sdkConfig = null;
    bufferState = null;
}
/**
 * Register SIGTERM/SIGINT handlers for graceful shutdown
 * AC-6: Ensure buffered events are persisted before process exit
 */
function registerShutdownHandlers() {
    if (shutdownHandlersRegistered) {
        return;
    }
    const handleShutdown = async (signal) => {
        logger.info(`[telemetry-sdk] Received ${signal}, shutting down`);
        await shutdown();
        process.exit(0);
    };
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    shutdownHandlersRegistered = true;
}
/**
 * AC-8: Initialize Telemetry SDK
 * Singleton pattern - returns cached instance on subsequent calls
 *
 * @param config - SDK configuration (partial or full)
 * @returns SDK instance with hook functions and shutdown method
 */
export function initTelemetrySdk(config) {
    // Singleton: return existing instance if already initialized
    if (sdkInstance) {
        logger.debug('[telemetry-sdk] SDK already initialized, returning existing instance');
        return sdkInstance;
    }
    // Validate and merge config with defaults
    sdkConfig = validateConfig(config);
    // Initialize buffer state
    bufferState = createBufferState();
    logger.info('[telemetry-sdk] Initializing SDK', {
        source: sdkConfig.source,
        enableBuffering: sdkConfig.enableBuffering,
        bufferSize: sdkConfig.bufferSize,
        flushIntervalMs: sdkConfig.flushIntervalMs,
    });
    // Start flush timer if buffering enabled
    if (sdkConfig.enableBuffering) {
        flushTimer = startFlushTimer(sdkConfig.flushIntervalMs, () => {
            flushBuffer().catch(error => {
                logger.warn('[telemetry-sdk] Scheduled flush failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        });
    }
    // Register shutdown handlers
    registerShutdownHandlers();
    // Create SDK instance
    sdkInstance = {
        withStepTracking: async (stepName, operation, options) => {
            if (!sdkConfig || !bufferState) {
                throw new Error('[telemetry-sdk] SDK not initialized');
            }
            // Create a ref object for bufferState to match function signature
            const bufferStateRef = { current: bufferState };
            const result = await withStepTrackingImpl(stepName, operation, options ?? {}, sdkConfig, bufferStateRef);
            // Sync back the mutated state
            bufferState = bufferStateRef.current;
            return result;
        },
        withStateTracking: async (itemId, fromState, toState, options) => {
            if (!sdkConfig) {
                throw new Error('[telemetry-sdk] SDK not initialized');
            }
            return withStateTrackingImpl(itemId, fromState, toState, options, sdkConfig);
        },
        shutdown,
        flush: flushBuffer,
    };
    return sdkInstance;
}
/**
 * Get current SDK instance (if initialized)
 * @returns SDK instance or null
 */
export function getSdkInstance() {
    return sdkInstance;
}
