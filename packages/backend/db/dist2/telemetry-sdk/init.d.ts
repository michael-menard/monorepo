/**
 * Telemetry SDK Initialization (INFR-0050 AC-6, AC-8)
 *
 * Provides initTelemetrySdk() for SDK initialization with:
 * - Singleton pattern
 * - Flush timer management
 * - SIGTERM/SIGINT shutdown handlers
 * - Graceful shutdown with timeout
 */
import type { TelemetrySdkConfig, TelemetrySdk } from './__types__/index.js';
/**
 * AC-8: Initialize Telemetry SDK
 * Singleton pattern - returns cached instance on subsequent calls
 *
 * @param config - SDK configuration (partial or full)
 * @returns SDK instance with hook functions and shutdown method
 */
export declare function initTelemetrySdk(config: Partial<TelemetrySdkConfig> & Pick<TelemetrySdkConfig, 'source'>): TelemetrySdk;
/**
 * Get current SDK instance (if initialized)
 * @returns SDK instance or null
 */
export declare function getSdkInstance(): TelemetrySdk | null;
//# sourceMappingURL=init.d.ts.map