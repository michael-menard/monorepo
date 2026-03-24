/**
 * Intake Adapter Utilities
 *
 * Shared utilities for intake adapters.
 */

/**
 * Convert a plan title to a URL-safe slug.
 *
 * @example slugify('My Cool Plan') => 'my-cool-plan'
 * @example slugify('Hello World!!! 123') => 'hello-world-123'
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Map NormalizedPlan priority string to KB P1-P5 enum.
 *
 * @example mapPriority('critical') => 'P1'
 * @example mapPriority('medium') => 'P3'
 */
export function mapPriority(priority: string): 'P1' | 'P2' | 'P3' | 'P4' | 'P5' {
  const map: Record<string, 'P1' | 'P2' | 'P3' | 'P4' | 'P5'> = {
    critical: 'P1',
    high: 'P2',
    medium: 'P3',
    low: 'P4',
    lowest: 'P5',
  }
  return map[priority] ?? 'P3'
}
