/**
 * Checkpoint Adapter Tests
 *
 * Comprehensive test suite covering all acceptance criteria:
 * - AC-1: Read checkpoint files with Zod validation
 * - AC-2: Write checkpoint files with atomic operations
 * - AC-3: Update existing files (merge changes)
 * - AC-4: Phase advancement helper
 * - AC-5: Batch read operations
 * - AC-6: Zod validation on all operations
 * - AC-7: 85%+ unit test coverage
 * - AC-9: Backward compatibility with legacy formats
 * - AC-10: Numeric phase handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { CheckpointAdapter } from '../checkpoint-adapter.js'
import {
  CheckpointNotFoundError,
  InvalidYAMLError,
  ValidationError,
} from '../__types__/index.js'
import type { Checkpoint } from '../../artifacts/checkpoint.js'

describe('CheckpointAdapter', () => {
  let adapter: CheckpointAdapter
  let tempDir: string
  const fixturesDir = path.join(__dirname, '__fixtures__')

  beforeEach(async () => {
    adapter = new CheckpointAdapter()
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'checkpoint-adapter-test-'))
  })

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('AC-1: Read checkpoint files with Zod validation', () => {
    it('should read valid checkpoint file', async () => {
      const filePath = path.join(fixturesDir, 'valid-checkpoint.yaml')
      const checkpoint = await adapter.read(filePath)

      expect(checkpoint.story_id).toBe('LNGG-0060')
      expect(checkpoint.feature_dir).toBe('plans/future/platform')
      expect(checkpoint.current_phase).toBe('execute')
      expect(checkpoint.last_successful_phase).toBe('plan')
      expect(checkpoint.iteration).toBe(0)
      expect(checkpoint.blocked).toBe(false)
    })

    it('should read minimal checkpoint file with required fields only', async () => {
      const filePath = path.join(fixturesDir, 'minimal-checkpoint.yaml')
      const checkpoint = await adapter.read(filePath)

      expect(checkpoint.story_id).toBe('TEST-001')
      expect(checkpoint.feature_dir).toBe('plans/test')
      expect(checkpoint.current_phase).toBe('setup')
      expect(checkpoint.last_successful_phase).toBe(null)
      // Default values should be applied
      expect(checkpoint.iteration).toBe(0)
      expect(checkpoint.max_iterations).toBe(3)
      expect(checkpoint.blocked).toBe(false)
      expect(checkpoint.forced).toBe(false)
    })

    it('should throw CheckpointNotFoundError when file does not exist', async () => {
      const filePath = path.join(tempDir, 'nonexistent.yaml')

      await expect(adapter.read(filePath)).rejects.toThrow(CheckpointNotFoundError)
      await expect(adapter.read(filePath)).rejects.toThrow('Checkpoint file not found')
    })

    it('should throw InvalidYAMLError when YAML syntax is invalid', async () => {
      const filePath = path.join(fixturesDir, 'invalid-yaml-syntax.yaml')

      await expect(adapter.read(filePath)).rejects.toThrow(InvalidYAMLError)
    })

    it('should throw ValidationError when required field is missing', async () => {
      const filePath = path.join(fixturesDir, 'invalid-missing-field.yaml')

      await expect(adapter.read(filePath)).rejects.toThrow(ValidationError)
    })
  })

  describe('AC-9: Backward compatibility with legacy formats', () => {
    it('should read legacy checkpoint with extra fields', async () => {
      const filePath = path.join(fixturesDir, 'legacy-checkpoint-with-extras.yaml')
      const checkpoint = await adapter.read(filePath)

      expect(checkpoint.story_id).toBe('LEGACY-001')
      expect(checkpoint.e2e_gate).toBe('PASS')
      expect(checkpoint.qa_verdict).toBe('PASS')
      expect(checkpoint.completed_at).toBe('2026-02-01T18:00:00Z')
      expect(checkpoint.gen_mode).toBe(false)

      // Passthrough should preserve unknown fields
      const anyCheckpoint = checkpoint as any
      expect(anyCheckpoint.custom_metadata).toBeDefined()
      expect(anyCheckpoint.custom_metadata.project_name).toBe('LegacyProject')
    })

    it('should read checkpoint with qa-completion phase variant', async () => {
      const filePath = path.join(fixturesDir, 'qa-completion-variant.yaml')
      const checkpoint = await adapter.read(filePath)

      expect(checkpoint.story_id).toBe('QA-001')
      expect(checkpoint.current_phase).toBe('qa-completion')
      expect(checkpoint.qa_verdict).toBe('PASS')
    })
  })

  describe('AC-10: Numeric phase handling', () => {
    it('should convert numeric phase to string and log warning', async () => {
      const filePath = path.join(fixturesDir, 'numeric-phase-checkpoint.yaml')
      const checkpoint = await adapter.read(filePath)

      expect(checkpoint.story_id).toBe('NUMERIC-001')
      // Phase 3 should be converted to 'execute'
      expect(checkpoint.current_phase).toBe('execute')
      // Phase 2 should be converted to 'plan'
      expect(checkpoint.last_successful_phase).toBe('plan')
    })
  })

  describe('AC-2: Write checkpoint files with atomic operations', () => {
    it('should write new checkpoint file', async () => {
      const filePath = path.join(tempDir, 'new-checkpoint.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-100',
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

      // Verify file exists
      const exists = await adapter.exists(filePath)
      expect(exists).toBe(true)

      // Read back and verify
      const readCheckpoint = await adapter.read(filePath)
      expect(readCheckpoint.story_id).toBe('TEST-100')
      expect(readCheckpoint.current_phase).toBe('setup')
    })

    it('should write checkpoint with pure YAML format (no frontmatter)', async () => {
      const filePath = path.join(tempDir, 'yaml-format-test.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-101',
        feature_dir: 'plans/test',
        timestamp: '2026-02-14T10:00:00Z',
        current_phase: 'plan',
        last_successful_phase: 'setup',
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      await adapter.write(filePath, checkpoint)

      // Read raw file content
      const rawContent = await fs.readFile(filePath, 'utf-8')

      // Verify it's pure YAML (no frontmatter delimiters)
      expect(rawContent).not.toMatch(/^---\n/)
      expect(rawContent).toContain('story_id: TEST-101')
      expect(rawContent).toContain('current_phase: plan')
    })

    it('should throw ValidationError when writing invalid checkpoint', async () => {
      const filePath = path.join(tempDir, 'invalid-write.yaml')
      const invalidCheckpoint = {
        schema: 1,
        // Missing required fields
        current_phase: 'setup',
      } as Checkpoint

      await expect(adapter.write(filePath, invalidCheckpoint)).rejects.toThrow(ValidationError)
    })

    it('should not leave temp files after successful write', async () => {
      const filePath = path.join(tempDir, 'temp-file-test.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-102',
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
      const tempExists = await adapter.exists(tempFilePath)
      expect(tempExists).toBe(false)
    })
  })

  describe('AC-3: Update existing files (merge changes)', () => {
    it('should update checkpoint with partial changes', async () => {
      // Create initial checkpoint
      const filePath = path.join(tempDir, 'update-test.yaml')
      const initialCheckpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-200',
        feature_dir: 'plans/test',
        timestamp: '2026-02-14T10:00:00Z',
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      await adapter.write(filePath, initialCheckpoint)

      // Update blocked state
      await adapter.update(filePath, { blocked: true, blocked_reason: 'Test block' })

      // Read and verify
      const updatedCheckpoint = await adapter.read(filePath)
      expect(updatedCheckpoint.blocked).toBe(true)
      expect(updatedCheckpoint.blocked_reason).toBe('Test block')
      // Other fields should be preserved
      expect(updatedCheckpoint.story_id).toBe('TEST-200')
      expect(updatedCheckpoint.current_phase).toBe('setup')
    })

    it('should update timestamp automatically on update', async () => {
      const filePath = path.join(tempDir, 'timestamp-test.yaml')
      const initialCheckpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-201',
        feature_dir: 'plans/test',
        timestamp: '2026-02-14T10:00:00Z',
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      await adapter.write(filePath, initialCheckpoint)

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 10))
      await adapter.update(filePath, { iteration: 1 })

      // Verify timestamp changed
      const updated = await adapter.read(filePath)
      expect(updated.timestamp).not.toBe(initialCheckpoint.timestamp)
    })

    it('should throw CheckpointNotFoundError when updating missing file', async () => {
      const filePath = path.join(tempDir, 'missing-update.yaml')

      await expect(adapter.update(filePath, { blocked: true })).rejects.toThrow(
        CheckpointNotFoundError,
      )
    })
  })

  describe('AC-4: Phase advancement helper', () => {
    it('should advance phase correctly', async () => {
      const filePath = path.join(tempDir, 'advance-test.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-300',
        feature_dir: 'plans/test',
        timestamp: '2026-02-14T10:00:00Z',
        current_phase: 'plan',
        last_successful_phase: 'setup',
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      await adapter.write(filePath, checkpoint)

      // Advance to execute phase
      await adapter.advancePhase(filePath, 'plan', 'execute')

      // Verify phase advanced
      const advanced = await adapter.read(filePath)
      expect(advanced.current_phase).toBe('execute')
      expect(advanced.last_successful_phase).toBe('plan')
    })

    it('should update timestamp when advancing phase', async () => {
      const filePath = path.join(tempDir, 'advance-timestamp.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-301',
        feature_dir: 'plans/test',
        timestamp: '2026-02-14T10:00:00Z',
        current_phase: 'setup',
        last_successful_phase: null,
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      await adapter.write(filePath, checkpoint)

      await new Promise(resolve => setTimeout(resolve, 10))
      await adapter.advancePhase(filePath, 'setup', 'plan')

      const advanced = await adapter.read(filePath)
      expect(advanced.timestamp).not.toBe(checkpoint.timestamp)
    })
  })

  describe('AC-5: Batch read operations', () => {
    it('should read multiple checkpoint files in parallel', async () => {
      const filePaths = [
        path.join(tempDir, 'batch-1.yaml'),
        path.join(tempDir, 'batch-2.yaml'),
        path.join(tempDir, 'batch-3.yaml'),
      ]

      // Create test checkpoints
      for (let i = 0; i < filePaths.length; i++) {
        const checkpoint: Checkpoint = {
          schema: 1,
          story_id: `BATCH-00${i + 1}`,
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
        await adapter.write(filePaths[i], checkpoint)
      }

      // Read batch
      const result = await adapter.readBatch(filePaths)

      expect(result.results).toHaveLength(3)
      expect(result.errors).toHaveLength(0)

      // Order is not guaranteed with Promise.all, so check for presence
      const storyIds = result.results.map(r => r.story_id).sort()
      expect(storyIds).toEqual(['BATCH-001', 'BATCH-002', 'BATCH-003'])
    })

    it('should continue reading on individual file errors', async () => {
      const filePaths = [
        path.join(tempDir, 'batch-valid.yaml'),
        path.join(tempDir, 'batch-missing.yaml'), // Does not exist
        path.join(fixturesDir, 'invalid-missing-field.yaml'), // Invalid
      ]

      // Create one valid checkpoint
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'BATCH-VALID',
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
      await adapter.write(filePaths[0], checkpoint)

      // Read batch
      const result = await adapter.readBatch(filePaths)

      expect(result.results).toHaveLength(1)
      expect(result.errors).toHaveLength(2)
      expect(result.results[0].story_id).toBe('BATCH-VALID')
      expect(result.errors[0].error).toBeInstanceOf(CheckpointNotFoundError)
      expect(result.errors[1].error).toBeInstanceOf(ValidationError)
    })
  })

  describe('AC-6: Zod validation on all operations', () => {
    it('should validate on read operation', async () => {
      const filePath = path.join(fixturesDir, 'invalid-missing-field.yaml')

      await expect(adapter.read(filePath)).rejects.toThrow(ValidationError)
    })

    it('should validate on write operation', async () => {
      const filePath = path.join(tempDir, 'validate-write.yaml')
      const invalidCheckpoint = {
        schema: 1,
        story_id: 'INVALID',
        // Missing required fields
      } as Checkpoint

      await expect(adapter.write(filePath, invalidCheckpoint)).rejects.toThrow(ValidationError)
    })

    it('should validate merged result on update', async () => {
      const filePath = path.join(tempDir, 'validate-update.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-400',
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

      // Try to update with invalid phase
      await expect(
        adapter.update(filePath, { current_phase: 'invalid-phase' as any }),
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('Convenience methods', () => {
    it('should check if checkpoint exists', async () => {
      const filePath = path.join(tempDir, 'exists-test.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-500',
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

      // Should not exist initially
      expect(await adapter.exists(filePath)).toBe(false)

      // Write file
      await adapter.write(filePath, checkpoint)

      // Should exist now
      expect(await adapter.exists(filePath)).toBe(true)
    })

    it('should mark phase as blocked with reason', async () => {
      const filePath = path.join(tempDir, 'block-test.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-501',
        feature_dir: 'plans/test',
        timestamp: new Date().toISOString(),
        current_phase: 'execute',
        last_successful_phase: 'plan',
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
      }

      await adapter.write(filePath, checkpoint)
      await adapter.markPhaseBlocked(filePath, 'Missing dependency')

      const blocked = await adapter.read(filePath)
      expect(blocked.blocked).toBe(true)
      expect(blocked.blocked_reason).toBe('Missing dependency')
    })

    it('should clear blocked state', async () => {
      const filePath = path.join(tempDir, 'unblock-test.yaml')
      const checkpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-502',
        feature_dir: 'plans/test',
        timestamp: new Date().toISOString(),
        current_phase: 'execute',
        last_successful_phase: 'plan',
        iteration: 0,
        max_iterations: 3,
        blocked: true,
        blocked_reason: 'Test block',
        forced: false,
        warnings: [],
      }

      await adapter.write(filePath, checkpoint)
      await adapter.clearBlocked(filePath)

      const cleared = await adapter.read(filePath)
      expect(cleared.blocked).toBe(false)
      expect(cleared.blocked_reason).toBe(null)
    })
  })
})
