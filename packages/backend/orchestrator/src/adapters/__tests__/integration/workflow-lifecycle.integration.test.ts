/**
 * AC-1: Story Lifecycle Workflow Integration Tests
 *
 * Tests StoryFileAdapter + StageMovementAdapter + IndexAdapter working together
 * in realistic workflow scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { StoryFileAdapter } from '../../story-file-adapter.js'
import { StageMovementAdapter } from '../../stage-movement-adapter.js'
import { IndexAdapter } from '../../index-adapter.js'
import type { StoryArtifact } from '../../../artifacts/story-v2-compatible.js'
import { InvalidTransitionError, StoryNotFoundError } from '../../__types__/index.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('AC-1: Story Lifecycle Workflow', () => {
  let tmpDir: string
  let storyAdapter: StoryFileAdapter
  let stageAdapter: StageMovementAdapter
  let indexAdapter: IndexAdapter

  const testStoryId = 'TEST-0010'

  const createTestStory = (overrides: Partial<StoryArtifact> = {}): StoryArtifact => ({
    id: testStoryId,
    title: 'Test Lifecycle Story',
    status: 'backlog',
    epic: 'test-epic',
    ...overrides,
  })

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lngg-0070-lifecycle-'))

    storyAdapter = new StoryFileAdapter()
    stageAdapter = new StageMovementAdapter()
    indexAdapter = new IndexAdapter()
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('Sequential stage transitions', () => {
    it('should move story through backlog → elaboration → ready-to-work → in-progress → uat', async () => {
      // Create story directory structure
      const storyDir = path.join(tmpDir, testStoryId)
      await fs.mkdir(storyDir, { recursive: true })

      const storyPath = path.join(storyDir, `${testStoryId}.md`)
      const story = createTestStory()
      await storyAdapter.write(storyPath, story)

      // Verify initial state
      const initial = await storyAdapter.read(storyPath)
      expect(initial.status).toBe('backlog')

      // Move: backlog → elaboration
      const result1 = await stageAdapter.moveStage({
        storyId: testStoryId,
        featureDir: tmpDir,
        toStage: 'elaboration',
        fromStage: 'backlog',
      })
      expect(result1.success).toBe(true)
      expect(result1.fromStage).toBe('backlog')
      expect(result1.toStage).toBe('elaboration')

      // Verify story file updated
      const afterElab = await storyAdapter.read(storyPath)
      expect(afterElab.status).toBe('elaboration')

      // Move: elaboration → ready-to-work
      const result2 = await stageAdapter.moveStage({
        storyId: testStoryId,
        featureDir: tmpDir,
        toStage: 'ready-to-work',
        fromStage: 'elaboration',
      })
      expect(result2.success).toBe(true)

      // Move: ready-to-work → in-progress
      const result3 = await stageAdapter.moveStage({
        storyId: testStoryId,
        featureDir: tmpDir,
        toStage: 'in-progress',
        fromStage: 'ready-to-work',
      })
      expect(result3.success).toBe(true)

      // Move: in-progress → ready-for-qa
      const result4 = await stageAdapter.moveStage({
        storyId: testStoryId,
        featureDir: tmpDir,
        toStage: 'ready-for-qa',
        fromStage: 'in-progress',
      })
      expect(result4.success).toBe(true)

      // Move: ready-for-qa → uat
      const result5 = await stageAdapter.moveStage({
        storyId: testStoryId,
        featureDir: tmpDir,
        toStage: 'uat',
        fromStage: 'ready-for-qa',
      })
      expect(result5.success).toBe(true)

      // Verify final state
      const final = await storyAdapter.read(storyPath)
      expect(final.status).toBe('uat')
    })

    it('should reject invalid stage transitions', async () => {
      const storyDir = path.join(tmpDir, testStoryId)
      await fs.mkdir(storyDir, { recursive: true })
      const storyPath = path.join(storyDir, `${testStoryId}.md`)
      await storyAdapter.write(storyPath, createTestStory())

      // Attempt: backlog → uat (skipping stages)
      await expect(
        stageAdapter.moveStage({
          storyId: testStoryId,
          featureDir: tmpDir,
          toStage: 'uat',
          fromStage: 'backlog',
        }),
      ).rejects.toThrow(InvalidTransitionError)
    })

    it('should handle idempotent moves (already at target stage)', async () => {
      const storyDir = path.join(tmpDir, testStoryId)
      await fs.mkdir(storyDir, { recursive: true })
      const storyPath = path.join(storyDir, `${testStoryId}.md`)
      await storyAdapter.write(storyPath, createTestStory())

      const result = await stageAdapter.moveStage({
        storyId: testStoryId,
        featureDir: tmpDir,
        toStage: 'backlog',
        fromStage: 'backlog',
      })

      expect(result.success).toBe(true)
      expect(result.warning).toContain('already at stage')
    })
  })

  describe('StoryFileAdapter + StageMovementAdapter round-trip', () => {
    it('should preserve story content through stage transitions', async () => {
      const storyDir = path.join(tmpDir, testStoryId)
      await fs.mkdir(storyDir, { recursive: true })
      const storyPath = path.join(storyDir, `${testStoryId}.md`)

      const original = createTestStory({
        title: 'Integration Test Story',
        epic: 'lngg',
        tags: ['integration', 'test'],
      })
      await storyAdapter.write(storyPath, original)

      // Move through a transition
      await stageAdapter.moveStage({
        storyId: testStoryId,
        featureDir: tmpDir,
        toStage: 'elaboration',
        fromStage: 'backlog',
      })

      // Read back and verify non-status fields preserved
      const result = await storyAdapter.read(storyPath)
      expect(result.id).toBe(testStoryId)
      expect(result.title).toBe('Integration Test Story')
      expect(result.epic).toBe('lngg')
      expect(result.status).toBe('elaboration')
    })
  })

  describe('Error handling', () => {
    it('should throw StoryNotFoundError for missing story', async () => {
      await expect(
        stageAdapter.moveStage({
          storyId: 'NONEXISTENT-999',
          featureDir: tmpDir,
          toStage: 'in-progress',
        }),
      ).rejects.toThrow(StoryNotFoundError)
    })

    it('should handle elapsed time tracking', async () => {
      const storyDir = path.join(tmpDir, testStoryId)
      await fs.mkdir(storyDir, { recursive: true })
      const storyPath = path.join(storyDir, `${testStoryId}.md`)
      await storyAdapter.write(storyPath, createTestStory())

      const result = await stageAdapter.moveStage({
        storyId: testStoryId,
        featureDir: tmpDir,
        toStage: 'elaboration',
        fromStage: 'backlog',
      })

      expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
      expect(typeof result.elapsedMs).toBe('number')
    })
  })

  describe('Index metrics update after stage movement', () => {
    it('should update index story status after stage transition', async () => {
      // Create a minimal index file
      const indexPath = path.join(tmpDir, 'stories.index.md')
      const indexContent = `---
title: Test Stories Index
story_prefix: TEST
---

## Wave 1 — Test (1 stories)

| # | S | Story | Title | Epic |
|---|---|---|---|---|
| 1 | | ${testStoryId} | Test Lifecycle Story | test-epic |

---
`
      await fs.writeFile(indexPath, indexContent, 'utf-8')

      // Read index and verify initial state
      const index = await indexAdapter.readIndex(indexPath)
      const story = index.stories.find(s => s.story_id === testStoryId)
      expect(story).toBeDefined()
      expect(story!.status).toBe('backlog')

      // Update story status in index
      await indexAdapter.updateStoryStatus(testStoryId, 'in-progress', indexPath)

      // Read back and verify
      const updatedIndex = await indexAdapter.readIndex(indexPath)
      const updatedStory = updatedIndex.stories.find(s => s.story_id === testStoryId)
      expect(updatedStory!.status).toBe('in-progress')

      // Verify metrics recalculated
      expect(updatedIndex.metrics.by_status['in-progress']).toBe(1)
      expect(updatedIndex.metrics.by_status['backlog']).toBe(0)
    })
  })
})
