/**
 * Geolocation Service (WISH-2047)
 *
 * Provides IP geolocation lookup using MaxMind GeoLite2 database.
 * Uses singleton pattern for in-memory database caching (Lambda warm starts).
 *
 * Features:
 * - Singleton database reader for performance
 * - Graceful fallback on lookup failure
 * - Performance monitoring (< 10ms target)
 * - IPv4 and IPv6 support
 */

import { Reader, ReaderModel, City } from '@maxmind/geoip2-node'
import { logger } from '@repo/logger'
import type { GeolocationData, GeolocationResult, GeolocationConfig } from './types.js'
import { GeolocationConfigSchema } from './types.js'

/** Singleton database reader instance */
let readerInstance: ReaderModel | null = null

/** Flag to track initialization attempts */
let initializationAttempted = false

/** Default configuration */
const DEFAULT_CONFIG: GeolocationConfig = {
  databasePath: process.env.GEOIP_DATABASE_PATH || '/opt/geolite2-city.mmdb',
  timeoutMs: 10,
  enableCache: true,
}

/**
 * Initialize the MaxMind database reader
 *
 * Uses singleton pattern - only initializes once.
 * Returns null if database is unavailable (graceful degradation).
 *
 * @param config - Optional configuration override
 * @returns The database reader instance or null
 */
export async function initializeReader(
  config: Partial<GeolocationConfig> = {},
): Promise<ReaderModel | null> {
  // Return existing instance if available
  if (readerInstance) {
    return readerInstance
  }

  // Don't retry if initialization already failed
  if (initializationAttempted && !readerInstance) {
    return null
  }

  initializationAttempted = true

  try {
    const mergedConfig = GeolocationConfigSchema.parse({ ...DEFAULT_CONFIG, ...config })

    readerInstance = await Reader.open(mergedConfig.databasePath)

    logger.info('MaxMind GeoLite2 database initialized', {
      databasePath: mergedConfig.databasePath,
    })

    return readerInstance
  } catch (error) {
    // Log warning but don't throw - graceful degradation
    logger.warn('Failed to initialize MaxMind database - geolocation will be unavailable', {
      error: error instanceof Error ? error.message : String(error),
      databasePath: config.databasePath || DEFAULT_CONFIG.databasePath,
    })

    return null
  }
}

/**
 * Look up geolocation data for an IP address
 *
 * Returns null if:
 * - Database is not initialized
 * - IP is invalid or not found
 * - Lookup takes longer than timeout
 *
 * @param ip - The IP address to look up
 * @param config - Optional configuration override
 * @returns Geolocation result with data and timing
 */
export async function lookupGeolocation(
  ip: string,
  config: Partial<GeolocationConfig> = {},
): Promise<GeolocationResult> {
  const startTime = performance.now()
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  // Validate IP input
  if (!ip || typeof ip !== 'string') {
    return {
      success: false,
      ip: ip || 'unknown',
      data: null,
      durationMs: performance.now() - startTime,
      error: 'Invalid IP address',
    }
  }

  try {
    // Initialize reader if not already done
    const reader = await initializeReader(config)

    if (!reader) {
      return {
        success: false,
        ip,
        data: null,
        durationMs: performance.now() - startTime,
        error: 'Database not available',
      }
    }

    // Perform lookup with timeout protection
    // Note: reader.city() is synchronous but we wrap in Promise for timeout handling
    const lookupPromise = Promise.resolve(reader.city(ip))
    const timeoutPromise = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), mergedConfig.timeoutMs),
    )

    const result = (await Promise.race([lookupPromise, timeoutPromise])) as City | null

    const durationMs = performance.now() - startTime

    // Handle timeout
    if (result === null) {
      logger.warn('Geolocation lookup timed out', {
        ip,
        timeoutMs: mergedConfig.timeoutMs,
      })

      return {
        success: false,
        ip,
        data: null,
        durationMs,
        error: 'Lookup timeout',
      }
    }

    // Extract geolocation data
    const geoData: GeolocationData = {
      country: result.country?.isoCode ?? null,
      countryName: result.country?.names?.en ?? null,
      region: result.subdivisions?.[0]?.names?.en ?? null,
      city: result.city?.names?.en ?? null,
      latitude: result.location?.latitude ?? null,
      longitude: result.location?.longitude ?? null,
    }

    return {
      success: true,
      ip,
      data: geoData,
      durationMs,
    }
  } catch (error) {
    const durationMs = performance.now() - startTime

    // Log non-blocking warning
    logger.warn('Geolocation lookup failed', {
      ip,
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    })

    return {
      success: false,
      ip,
      data: null,
      durationMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Simple geolocation lookup that returns only the data
 *
 * Convenience wrapper for cases where you only need the data,
 * not the full result with metadata.
 *
 * @param ip - The IP address to look up
 * @returns Geolocation data or null
 */
export async function getGeolocation(ip: string): Promise<GeolocationData | null> {
  const result = await lookupGeolocation(ip)
  return result.data
}

/**
 * Reset the reader instance (for testing)
 *
 * Clears the singleton instance to allow re-initialization.
 * Only exported for testing purposes.
 */
export function __resetReader(): void {
  readerInstance = null
  initializationAttempted = false
}

/**
 * Check if the reader is initialized (for testing/health checks)
 */
export function isReaderInitialized(): boolean {
  return readerInstance !== null
}
