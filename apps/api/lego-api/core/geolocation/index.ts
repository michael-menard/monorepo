/**
 * Geolocation Service (WISH-2047)
 *
 * Exports geolocation lookup functionality using MaxMind GeoLite2 database.
 */

export {
  // Types
  type GeolocationData,
  type GeolocationResult,
  type GeolocationConfig,
  // Schemas
  GeolocationDataSchema,
  GeolocationResultSchema,
  GeolocationConfigSchema,
} from './types.js'

export {
  // Functions
  initializeReader,
  lookupGeolocation,
  getGeolocation,
  isReaderInitialized,
  // Testing utilities
  __resetReader,
} from './geoip.js'
