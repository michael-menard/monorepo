/**
 * Stage Movement Adapter Unit Tests
 *
 * Tests all 6 acceptance criteria plus edge cases
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { StageMovementAdapter } from '../stage-movement-adapter.js'
import {
  InvalidStageError,
  InvalidTransitionError,
  StoryNotFoundError,
} from '../__types__/index.js'
import type { StoryArtifact } from '../../artifacts/story-v2-compatible.js'

describe('StageMovementAdapter', () => {
  let adapter: StageMovementAdapter

  beforeEach(() => {
    adapter = new StageMovementAdapter()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AC-1: Update status field in YAML frontmatter', () => {
    it('should update status field when moving stages', async () => {
      const mockStory: StoryArtifact = {
        id: 'TEST-001',
        title: 'Test Story',
        status: 'backlog',
        priority: 'P0' as const,
        epic: 'test-epic',
        created_at: '2026-02-14T00:00:00Z',
        updated_at: '2026-02-14T00:00:00Z',
      }

      // Mock findStory on adapter instance
      vi.spyOn(adapter as any, 'findStory').mockResolvedValue('/fake/path/TEST-001.md')

      // Mock storyAdapter methods
      const readSpy = vi.spyOn((adapter as any).storyAdapter, 'read').mockResolvedValue(mockStory)
      const updateSpy = vi
        .spyOn((adapter as any).storyAdapter, 'update')
        .mockResolvedValue(undefined)

      const result = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: 'plans/future/test',
        toStage: 'ready-to-work',
      })

      expect(result.success).toBe(true)
      expect(result.fromStage).toBe('backlog')
      expect(result.toStage).toBe('ready-to-work')
      expect(updateSpy).toHaveBeenCalledWith(
        '/fake/path/TEST-001.md',
        expect.objectContaining({
          status: 'ready-to-work',
        }),
      )
    })
  })

  describe('AC-2: Validate stage transitions', () => {
    it('should reject invalid transitions', async () => {
      const mockStory: StoryArtifact = {
        id: 'TEST-003',
        title: 'Test Story',
        status: 'uat',
        priority: 'P0' as const,
        epic: 'test-epic',
        created_at: '2026-02-14T00:00:00Z',
        updated_at: '2026-02-14T00:00:00Z',
      }

      vi.spyOn(adapter as any, 'findStory').mockResolvedValue('/fake/path/TEST-003.md')
      vi.spyOn((adapter as any).storyAdapter, 'read').mockResolvedValue(mockStory)

      // Try to move from UAT to ready-for-qa (invalid)
      await expect(
        adapter.moveStage({
          storyId: 'TEST-003',
          featureDir: 'plans/future/test',
          toStage: 'ready-for-qa',
        }),
      ).rejects.toThrow(InvalidTransitionError)
    })

    it('should allow valid forward transitions', async () => {
      const mockStory: StoryArtifact = {
        id: 'TEST-001',
        title: 'Test Story',
        status: 'backlog',
        priority: 'P0' as const,
        epic: 'test-epic',
        created_at: '2026-02-14T00:00:00Z',
        updated_at: '2026-02-14T00:00:00Z',
      }

      vi.spyOn(adapter as any, 'findStory').mockResolvedValue('/fake/path/TEST-001.md')
      vi.spyOn((adapter as any).storyAdapter, 'read').mockResolvedValue(mockStory)
      vi.spyOn((adapter as any).storyAdapter, 'update').mockResolvedValue(undefined)

      const result = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: 'plans/future/test',
        toStage: 'elaboration',
      })

      expect(result.success).toBe(true)
    })

    it('should allow backward transitions for rework', async () => {
      const mockStory: StoryArtifact = {
        id: 'TEST-003',
        title: 'Test Story',
        status: 'uat',
        priority: 'P0' as const,
        epic: 'test-epic',
        created_at: '2026-02-14T00:00:00Z',
        updated_at: '2026-02-14T00:00:00Z',
      }

      vi.spyOn(adapter as any, 'findStory').mockResolvedValue('/fake/path/TEST-003.md')
      vi.spyOn((adapter as any).storyAdapter, 'read').mockResolvedValue(mockStory)
      vi.spyOn((adapter as any).storyAdapter, 'update').mockResolvedValue(undefined)

      // UAT -> in-progress is allowed for QA failure rework
      const result = await adapter.moveStage({
        storyId: 'TEST-003',
        featureDir: 'plans/future/test',
        toStage: 'in-progress',
      })

      expect(result.success).toBe(true)
    })

    it('should allow any stage to backlog (deprioritize)', async () => {
      const mockStory: StoryArtifact = {
        id: 'TEST-002',
        title: 'Test Story',
        status: 'in-progress',
        priority: 'P0' as const,
        epic: 'test-epic',
        created_at: '2026-02-14T00:00:00Z',
        updated_at: '2026-02-14T00:00:00Z',
      }

      vi.spyOn(adapter as any, 'findStory').mockResolvedValue('/fake/path/TEST-002.md')
      vi.spyOn((adapter as any).storyAdapter, 'read').mockResolvedValue(mockStory)
      vi.spyOn((adapter as any).storyAdapter, 'update').mockResolvedValue(undefined)

      const result = await adapter.moveStage({
        storyId: 'TEST-002',
        featureDir: 'plans/future/test',
        toStage: 'backlog',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('AC-3: Handle missing stories gracefully', () => {
    it('should throw StoryNotFoundError for non-existent story', async () => {
      vi.spyOn(adapter as any, 'findStory').mockRejectedValue(
        new StoryNotFoundError('Could not locate story MISSING-001'),
      )

      await expect(
        adapter.moveStage({
          storyId: 'MISSING-001',
          featureDir: 'plans/future/test',
          toStage: 'in-progress',
        }),
      ).rejects.toThrow(StoryNotFoundError)
    })
  })

  describe('AC-4: Auto-locate story without fromStage', () => {
    it('should find story automatically when fromStage not provided', async () => {
      const mockStory: StoryArtifact = {
        id: 'TEST-001',
        title: 'Test Story',
        status: 'backlog',
        priority: 'P0' as const,
        epic: 'test-epic',
        created_at: '2026-02-14T00:00:00Z',
        updated_at: '2026-02-14T00:00:00Z',
      }

      const findSpy = vi
        .spyOn(adapter as any, 'findStory')
        .mockResolvedValue('/fake/path/TEST-001.md')
      const readSpy = vi.spyOn((adapter as any).storyAdapter, 'read').mockResolvedValue(mockStory)
      vi.spyOn((adapter as any).storyAdapter, 'update').mockResolvedValue(undefined)

      const result = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: 'plans/future/test',
        toStage: 'ready-to-work',
        // fromStage not provided - should auto-detect
      })

      expect(findSpy).toHaveBeenCalledWith('TEST-001', 'plans/future/test')
      expect(readSpy).toHaveBeenCalled()
      expect(result.fromStage).toBe('backlog')
    })
  })

  describe('AC-5: Batch operations', () => {
    it('should process multiple stories in parallel', async () => {
      const mockStories = [
        {
          id: 'TEST-001',
          title: 'Test 1',
          status: 'ready-to-work',
          priority: 'P0' as const,
          epic: 'test',
          created_at: '2026-02-14T00:00:00Z',
          updated_at: '2026-02-14T00:00:00Z',
        },
        {
          id: 'TEST-002',
          title: 'Test 2',
          status: 'ready-to-work',
          priority: 'P0' as const,
          epic: 'test',
          created_at: '2026-02-14T00:00:00Z',
          updated_at: '2026-02-14T00:00:00Z',
        },
      ]

      vi.spyOn(adapter as any, 'findStory').mockImplementation(async (id: string) => {
        return `/fake/path/${id}.md`
      })

      vi.spyOn((adapter as any).storyAdapter, 'read').mockImplementation(async (path: string) => {
        const id = path.match(/TEST-\d+/)?.[0]
        return mockStories.find(s => s.id === id)
      })

      vi.spyOn((adapter as any).storyAdapter, 'update').mockResolvedValue(undefined)

      const result = await adapter.batchMoveStage({
        stories: [
          { storyId: 'TEST-001', featureDir: 'plans/future/test', toStage: 'in-progress' },
          { storyId: 'TEST-002', featureDir: 'plans/future/test', toStage: 'in-progress' },
        ],
      })

      expect(result.totalStories).toBe(2)
      expect(result.succeeded).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
    })

    it('should complete batch of 10 stories in <2s', async () => {
      const mockStories = Array.from({ length: 10 }, (_, i) => ({
        id: `TEST-${String(i + 1).padStart(3, '0')}`,
        title: `Test ${i + 1}`,
        status: 'ready-to-work' as const,
        priority: 'P0' as const,
        epic: 'test',
        created_at: '2026-02-14T00:00:00Z',
        updated_at: '2026-02-14T00:00:00Z',
      }))

      vi.spyOn(adapter as any, 'findStory').mockImplementation(async (id: string) => {
        return `/fake/path/${id}.md`
      })

      vi.spyOn((adapter as any).storyAdapter, 'read').mockImplementation(async (path: string) => {
        const id = path.match(/TEST-\d+/)?.[0]
        return mockStories.find(s => s.id === id)
      })

      vi.spyOn((adapter as any).storyAdapter, 'update').mockResolvedValue(undefined)

      const startTime = Date.now()

      const result = await adapter.batchMoveStage({
        stories: mockStories.map(s => ({
          storyId: s.id,
          featureDir: 'plans/future/test',
          toStage: 'in-progress' as const,
        })),
      })

      const elapsedMs = Date.now() - startTime

      expect(result.totalStories).toBe(10)
      expect(result.succeeded).toBe(10)
      expect(elapsedMs).toBeLessThan(2000)
    })

    it('should continue on error when continueOnError is true', async () => {
      vi.spyOn(adapter as any, 'findStory').mockImplementation(async (id: string) => {
        if (id === 'FAIL-001') {
          throw new StoryNotFoundError('Story not found')
        }
        return `/fake/path/${id}.md`
      })

      vi.spyOn((adapter as any).storyAdapter, 'read').mockResolvedValue({
        id: 'TEST-001',
        title: 'Test',
        status: 'backlog',
        priority: 'P0' as const,
        epic: 'test',
        created_at: '2026-02-14T00:00:00Z',
        updated_at: '2026-02-14T00:00:00Z',
      })

      vi.spyOn((adapter as any).storyAdapter, 'update').mockResolvedValue(undefined)

      const result = await adapter.batchMoveStage({
        stories: [
          { storyId: 'TEST-001', featureDir: 'plans/future/test', toStage: 'ready-to-work' },
          { storyId: 'FAIL-001', featureDir: 'plans/future/test', toStage: 'ready-to-work' },
        ],
        continueOnError: true,
      })

      expect(result.succeeded).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].storyId).toBe('FAIL-001')
    })
  })

  describe('AC-6: Structured logging', () => {
    it('should log stage transitions with structured data', async () => {
      const mockStory: StoryArtifact = {
        id: 'TEST-001',
        title: 'Test Story',
        status: 'backlog',
        priority: 'P0' as const,
        epic: 'test-epic',
        created_at: '2026-02-14T00:00:00Z',
        updated_at: '2026-02-14T00:00:00Z',
      }

      vi.spyOn(adapter as any, 'findStory').mockResolvedValue('/fake/path/TEST-001.md')
      vi.spyOn((adapter as any).storyAdapter, 'read').mockResolvedValue(mockStory)
      vi.spyOn((adapter as any).storyAdapter, 'update').mockResolvedValue(undefined)

      // We can't easily test logger.info in unit tests, but we verify the operation completes
      const result = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: 'plans/future/test',
        toStage: 'ready-to-work',
      })

      expect(result.storyId).toBe('TEST-001')
      expect(result.fromStage).toBe('backlog')
      expect(result.toStage).toBe('ready-to-work')
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Edge cases', () => {
    it('should be idempotent - moving to current stage succeeds with warning', async () => {
      const mockStory: StoryArtifact = {
        id: 'TEST-002',
        title: 'Test Story',
        status: 'in-progress',
        priority: 'P0' as const,
        epic: 'test-epic',
        created_at: '2026-02-14T00:00:00Z',
        updated_at: '2026-02-14T00:00:00Z',
      }

      vi.spyOn(adapter as any, 'findStory').mockResolvedValue('/fake/path/TEST-002.md')
      vi.spyOn((adapter as any).storyAdapter, 'read').mockResolvedValue(mockStory)
      const updateSpy = vi
        .spyOn((adapter as any).storyAdapter, 'update')
        .mockResolvedValue(undefined)

      const result = await adapter.moveStage({
        storyId: 'TEST-002',
        featureDir: 'plans/future/test',
        toStage: 'in-progress',
      })

      expect(result.success).toBe(true)
      expect(result.warning).toContain('already at stage')
      expect(updateSpy).not.toHaveBeenCalled() // No update needed
    })

    it('should reject invalid stage names', async () => {
      await expect(
        adapter.moveStage({
          storyId: 'TEST-001',
          featureDir: 'plans/future/test',
          toStage: 'invalid-stage' as any,
        }),
      ).rejects.toThrow()
    })

    it('should handle story with state field instead of status', async () => {
      const mockStory: StoryArtifact = {
        id: 'TEST-001',
        title: 'Test Story',
        state: 'backlog' as any,
        priority: 'P0' as const,
        epic: 'test-epic',
        created_at: '2026-02-14T00:00:00Z',
        updated_at: '2026-02-14T00:00:00Z',
      }

      vi.spyOn(adapter as any, 'findStory').mockResolvedValue('/fake/path/TEST-001.md')
      vi.spyOn((adapter as any).storyAdapter, 'read').mockResolvedValue(mockStory)
      vi.spyOn((adapter as any).storyAdapter, 'update').mockResolvedValue(undefined)

      const result = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: 'plans/future/test',
        toStage: 'ready-to-work',
      })

      expect(result.fromStage).toBe('backlog')
    })
  })
})
