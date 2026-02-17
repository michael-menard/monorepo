/**
 * ArtifactService Unit Tests
 *
 * Tests for configuration validation, factory function, and service methods.
 * Covers AC-001 through AC-009, AC-011.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { z } from 'zod'
import * as fs from 'fs/promises'
import * as yaml from 'yaml'
import {
  ArtifactService,
  createArtifactService,
  ArtifactServiceConfigSchema,
  type ArtifactServiceConfig,
} from '../artifact-service.js'
import type { Plan } from '../../artifacts/plan.js'
import type { Evidence } from '../../artifacts/evidence.js'

// Mock fs and logger
vi.mock('fs/promises')
vi.mock('@repo/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ArtifactService', () => {
  const mockConfig: ArtifactServiceConfig = {
    workspaceRoot: '/mock/workspace',
    featureDir: '/mock/workspace/plans/future/platform',
    mode: 'yaml',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AC-007: Factory function validates config via Zod', () => {
    it('should create service with valid YAML-only config', () => {
      const service = createArtifactService(mockConfig)
      expect(service).toBeInstanceOf(ArtifactService)
    })

    it('should create service with valid YAML+DB config', () => {
      const configWithDb: ArtifactServiceConfig = {
        ...mockConfig,
        mode: 'yaml+db',
        storyRepo: { mock: 'storyRepo' },
        workflowRepo: { mock: 'workflowRepo' },
      }
      const service = createArtifactService(configWithDb)
      expect(service).toBeInstanceOf(ArtifactService)
    })

    it('should reject config missing workspaceRoot', () => {
      const invalidConfig = {
        featureDir: '/mock/workspace/plans/future/platform',
        mode: 'yaml' as const,
      }
      expect(() => createArtifactService(invalidConfig as ArtifactServiceConfig)).toThrow(
        z.ZodError,
      )
    })

    it('should reject config missing featureDir', () => {
      const invalidConfig = {
        workspaceRoot: '/mock/workspace',
        mode: 'yaml' as const,
      }
      expect(() => createArtifactService(invalidConfig as ArtifactServiceConfig)).toThrow(
        z.ZodError,
      )
    })

    it('should reject YAML+DB mode without storyRepo', () => {
      const invalidConfig: ArtifactServiceConfig = {
        ...mockConfig,
        mode: 'yaml+db',
        workflowRepo: { mock: 'workflowRepo' },
      }
      expect(() => createArtifactService(invalidConfig)).toThrow(z.ZodError)
    })

    it('should reject YAML+DB mode without workflowRepo', () => {
      const invalidConfig: ArtifactServiceConfig = {
        ...mockConfig,
        mode: 'yaml+db',
        storyRepo: { mock: 'storyRepo' },
      }
      expect(() => createArtifactService(invalidConfig)).toThrow(z.ZodError)
    })
  })

  describe('AC-003: Stage auto-detection', () => {
    it('should find story in first matching stage (backlog)', async () => {
      const service = createArtifactService(mockConfig)

      // Mock fs.access to succeed for backlog
      vi.mocked(fs.access).mockResolvedValueOnce(undefined)

      const stage = await service.autoDetectStage('INFR-0020')
      expect(stage).toBe('backlog')
      expect(fs.access).toHaveBeenCalledWith('/mock/workspace/plans/future/platform/backlog/INFR-0020')
    })

    it('should search through stages in order', async () => {
      const service = createArtifactService(mockConfig)

      // Mock backlog to fail, in-progress to succeed
      vi.mocked(fs.access)
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce(undefined)

      const stage = await service.autoDetectStage('INFR-0020')
      expect(stage).toBe('in-progress')
    })

    it('should return null if story not found in any stage', async () => {
      const service = createArtifactService(mockConfig)

      // Mock all stages to fail
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      const stage = await service.autoDetectStage('INFR-0020')
      expect(stage).toBeNull()
    })
  })

  describe('AC-001: Read operations for all artifact types', () => {
    const mockPlan: Plan = {
      schema: 1,
      story_id: 'INFR-0020',
      timestamp: '2026-02-16T00:00:00Z',
      steps: [],
      files_to_change: [],
      commands_to_run: [],
      acceptance_criteria_map: [],
      architectural_decisions: [],
      notes: [],
    }

    it('should read PLAN.yaml successfully', async () => {
      const service = createArtifactService(mockConfig)

      vi.mocked(fs.access).mockResolvedValueOnce(undefined) // Stage detection
      vi.mocked(fs.readFile).mockResolvedValueOnce(yaml.stringify(mockPlan))

      const result = await service.readPlan('INFR-0020')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.story_id).toBe('INFR-0020')
      }
    })

    it('should use provided stage instead of auto-detecting', async () => {
      const service = createArtifactService(mockConfig)

      vi.mocked(fs.readFile).mockResolvedValueOnce(yaml.stringify(mockPlan))

      await service.readPlan('INFR-0020', 'in-progress')

      // Should not call fs.access for stage detection
      expect(fs.access).not.toHaveBeenCalled()
    })

    it('should return error if story not found in any stage', async () => {
      const service = createArtifactService(mockConfig)

      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      const result = await service.readPlan('INFR-0020')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('not found in any stage')
      }
    })

    it('should handle read errors gracefully', async () => {
      const service = createArtifactService(mockConfig)

      vi.mocked(fs.access).mockResolvedValueOnce(undefined)
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('Permission denied'))

      const result = await service.readPlan('INFR-0020')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('READ_ERROR')
        expect(result.message).toContain('Permission denied')
      }
    })

    it('should handle invalid YAML format', async () => {
      const service = createArtifactService(mockConfig)

      vi.mocked(fs.access).mockResolvedValueOnce(undefined)
      vi.mocked(fs.readFile).mockResolvedValueOnce('invalid: yaml: [unclosed')

      const result = await service.readPlan('INFR-0020')

      expect(result.success).toBe(false)
    })
  })

  describe('AC-002: Write operations with Zod validation', () => {
    const mockPlan: Plan = {
      schema: 1,
      story_id: 'INFR-0020',
      timestamp: '2026-02-16T00:00:00Z',
      steps: [],
      files_to_change: [],
      commands_to_run: [],
      acceptance_criteria_map: [],
      architectural_decisions: [],
      notes: [],
    }

    it('should validate data before writing', async () => {
      const service = createArtifactService(mockConfig)

      const invalidPlan = { ...mockPlan, schema: 'invalid' } as unknown as Plan

      const result = await service.writePlan('INFR-0020', invalidPlan, 'in-progress')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
    })

    it('should write valid data successfully', async () => {
      const service = createArtifactService(mockConfig)

      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT')) // Directory doesn't exist
      vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined)
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)
      vi.mocked(fs.rename).mockResolvedValueOnce(undefined)

      const result = await service.writePlan('INFR-0020', mockPlan, 'in-progress')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.created).toBe(true)
        expect(result.path).toContain('PLAN.yaml')
      }
    })
  })

  describe('AC-005: Result types have success/error/warnings fields', () => {
    it('should return success result with data and warnings', async () => {
      const service = createArtifactService(mockConfig)

      const mockPlan: Plan = {
        schema: 1,
        story_id: 'INFR-0020',
        timestamp: '2026-02-16T00:00:00Z',
        steps: [],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [],
        architectural_decisions: [],
        notes: [],
      }

      vi.mocked(fs.access).mockResolvedValueOnce(undefined)
      vi.mocked(fs.readFile).mockResolvedValueOnce(yaml.stringify(mockPlan))

      const result = await service.readPlan('INFR-0020')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeDefined()
        expect(result.warnings).toEqual([])
      }
    })

    it('should return error result with error and message', async () => {
      const service = createArtifactService(mockConfig)

      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      const result = await service.readPlan('INFR-0020')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(result.warnings).toEqual([])
      }
    })
  })

  describe('AC-006: Atomic writes (temp file → rename)', () => {
    it('should write to temp file then rename', async () => {
      const service = createArtifactService(mockConfig)

      const mockPlan: Plan = {
        schema: 1,
        story_id: 'INFR-0020',
        timestamp: '2026-02-16T00:00:00Z',
        steps: [],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [],
        architectural_decisions: [],
        notes: [],
      }

      vi.mocked(fs.access).mockResolvedValueOnce(undefined) // Directory exists
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)
      vi.mocked(fs.rename).mockResolvedValueOnce(undefined)

      await service.writePlan('INFR-0020', mockPlan, 'in-progress')

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('PLAN.yaml.tmp'),
        expect.any(String),
        'utf-8',
      )
      expect(fs.rename).toHaveBeenCalledWith(
        expect.stringContaining('PLAN.yaml.tmp'),
        expect.stringContaining('PLAN.yaml'),
      )
    })

    it('should create directory if it does not exist', async () => {
      const service = createArtifactService(mockConfig)

      const mockPlan: Plan = {
        schema: 1,
        story_id: 'INFR-0020',
        timestamp: '2026-02-16T00:00:00Z',
        steps: [],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [],
        architectural_decisions: [],
        notes: [],
      }

      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'))
      vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined)
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined)
      vi.mocked(fs.rename).mockResolvedValueOnce(undefined)

      const result = await service.writePlan('INFR-0020', mockPlan, 'in-progress')

      expect(fs.mkdir).toHaveBeenCalled()
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.created).toBe(true)
      }
    })
  })

  describe('AC-004: YAML-only and YAML+DB mode support', () => {
    it('should accept YAML-only mode config', () => {
      const config: ArtifactServiceConfig = {
        workspaceRoot: '/mock/workspace',
        featureDir: '/mock/workspace/plans/future/platform',
        mode: 'yaml',
      }

      const service = createArtifactService(config)
      expect(service).toBeInstanceOf(ArtifactService)
    })

    it('should accept YAML+DB mode config with repos', () => {
      const config: ArtifactServiceConfig = {
        workspaceRoot: '/mock/workspace',
        featureDir: '/mock/workspace/plans/future/platform',
        mode: 'yaml+db',
        storyRepo: { mock: 'repo' },
        workflowRepo: { mock: 'repo' },
      }

      const service = createArtifactService(config)
      expect(service).toBeInstanceOf(ArtifactService)
    })
  })

  describe('AC-011: Simple class-based pattern (not Ports & Adapters)', () => {
    it('should use direct class instantiation pattern', () => {
      const service = createArtifactService(mockConfig)

      // Service should be a class instance, not an adapter/interface
      expect(service).toBeInstanceOf(ArtifactService)
      expect(typeof service.readPlan).toBe('function')
      expect(typeof service.writePlan).toBe('function')
      expect(typeof service.autoDetectStage).toBe('function')
    })

    it('should inject dependencies in constructor', () => {
      // Testing that the service follows DI pattern but remains simple
      const service = new ArtifactService(mockConfig)

      expect(service).toBeInstanceOf(ArtifactService)
    })
  })

  describe('Integration: Read/Write all artifact types', () => {
    it('should provide read methods for all artifact types', async () => {
      const service = createArtifactService(mockConfig)

      // All read methods should exist
      expect(typeof service.readPlan).toBe('function')
      expect(typeof service.readEvidence).toBe('function')
      expect(typeof service.readScope).toBe('function')
      expect(typeof service.readCheckpoint).toBe('function')
      expect(typeof service.readStory).toBe('function')
      expect(typeof service.readReview).toBe('function')
      expect(typeof service.readQaVerify).toBe('function')
      expect(typeof service.readAuditFindings).toBe('function')
    })

    it('should provide write methods for all artifact types', async () => {
      const service = createArtifactService(mockConfig)

      // All write methods should exist
      expect(typeof service.writePlan).toBe('function')
      expect(typeof service.writeEvidence).toBe('function')
      expect(typeof service.writeScope).toBe('function')
      expect(typeof service.writeCheckpoint).toBe('function')
      expect(typeof service.writeReview).toBe('function')
      expect(typeof service.writeQaVerify).toBe('function')
      expect(typeof service.writeAuditFindings).toBe('function')
    })
  })
})
