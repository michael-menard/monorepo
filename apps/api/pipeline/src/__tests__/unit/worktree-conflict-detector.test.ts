/**
 * Unit tests for WorktreeConflictDetector.
 *
 * AC-5: checkConflict returns [] for non-overlapping stories.
 * AC-6: checkConflict returns conflicting IDs for overlapping stories.
 * HP-6: Returns [] for non-overlapping paths.
 * ED-4: Returns ['APIP-A'] when stories share a path.
 */

import { describe, it, expect } from 'vitest'
import { WorktreeConflictDetector } from '../../conflicts/worktree-conflict-detector.js'
import type { StoryConflictDescriptor } from '../../conflicts/worktree-conflict-detector.js'

describe('WorktreeConflictDetector', () => {
  const detector = new WorktreeConflictDetector()

  // ============================================================================
  // HP-6: Non-overlapping paths → empty array
  // ============================================================================

  describe('checkConflict — no overlap', () => {
    it('HP-6: returns [] when incoming has no path overlap with active stories', () => {
      const incoming: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-B',
        touchedPathPrefixes: ['apps/web/main-app/src/', 'packages/core/app-component-library/'],
      }
      const active: StoryConflictDescriptor[] = [
        {
          storyId: 'APIP-TEST-A',
          touchedPathPrefixes: [
            'packages/backend/orchestrator/src/supervisor/',
            'apps/api/pipeline/src/',
          ],
        },
      ]

      const result = detector.checkConflict(incoming, active)

      expect(result).toEqual([])
    })

    it('returns [] when activeStories array is empty', () => {
      const incoming: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-B',
        touchedPathPrefixes: ['apps/web/'],
      }

      const result = detector.checkConflict(incoming, [])

      expect(result).toEqual([])
    })

    it('returns [] when incoming has empty touchedPathPrefixes', () => {
      const incoming: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-B',
        touchedPathPrefixes: [],
      }
      const active: StoryConflictDescriptor[] = [
        {
          storyId: 'APIP-TEST-A',
          touchedPathPrefixes: ['packages/backend/orchestrator/'],
        },
      ]

      const result = detector.checkConflict(incoming, active)

      expect(result).toEqual([])
    })
  })

  // ============================================================================
  // ED-4: Overlapping paths → returns conflicting story IDs
  // ============================================================================

  describe('checkConflict — overlap detected', () => {
    it('ED-4: returns [storyA.storyId] when stories share exact same path prefix', () => {
      const storyA: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-A',
        touchedPathPrefixes: ['packages/backend/orchestrator/src/supervisor/'],
      }
      const storyB: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-B',
        touchedPathPrefixes: ['packages/backend/orchestrator/src/supervisor/'],
      }

      const result = detector.checkConflict(storyB, [storyA])

      expect(result).toEqual(['APIP-TEST-A'])
    })

    it('detects overlap when incoming prefix is sub-path of active prefix', () => {
      const active: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-A',
        touchedPathPrefixes: ['packages/backend/orchestrator/src/'],
      }
      const incoming: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-B',
        touchedPathPrefixes: ['packages/backend/orchestrator/src/supervisor/'],
      }

      const result = detector.checkConflict(incoming, [active])

      expect(result).toEqual(['APIP-TEST-A'])
    })

    it('detects overlap when active prefix is sub-path of incoming prefix', () => {
      const active: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-A',
        touchedPathPrefixes: ['packages/backend/orchestrator/src/supervisor/'],
      }
      const incoming: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-B',
        touchedPathPrefixes: ['packages/backend/orchestrator/src/'],
      }

      const result = detector.checkConflict(incoming, [active])

      expect(result).toEqual(['APIP-TEST-A'])
    })

    it('returns multiple conflicting IDs when several active stories overlap', () => {
      const activeA: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-A',
        touchedPathPrefixes: ['packages/backend/'],
      }
      const activeB: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-B',
        touchedPathPrefixes: ['packages/backend/orchestrator/'],
      }
      const incoming: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-C',
        touchedPathPrefixes: ['packages/backend/orchestrator/src/'],
      }

      const result = detector.checkConflict(incoming, [activeA, activeB])

      expect(result).toContain('APIP-TEST-A')
      expect(result).toContain('APIP-TEST-B')
      expect(result).toHaveLength(2)
    })

    it('only returns stories that overlap, not all active stories', () => {
      const activeA: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-A',
        touchedPathPrefixes: ['packages/backend/orchestrator/'],
      }
      const activeB: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-B',
        touchedPathPrefixes: ['apps/web/main-app/'],
      }
      const incoming: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-C',
        touchedPathPrefixes: ['packages/backend/orchestrator/src/'],
      }

      const result = detector.checkConflict(incoming, [activeA, activeB])

      expect(result).toEqual(['APIP-TEST-A'])
    })
  })

  // ============================================================================
  // Prefix normalisation edge cases
  // ============================================================================

  describe('prefix normalisation', () => {
    it('handles trailing slash in one prefix but not the other', () => {
      const active: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-A',
        // no trailing slash
        touchedPathPrefixes: ['packages/backend/orchestrator/src'],
      }
      const incoming: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-B',
        // with trailing slash
        touchedPathPrefixes: ['packages/backend/orchestrator/src/'],
      }

      const result = detector.checkConflict(incoming, [active])

      expect(result).toEqual(['APIP-TEST-A'])
    })

    it('does not flag paths that share only a string prefix (not path boundary)', () => {
      // 'packages/backend/orchestrator' vs 'packages/backend/orchestrator-v2'
      // These should NOT conflict because they are different directories
      const active: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-A',
        touchedPathPrefixes: ['packages/backend/orchestrator/'],
      }
      const incoming: StoryConflictDescriptor = {
        storyId: 'APIP-TEST-B',
        touchedPathPrefixes: ['packages/backend/orchestrator-v2/'],
      }

      const result = detector.checkConflict(incoming, [active])

      // 'packages/backend/orchestrator/' does NOT start with 'packages/backend/orchestrator-v2/'
      // and 'packages/backend/orchestrator-v2/' does NOT start with 'packages/backend/orchestrator/'
      expect(result).toEqual([])
    })
  })
})
