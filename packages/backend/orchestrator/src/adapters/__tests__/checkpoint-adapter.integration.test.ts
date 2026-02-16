/**
 * Checkpoint Adapter Integration Tests
 *
 * Tests with real filesystem operations (no mocks).
 * Covers AC-8: Integration tests with real filesystem.
 *
 * Test scenarios:
 * - Write + read roundtrip verification
 * - Atomic write behavior (no temp files after completion)
 * - Concurrent write scenarios
 * - Batch operations with real files
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { CheckpointAdapter } from '../checkpoint-adapter.js'
import type { Checkpoint } from '../../artifacts/checkpoint.js'

describe('CheckpointAdapter Integration Tests', () => {
  let adapter: CheckpointAdapter
  let tempDir: string

  beforeEach(async () => {
    adapter = new CheckpointAdapter()
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'checkpoint-integration-test-'))
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('Write + Read Roundtrip', () => {
    it('should write and read back identical checkpoint data', async () => {
      const filePath = path.join(tempDir, 'roundtrip-test.yaml')
      const originalCheckpoint: Checkpoint = {
        schema: 1,
        story_id: 'ROUNDTRIP-001',
        feature_dir: 'plans/integration/test',
        timestamp: '2026-02-14T15:30:00Z',
        current_phase: 'execute',
        last_successful_phase: 'plan',
        iteration: 1,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: ['Test warning'],
        gate: {
          decision: 'PASS',
          evaluated_at: '2026-02-14T15:00:00Z',
          override_reason: null,
          readiness_score: 85,
        },
        resume_hints: {
          skip_phases: [],
          partial_state: { test_key: 'test_value' },
        },
      }

      // Write checkpoint
      await adapter.write(filePath, originalCheckpoint)

      // Read back
      const readCheckpoint = await adapter.read(filePath)

      // Verify all fields match
      expect(readCheckpoint.story_id).toBe(originalCheckpoint.story_id)
      expect(readCheckpoint.feature_dir).toBe(originalCheckpoint.feature_dir)
      expect(readCheckpoint.current_phase).toBe(originalCheckpoint.current_phase)
      expect(readCheckpoint.last_successful_phase).toBe(originalCheckpoint.last_successful_phase)
      expect(readCheckpoint.iteration).toBe(originalCheckpoint.iteration)
      expect(readCheckpoint.warnings).toEqual(originalCheckpoint.warnings)
      expect(readCheckpoint.gate).toEqual(originalCheckpoint.gate)
      expect(readCheckpoint.resume_hints).toEqual(originalCheckpoint.resume_hints)
    })

    it('should preserve optional fields through roundtrip', async () => {
      const filePath = path.join(tempDir, 'optional-fields-test.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'OPTIONAL-001',
        feature_dir: 'plans/test',
        timestamp: '2026-02-14T16:00:00Z',
        current_phase: 'qa-verify',
        last_successful_phase: 'execute',
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
        // Optional fields
        e2e_gate: { status: 'PASS' },
        qa_verdict: 'PASS',
        completed_at: '2026-02-14T17:00:00Z',
        gen_mode: true,
      }

      await adapter.write(filePath, checkpoint)
      const read = await adapter.read(filePath)

      expect(read.e2e_gate).toEqual({ status: 'PASS' })
      expect(read.qa_verdict).toBe('PASS')
      expect(read.completed_at).toBe('2026-02-14T17:00:00Z')
      expect(read.gen_mode).toBe(true)
    })

    it('should preserve unknown fields via passthrough', async () => {
      const filePath = path.join(tempDir, 'passthrough-test.yaml')

      // Write with unknown fields
      const checkpointWithExtras = {
        schema: 1,
        story_id: 'PASSTHROUGH-001',
        feature_dir: 'plans/test',
        timestamp: '2026-02-14T16:30:00Z',
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
        // Unknown fields that should be preserved
        custom_field: 'custom_value',
        metadata: {
          project: 'test',
          team: 'platform',
        },
      }

      await adapter.write(filePath as any, checkpointWithExtras as any)
      const read = (await adapter.read(filePath)) as any

      expect(read.custom_field).toBe('custom_value')
      expect(read.metadata).toEqual({
        project: 'test',
        team: 'platform',
      })
    })
  })

  describe('Atomic Write Behavior', () => {
    it('should not leave temp files after successful write', async () => {
      const filePath = path.join(tempDir, 'atomic-success.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'ATOMIC-001',
        feature_dir: 'plans/test',
        timestamp: new Date().toISOString(),
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      await adapter.write(filePath, checkpoint)

      // Check for temp file
      const tempFilePath = `${filePath}.tmp`
      const files = await fs.readdir(tempDir)

      expect(files).toContain('atomic-success.yaml')
      expect(files).not.toContain('atomic-success.yaml.tmp')

      // Also verify via file system
      try {
        await fs.access(tempFilePath)
        expect.fail('Temp file should not exist')
      } catch {
        // Expected - temp file should not exist
      }
    })

    it('should complete write atomically even with multiple rapid updates', async () => {
      const filePath = path.join(tempDir, 'rapid-updates.yaml')
      const baseCheckpoint: Checkpoint = {
        schema: 1,
        story_id: 'RAPID-001',
        feature_dir: 'plans/test',
        timestamp: new Date().toISOString(),
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      // Write initial checkpoint
      await adapter.write(filePath, baseCheckpoint)

      // Perform rapid updates
      const updates = [
        { iteration: 1 },
        { iteration: 2 },
        { iteration: 3 },
        { blocked: true },
        { blocked: false },
      ]

      for (const update of updates) {
        await adapter.update(filePath, update)
      }

      // Verify final state is consistent
      const final = await adapter.read(filePath)
      expect(final.iteration).toBe(3)
      expect(final.blocked).toBe(false)

      // No temp files should remain
      const files = await fs.readdir(tempDir)
      expect(files.filter(f => f.endsWith('.tmp'))).toHaveLength(0)
    })
  })

  describe('Concurrent Write Scenarios', () => {
    it('should handle concurrent updates to different files', async () => {
      const filePaths = [
        path.join(tempDir, 'concurrent-1.yaml'),
        path.join(tempDir, 'concurrent-2.yaml'),
        path.join(tempDir, 'concurrent-3.yaml'),
      ]

      // Create initial checkpoints
      const writePromises = filePaths.map((filePath, index) => {
        const checkpoint: Checkpoint = {
          schema: 1,
          story_id: `CONCURRENT-00${index + 1}`,
          feature_dir: 'plans/concurrent',
          timestamp: new Date().toISOString(),
          current_phase: 'setup',
          last_successful_phase: null,
          iteration: 0,
          max_iterations: 3,
          blocked: false,
          forced: false,
          warnings: [],
        }
        return adapter.write(filePath, checkpoint)
      })

      // Wait for all writes to complete
      await Promise.all(writePromises)

      // Verify all files were written correctly
      const readPromises = filePaths.map(fp => adapter.read(fp))
      const checkpoints = await Promise.all(readPromises)

      expect(checkpoints).toHaveLength(3)
      expect(checkpoints[0].story_id).toBe('CONCURRENT-001')
      expect(checkpoints[1].story_id).toBe('CONCURRENT-002')
      expect(checkpoints[2].story_id).toBe('CONCURRENT-003')
    })

    it('should handle sequential updates without corruption', async () => {
      const filePath = path.join(tempDir, 'sequential-updates.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'SEQUENTIAL-001',
        feature_dir: 'plans/test',
        timestamp: new Date().toISOString(),
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      await adapter.write(filePath, checkpoint)

      // Perform sequential phase advancements
      await adapter.advancePhase(filePath, 'setup', 'plan')
      await adapter.advancePhase(filePath, 'plan', 'execute')
      await adapter.advancePhase(filePath, 'execute', 'proof')

      // Verify final state
      const final = await adapter.read(filePath)
      expect(final.current_phase).toBe('proof')
      expect(final.last_successful_phase).toBe('execute')
    })
  })

  describe('Batch Operations with Real Files', () => {
    it('should read batch of mixed valid, invalid, and missing files', async () => {
      const validPath1 = path.join(tempDir, 'batch-valid-1.yaml')
      const validPath2 = path.join(tempDir, 'batch-valid-2.yaml')
      const missingPath = path.join(tempDir, 'batch-missing.yaml')
      const invalidPath = path.join(tempDir, 'batch-invalid.yaml')

      // Create two valid checkpoints
      const checkpoint1: Checkpoint = {
        schema: 1,
        story_id: 'BATCH-001',
        feature_dir: 'plans/batch',
        timestamp: new Date().toISOString(),
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      const checkpoint2: Checkpoint = {
        schema: 1,
        story_id: 'BATCH-002',
        feature_dir: 'plans/batch',
        timestamp: new Date().toISOString(),
        current_phase: 'plan',
        last_successful_phase: 'setup',
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      await adapter.write(validPath1, checkpoint1)
      await adapter.write(validPath2, checkpoint2)

      // Create invalid checkpoint (missing required field)
      await fs.writeFile(
        invalidPath,
        'schema: 1\nfeature_dir: plans/test\ncurrent_phase: setup',
        'utf-8',
      )

      // Don't create missing file

      // Read batch
      const result = await adapter.readBatch([validPath1, validPath2, missingPath, invalidPath])

      // Verify results
      expect(result.results).toHaveLength(2)
      expect(result.errors).toHaveLength(2)

      // Order is not guaranteed with Promise.all
      const storyIds = result.results.map(r => r.story_id).sort()
      expect(storyIds).toEqual(['BATCH-001', 'BATCH-002'])

      // Verify error types
      const errorPaths = result.errors.map(e => path.basename(e.filePath))
      expect(errorPaths).toContain('batch-missing.yaml')
      expect(errorPaths).toContain('batch-invalid.yaml')
    })

    it('should handle batch operations on large number of files', async () => {
      const count = 20
      const filePaths: string[] = []

      // Create 20 checkpoint files
      for (let i = 0; i < count; i++) {
        const filePath = path.join(tempDir, `large-batch-${i}.yaml`)
        filePaths.push(filePath)

        const checkpoint: Checkpoint = {
          schema: 1,
          story_id: `LARGE-${String(i).padStart(3, '0')}`,
          feature_dir: 'plans/large-batch',
          timestamp: new Date().toISOString(),
          current_phase: 'setup',
          last_successful_phase: null,
          iteration: 0,
          max_iterations: 3,
          blocked: false,
          forced: false,
          warnings: [],
        }

        await adapter.write(filePath, checkpoint)
      }

      // Read all in batch
      const result = await adapter.readBatch(filePaths)

      expect(result.results).toHaveLength(count)
      expect(result.errors).toHaveLength(0)

      // Verify all story IDs are present (order not guaranteed with Promise.all)
      const storyIds = result.results.map(c => c.story_id).sort()
      const expectedIds = Array.from({ length: count }, (_, i) =>
        `LARGE-${String(i).padStart(3, '0')}`
      ).sort()
      expect(storyIds).toEqual(expectedIds)
    })
  })

  describe('Real Filesystem Edge Cases', () => {
    it('should handle checkpoint in nested directory structure', async () => {
      const nestedPath = path.join(tempDir, 'level1', 'level2', 'level3', 'checkpoint.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'NESTED-001',
        feature_dir: 'plans/nested',
        timestamp: new Date().toISOString(),
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      // Write should create parent directories
      await adapter.write(nestedPath, checkpoint)

      // Verify file exists
      const exists = await adapter.exists(nestedPath)
      expect(exists).toBe(true)

      // Read back
      const read = await adapter.read(nestedPath)
      expect(read.story_id).toBe('NESTED-001')
    })

    it('should handle update preserving all existing fields', async () => {
      const filePath = path.join(tempDir, 'preserve-fields.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'PRESERVE-001',
        feature_dir: 'plans/preserve',
        timestamp: '2026-02-14T18:00:00Z',
        current_phase: 'execute',
        last_successful_phase: 'plan',
        iteration: 2,
        max_iterations: 5,
        blocked: false,
        forced: true,
        warnings: ['Warning 1', 'Warning 2'],
        gate: {
          decision: 'OVERRIDE',
          evaluated_at: '2026-02-14T17:00:00Z',
          override_reason: 'Emergency deployment',
          readiness_score: 60,
        },
      }

      await adapter.write(filePath, checkpoint)

      // Update only blocked field
      await adapter.update(filePath, { blocked: true, blocked_reason: 'Test' })

      // Read and verify all original fields preserved
      const updated = await adapter.read(filePath)
      expect(updated.iteration).toBe(2)
      expect(updated.max_iterations).toBe(5)
      expect(updated.forced).toBe(true)
      expect(updated.warnings).toEqual(['Warning 1', 'Warning 2'])
      expect(updated.gate).toEqual(checkpoint.gate)
      expect(updated.blocked).toBe(true)
      expect(updated.blocked_reason).toBe('Test')
    })
  })
})
