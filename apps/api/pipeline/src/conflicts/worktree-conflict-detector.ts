/**
 * WorktreeConflictDetector — detects overlapping file path prefixes between stories.
 *
 * AC-5: checkConflict returns conflicting story IDs when two stories share file path prefixes.
 * AC-6: Used by PipelineSupervisor to enforce conflictPolicy: 'reject'.
 *
 * Implementation note: Uses story-level path prefix comparison as a conservative proxy.
 * Full ChangeSpec integration deferred to APIP-1020. Story file sets are derived from
 * touchedPathPrefixes provided at dispatch time (from story.yaml surface fields).
 *
 * @module conflicts/worktree-conflict-detector
 */

import { z } from 'zod'

/**
 * Minimal story descriptor for conflict detection.
 * Consumers provide touched path prefixes from story.yaml surface fields.
 */
export const StoryConflictDescriptorSchema = z.object({
  /** Story identifier (e.g. 'APIP-1010') */
  storyId: z.string().min(1),
  /**
   * File path prefixes this story touches.
   * E.g. ['packages/backend/orchestrator/src/supervisor/', 'apps/api/pipeline/src/']
   */
  touchedPathPrefixes: z.array(z.string().min(1)),
})

export type StoryConflictDescriptor = z.infer<typeof StoryConflictDescriptorSchema>

/**
 * Detects worktree file path conflicts between an incoming story and active stories.
 *
 * Uses prefix-based overlap detection: two stories conflict if any path prefix
 * of the incoming story is a prefix of (or equals) any path prefix of an active
 * story, or vice versa.
 */
export class WorktreeConflictDetector {
  /**
   * Checks whether the incoming story conflicts with any of the active stories.
   *
   * Returns the array of conflicting storyIds (empty = no conflict).
   *
   * AC-5: Returns [] for non-overlapping stories.
   * ED-4: Returns ['APIP-A'] when stories share a path prefix.
   *
   * @param incoming - Story being dispatched
   * @param activeStories - Currently executing stories
   * @returns Array of conflicting story IDs
   */
  checkConflict(
    incoming: StoryConflictDescriptor,
    activeStories: StoryConflictDescriptor[],
  ): string[] {
    const conflicting: string[] = []

    for (const active of activeStories) {
      if (this.hasPathOverlap(incoming.touchedPathPrefixes, active.touchedPathPrefixes)) {
        conflicting.push(active.storyId)
      }
    }

    return conflicting
  }

  /**
   * Checks whether two sets of path prefixes overlap.
   *
   * Two prefixes overlap when either is a prefix of the other or they are equal.
   * This is a conservative check — it may produce false positives for unrelated
   * files that share a directory prefix, but never false negatives.
   *
   * @param prefixesA - Path prefixes from story A
   * @param prefixesB - Path prefixes from story B
   * @returns true if any pair of prefixes overlap
   */
  private hasPathOverlap(prefixesA: string[], prefixesB: string[]): boolean {
    for (const a of prefixesA) {
      for (const b of prefixesB) {
        if (this.prefixesOverlap(a, b)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Determines if two path strings overlap (either is a prefix of the other, or equal).
   *
   * Normalises trailing slashes for consistent comparison.
   */
  private prefixesOverlap(a: string, b: string): boolean {
    const normalA = a.endsWith('/') ? a : `${a}/`
    const normalB = b.endsWith('/') ? b : `${b}/`
    return normalA.startsWith(normalB) || normalB.startsWith(normalA)
  }
}
