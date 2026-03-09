/**
 * Telemetry SDK Configuration (INFR-0050 AC-7)
 *
 * Provides default configuration and validation for the telemetry SDK.
 */
import { TelemetrySdkConfigSchema } from './__types__/index.js';
/**
 * Default SDK Configuration
 * Used when partial config is provided to initTelemetrySdk()
 */
export const DEFAULT_SDK_CONFIG = {
    enableBuffering: true,
    bufferSize: 100,
    flushIntervalMs: 5000,
    overflowStrategy: 'drop-oldest',
};
/**
 * Validate and merge SDK configuration with defaults
 * Uses Zod schema for runtime validation
 *
 * @param config - User-provided configuration (partial or full)
 * @returns Validated configuration with defaults applied
 * @throws ZodError if configuration is invalid
 */
export function validateConfig(config) {
    const merged = {
        ...DEFAULT_SDK_CONFIG,
        ...config,
    };
    return TelemetrySdkConfigSchema.parse(merged);
}
