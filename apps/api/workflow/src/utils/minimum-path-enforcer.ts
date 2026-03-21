/**
 * Minimum Path Enforcer
 *
 * APRS-1030: Validates that each batch contains at least one story
 * flagged as minimum_path = true. Provides both a soft-check form
 * (returns a result object) and a hard-assert form (throws on violation).
 */

/**
 * Error thrown when a batch has no minimum-path story.
 */
export class MinimumPathViolationError extends Error {
  constructor(
    public planSlug: string,
    public storyIds: string[],
  ) {
    super(
      `Batch for plan "${planSlug}" has no minimum-path story. Stories in batch: ${storyIds.join(', ')}`,
    )
    this.name = 'MinimumPathViolationError'
  }
}

/**
 * Checks whether a batch contains at least one minimum-path story.
 *
 * Empty batches are considered vacuously valid (no enforcement needed
 * when there is nothing to enforce against).
 *
 * @param stories  - Array of story descriptors with storyId and minimumPath flag
 * @param planSlug - Plan identifier used in error messages
 * @returns `{ valid: true }` on success, or `{ valid: false, error: string }` on violation
 */
export function enforceMinimumPathInBatch(
  stories: Array<{ storyId: string; minimumPath: boolean }>,
  planSlug: string,
): { valid: boolean; error?: string } {
  if (stories.length === 0) {
    return { valid: true } // empty batch is vacuously valid
  }
  const hasMinimumPath = stories.some(s => s.minimumPath)
  if (!hasMinimumPath) {
    return {
      valid: false,
      error: `Batch for plan "${planSlug}" has no minimum-path story. Stories in batch: ${stories.map(s => s.storyId).join(', ')}`,
    }
  }
  return { valid: true }
}

/**
 * Asserts that a batch contains at least one minimum-path story.
 * Throws {@link MinimumPathViolationError} on violation.
 *
 * @param stories  - Array of story descriptors with storyId and minimumPath flag
 * @param planSlug - Plan identifier used in error messages
 * @throws MinimumPathViolationError when the batch has no minimum-path story
 */
export function assertMinimumPathInBatch(
  stories: Array<{ storyId: string; minimumPath: boolean }>,
  planSlug: string,
): void {
  const result = enforceMinimumPathInBatch(stories, planSlug)
  if (!result.valid) {
    throw new MinimumPathViolationError(
      planSlug,
      stories.map(s => s.storyId),
    )
  }
}
