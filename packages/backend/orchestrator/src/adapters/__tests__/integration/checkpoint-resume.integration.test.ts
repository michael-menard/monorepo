/**
 * AC-2: Checkpoint + Resume Workflow Integration Tests
 *
 * Tests CheckpointAdapter + StoryFileAdapter working together
 * for checkpoint save/resume workflows.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { CheckpointAdapter } from '../../checkpoint-adapter.js'
import { StoryFileAdapter } from '../../story-file-adapter.js'
import { createCheckpoint, type Checkpoint, type Phase } from '../../../artifacts/checkpoint.js'
import type { StoryArtifact } from '../../../artifacts/story-v2-compatible.js'
import { CheckpointNotFoundError } from '../../__types__/index.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('AC-2: Checkpoint + Resume Workflow', () => {
  let tmpDir: string
  let checkpointAdapter: CheckpointAdapter
  let storyAdapter: StoryFileAdapter

  const testStoryId = 'TEST-0020'
  const featureDir = 'plans/future/test'

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lngg-0070-checkpoint-'))
    checkpointAdapter = new CheckpointAdapter()
    storyAdapter = new StoryFileAdapter()
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('Checkpoint save at different phases', () => {
    it('should save checkpoint at setup phase', async () => {
      const checkpointPath = path.join(tmpDir, 'CHECKPOINT.yaml')
      const checkpoint = createCheckpoint(testStoryId, featureDir, 'setup')

      await checkpointAdapter.write(checkpointPath, checkpoint)

      const read = await checkpointAdapter.read(checkpointPath)
      expect(read.story_id).toBe(testStoryId)
      expect(read.current_phase).toBe('setup')
      expect(read.last_successful_phase).toBeNull()
      expect(read.iteration).toBe(0)
    })

    it('should save checkpoint at each phase and advance correctly', async () => {
      const checkpointPath = path.join(tmpDir, 'CHECKPOINT.yaml')
      const checkpoint = createCheckpoint(testStoryId, featureDir, 'setup')
      await checkpointAdapter.write(checkpointPath, checkpoint)

      // Advance: setup → plan
      await checkpointAdapter.advancePhase(checkpointPath, 'setup', 'plan')
      const afterPlan = await checkpointAdapter.read(checkpointPath)
      expect(afterPlan.current_phase).toBe('plan')
      expect(afterPlan.last_successful_phase).toBe('setup')

      // Advance: plan → execute
      await checkpointAdapter.advancePhase(checkpointPath, 'plan', 'execute')
      const afterExec = await checkpointAdapter.read(checkpointPath)
      expect(afterExec.current_phase).toBe('execute')
      expect(afterExec.last_successful_phase).toBe('plan')

      // Advance: execute → proof
      await checkpointAdapter.advancePhase(checkpointPath, 'execute', 'proof')
      const afterProof = await checkpointAdapter.read(checkpointPath)
      expect(afterProof.current_phase).toBe('proof')
      expect(afterProof.last_successful_phase).toBe('execute')
    })
  })

  describe('Resume from checkpoint with partial completion', () => {
    it('should resume from last successful phase after interruption', async () => {
      const checkpointPath = path.join(tmpDir, 'CHECKPOINT.yaml')

      // Simulate workflow that got to execute phase
      const checkpoint = createCheckpoint(testStoryId, featureDir, 'setup')
      await checkpointAdapter.write(checkpointPath, checkpoint)
      await checkpointAdapter.advancePhase(checkpointPath, 'setup', 'plan')
      await checkpointAdapter.advancePhase(checkpointPath, 'plan', 'execute')

      // Simulate "restart" - read checkpoint to determine where to resume
      const resumed = await checkpointAdapter.read(checkpointPath)
      expect(resumed.current_phase).toBe('execute')
      expect(resumed.last_successful_phase).toBe('plan')

      // Determine phases to skip (already completed)
      const completedPhases: Phase[] = ['setup', 'plan']
      const phasesToRun: Phase[] = ['execute', 'proof', 'review']
      const remainingPhases = phasesToRun.filter(
        p => !completedPhases.includes(p) && p !== resumed.current_phase,
      )

      expect(remainingPhases).toEqual(['proof', 'review'])
    })

    it('should handle blocked checkpoint state', async () => {
      const checkpointPath = path.join(tmpDir, 'CHECKPOINT.yaml')
      const checkpoint = createCheckpoint(testStoryId, featureDir, 'execute')
      await checkpointAdapter.write(checkpointPath, checkpoint)

      // Mark as blocked
      await checkpointAdapter.markPhaseBlocked(checkpointPath, 'Missing dependency: LNGG-0010')

      const blocked = await checkpointAdapter.read(checkpointPath)
      expect(blocked.blocked).toBe(true)
      expect(blocked.blocked_reason).toBe('Missing dependency: LNGG-0010')

      // Clear blocked state
      await checkpointAdapter.clearBlocked(checkpointPath)

      const unblocked = await checkpointAdapter.read(checkpointPath)
      expect(unblocked.blocked).toBe(false)
    })
  })

  describe('Checkpoint + StoryFileAdapter integration', () => {
    it('should maintain checkpoint alongside story file', async () => {
      // Create story
      const storyDir = path.join(tmpDir, testStoryId)
      const implDir = path.join(storyDir, '_implementation')
      await fs.mkdir(implDir, { recursive: true })

      const storyPath = path.join(storyDir, `${testStoryId}.md`)
      const checkpointPath = path.join(implDir, 'CHECKPOINT.yaml')

      const story: StoryArtifact = {
        id: testStoryId,
        title: 'Checkpoint Integration Test',
        status: 'in-progress',
        epic: 'test',
      }
      await storyAdapter.write(storyPath, story)

      // Create checkpoint
      const checkpoint = createCheckpoint(testStoryId, featureDir)
      await checkpointAdapter.write(checkpointPath, checkpoint)

      // Advance checkpoint
      await checkpointAdapter.advancePhase(checkpointPath, 'setup', 'plan')

      // Update story
      await storyAdapter.update(storyPath, { status: 'in-progress' })

      // Verify both files are consistent
      const readStory = await storyAdapter.read(storyPath)
      const readCheckpoint = await checkpointAdapter.read(checkpointPath)

      expect(readStory.id).toBe(testStoryId)
      expect(readCheckpoint.story_id).toBe(testStoryId)
      expect(readCheckpoint.current_phase).toBe('plan')
    })
  })

  describe('Token logging across checkpoint save/resume', () => {
    it('should preserve iteration count through resume', async () => {
      const checkpointPath = path.join(tmpDir, 'CHECKPOINT.yaml')
      const checkpoint = createCheckpoint(testStoryId, featureDir, 'review')
      await checkpointAdapter.write(checkpointPath, checkpoint)

      // Simulate review iteration 1
      await checkpointAdapter.update(checkpointPath, { iteration: 1 })

      // Resume and check iteration preserved
      const resumed = await checkpointAdapter.read(checkpointPath)
      expect(resumed.iteration).toBe(1)

      // Simulate review iteration 2
      await checkpointAdapter.update(checkpointPath, { iteration: 2 })
      const resumed2 = await checkpointAdapter.read(checkpointPath)
      expect(resumed2.iteration).toBe(2)
    })
  })

  describe('Error handling', () => {
    it('should throw CheckpointNotFoundError for missing file', async () => {
      const missingPath = path.join(tmpDir, 'nonexistent', 'CHECKPOINT.yaml')
      await expect(checkpointAdapter.read(missingPath)).rejects.toThrow(CheckpointNotFoundError)
    })

    it('should handle concurrent checkpoint reads', async () => {
      const checkpointPath = path.join(tmpDir, 'CHECKPOINT.yaml')
      const checkpoint = createCheckpoint(testStoryId, featureDir)
      await checkpointAdapter.write(checkpointPath, checkpoint)

      // Read concurrently
      const [read1, read2, read3] = await Promise.all([
        checkpointAdapter.read(checkpointPath),
        checkpointAdapter.read(checkpointPath),
        checkpointAdapter.read(checkpointPath),
      ])

      expect(read1.story_id).toBe(testStoryId)
      expect(read2.story_id).toBe(testStoryId)
      expect(read3.story_id).toBe(testStoryId)
    })
  })
})
