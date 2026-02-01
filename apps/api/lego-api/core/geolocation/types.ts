/**
 * Geolocation Types (WISH-2047)
 *
 * Zod schemas and types for geolocation data used in audit logging.
 */

import { z } from 'zod'

/**
 * Geolocation data schema
 *
 * Represents location information derived from IP address lookup.
 * All fields are nullable since geolocation may fail or return partial data.
 */
export const GeolocationDataSchema = z.object({
  /** ISO 3166-1 country code (e.g., "US", "GB") */
  country: z.string().nullable(),

  /** Country name (e.g., "United States", "United Kingdom") */
  countryName: z.string().nullable(),

  /** Region/state/province (e.g., "California", "England") */
  region: z.string().nullable(),

  /** City name (e.g., "San Francisco", "London") */
  city: z.string().nullable(),

  /** Geographic latitude coordinate */
  latitude: z.number().nullable(),

  /** Geographic longitude coordinate */
  longitude: z.number().nullable(),
})

export type GeolocationData = z.infer<typeof GeolocationDataSchema>

/**
 * Geolocation lookup result schema
 *
 * Wraps geolocation data with metadata about the lookup.
 */
export const GeolocationResultSchema = z.object({
  /** Whether the lookup was successful */
  success: z.boolean(),

  /** The IP address that was looked up */
  ip: z.string(),

  /** Geolocation data if lookup was successful */
  data: GeolocationDataSchema.nullable(),

  /** Lookup duration in milliseconds */
  durationMs: z.number(),

  /** Error message if lookup failed */
  error: z.string().optional(),
})

export type GeolocationResult = z.infer<typeof GeolocationResultSchema>

/**
 * Geolocation service configuration schema
 */
export const GeolocationConfigSchema = z.object({
  /** Path to the MaxMind GeoLite2 database file */
  databasePath: z.string().default('/opt/geolite2-city.mmdb'),

  /** Maximum lookup duration before timeout (ms) */
  timeoutMs: z.number().default(10),

  /** Whether to enable caching */
  enableCache: z.boolean().default(true),
})

export type GeolocationConfig = z.infer<typeof GeolocationConfigSchema>
