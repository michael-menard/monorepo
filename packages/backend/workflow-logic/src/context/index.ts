/**
 * Context query builder
 *
 * Pure string builder functions for constructing canonical KB search queries.
 * No KB calls, no network I/O — just deterministic string composition.
 *
 * AC-3: buildContextQuery, buildBlockerQuery
 *
 * Source: kb-integration.md Query Examples by Agent Role section
 */

// ============================================================================
// Public API
// ============================================================================

/**
 * Builds a canonical KB search query from structured parts.
 *
 * The query format follows the kb-integration.md pattern:
 *   "{domain} {taskType} patterns"
 * or with optional role:
 *   "{role} {domain} {taskType} patterns"
 *
 * Examples:
 *   buildContextQuery('backend', 'api endpoint') → 'backend api endpoint patterns'
 *   buildContextQuery('frontend', 'react component', 'dev') → 'dev frontend react component patterns'
 *
 * @param domain - The domain area (e.g. 'backend', 'frontend', 'database')
 * @param taskType - The type of task (e.g. 'api endpoint', 'component', 'migration')
 * @param role - Optional agent role (e.g. 'dev', 'pm', 'qa')
 * @returns A canonical KB search query string
 */
export function buildContextQuery(domain: string, taskType: string, role?: string): string {
  const parts: string[] = []

  if (role && role.trim().length > 0) {
    parts.push(role.trim())
  }

  if (domain.trim().length > 0) {
    parts.push(domain.trim())
  }

  if (taskType.trim().length > 0) {
    parts.push(taskType.trim())
  }

  if (parts.length === 0) {
    return 'patterns'
  }

  return parts.join(' ') + ' patterns'
}

/**
 * Builds a canonical KB search query for finding blockers and lessons.
 *
 * The query format follows the kb-integration.md pattern:
 *   "{domain} blockers lessons"
 *
 * Examples:
 *   buildBlockerQuery('backend') → 'backend blockers lessons'
 *   buildBlockerQuery('database') → 'database blockers lessons'
 *
 * @param domain - The domain area to search for blockers
 * @returns A canonical KB blocker search query string
 */
export function buildBlockerQuery(domain: string): string {
  if (domain.trim().length === 0) {
    return 'blockers lessons'
  }

  return `${domain.trim()} blockers lessons`
}
