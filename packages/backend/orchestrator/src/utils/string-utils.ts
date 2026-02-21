/**
 * string-utils.ts
 *
 * Shared string utility functions for the orchestrator package.
 *
 * @module utils/string-utils
 */

/**
 * Escapes special regex metacharacters in a string so it can be used
 * as a literal pattern in a RegExp constructor.
 *
 * @param str - The input string to escape
 * @returns The string with all regex special characters escaped
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
