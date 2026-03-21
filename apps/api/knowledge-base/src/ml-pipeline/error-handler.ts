/**
 * Shared error handling utilities for ML Pipeline MCP Tools
 * WINT-0140: Create ML Pipeline MCP Tools
 */

/**
 * Extracts a string message from an unknown error value.
 * Handles Error instances and non-Error throws (strings, objects, etc.).
 *
 * @param error - The caught error value (unknown type)
 * @returns A string representation of the error message
 */
export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
