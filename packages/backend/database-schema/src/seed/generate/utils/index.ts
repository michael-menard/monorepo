/**
 * Shared utility functions for the generateStoriesIndex module.
 */

/**
 * Capitalise the first letter of a string.
 * e.g., 'pending' → 'Pending'
 */
export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Format a Date as an ISO 8601 UTC string without milliseconds.
 * e.g., 2026-03-03T14:10:00Z
 */
export function toIsoUtc(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}
