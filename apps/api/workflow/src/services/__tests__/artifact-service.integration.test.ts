/**
 * ArtifactService Integration Tests
 *
 * Tests read/write round-trip operations with actual filesystem.
 * Covers AC-010: Integration tests verify read/write round-trip for all artifact types.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { createArtifactService, type ArtifactServiceConfig } from '../artifact-service.js'
import type { Plan } from '../../artifacts/plan.js'
import type { Evidence } from '../../artifacts/evidence.js'
import type { Scope } from '../../artifacts/scope.js'
import type { Checkpoint } from '../../artifacts/checkpoint.js'

describe('ArtifactService Integration Tests', () => {
  let tempDir: string
  let config: ArtifactServiceConfig

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'artifact-service-test-'))
    config = {
      workspaceRoot: tempDir,
      featureDir: path.join(tempDir, 'plans', 'future', 'platform'),
      mode: 'yaml',
    }
  })

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('AC-010: Read/Write round-trip for all artifact types', () => {
    it('should perform PLAN.yaml round-trip successfully', async () => {
      const service = createArtifactService(config)

      const mockPlan: Plan = {
        schema: 1,
        story_id: 'TEST-001',
        timestamp: '2026-02-16T00:00:00Z',
        steps: [
          {
            id: 1,
            description: 'Create test file',
            files: ['test.ts'],
            dependencies: [],
            slice: 'packages',
          },
        ],
        files_to_change: [
          {
            path: 'test.ts',
            action: 'create',
            reason: 'Testing',
          },
        ],
        commands_to_run: [],
        acceptance_criteria_map: [],
        architectural_decisions: [],
        notes: ['Test plan'],
      }

      // Write
      const writeResult = await service.writePlan('TEST-001', mockPlan, 'in-progress')
      expect(writeResult.success).toBe(true)

      // Read back
      const readResult = await service.readPlan('TEST-001', 'in-progress')
      expect(readResult.success).toBe(true)

      if (readResult.success) {
        expect(readResult.data.story_id).toBe('TEST-001')
        expect(readResult.data.steps).toHaveLength(1)
        expect(readResult.data.steps[0].description).toBe('Create test file')
        expect(readResult.data.notes).toEqual(['Test plan'])
      }
    })

    it('should perform EVIDENCE.yaml round-trip successfully', async () => {
      const service = createArtifactService(config)

      const mockEvidence: Evidence = {
        schema: 2,
        story_id: 'TEST-002',
        version: 1,
        timestamp: '2026-02-16T00:00:00Z',
        acceptance_criteria: [
          {
            ac_id: 'AC-001',
            ac_text: 'Test criterion',
            status: 'PASS',
            evidence_items: [
              {
                type: 'test',
                path: 'test.test.ts',
                description: 'Test passes',
              },
            ],
          },
        ],
        touched_files: [],
        commands_run: [],
        endpoints_exercised: [],
        notable_decisions: [],
        known_deviations: [],
        test_summary: {
          unit: { pass: 1, fail: 0 },
        },
        e2e_tests: {
          status: 'pass',
          mode: 'live',
          config: 'playwright.legacy.config.ts',
          project: 'chromium-live',
          results: {
            total: 1,
            passed: 1,
            failed: 0,
            skipped: 0,
          },
          failed_tests: [],
          config_issues: [],
          videos: [],
          screenshots: [],
        },
        coverage: {
          lines: 0,
          branches: 0,
        },
        token_summary: {},
      }

      // Write
      const writeResult = await service.writeEvidence('TEST-002', mockEvidence, 'in-progress')
      expect(writeResult.success).toBe(true)

      // Read back
      const readResult = await service.readEvidence('TEST-002', 'in-progress')
      expect(readResult.success).toBe(true)

      if (readResult.success) {
        expect(readResult.data.story_id).toBe('TEST-002')
        expect(readResult.data.acceptance_criteria).toHaveLength(1)
        expect(readResult.data.acceptance_criteria[0].status).toBe('PASS')
      }
    })

    it('should perform SCOPE.yaml round-trip successfully', async () => {
      const service = createArtifactService(config)

      const mockScope: Scope = {
        schema: 1,
        story_id: 'TEST-003',
        timestamp: '2026-02-16T00:00:00Z',
        gen_mode: false,
        touches: {
          backend: true,
          frontend: false,
          packages: true,
          db: false,
          contracts: false,
          ui: false,
          infra: false,
        },
        touched_packages: ['@repo/test'],
        touched_paths_globs: ['packages/test/**'],
        risk_flags: {
          auth: false,
          payments: false,
          migrations: false,
          external_apis: false,
          security: false,
          performance: false,
          new_abstraction: true,
        },
        summary: 'Test scope',
        elaboration: 'completed',
        files_to_create: [],
        files_to_modify: [],
        acceptance_criteria_count: 1,
        story_points: 1,
        priority: 'P2',
        complexity: {
          estimated: 'simple',
          achievability: 'single_session',
        },
        dependencies: [],
      }

      // Write
      const writeResult = await service.writeScope('TEST-003', mockScope, 'in-progress')
      expect(writeResult.success).toBe(true)

      // Read back
      const readResult = await service.readScope('TEST-003', 'in-progress')
      expect(readResult.success).toBe(true)

      if (readResult.success) {
        expect(readResult.data.story_id).toBe('TEST-003')
        expect(readResult.data.touches.packages).toBe(true)
        expect(readResult.data.summary).toBe('Test scope')
      }
    })

    it('should perform CHECKPOINT.yaml round-trip successfully', async () => {
      const service = createArtifactService(config)

      const mockCheckpoint: Checkpoint = {
        schema: 1,
        story_id: 'TEST-004',
        feature_dir: config.featureDir,
        timestamp: '2026-02-16T00:00:00Z',
        current_phase: 'execute',
        last_successful_phase: 'plan',
        iteration: 0,
        max_iterations: 3,
        blocked: false,
        forced: false,
        warnings: [],
        gen_mode: false,
      }

      // Write
      const writeResult = await service.writeCheckpoint('TEST-004', mockCheckpoint, 'in-progress')
      expect(writeResult.success).toBe(true)

      // Read back
      const readResult = await service.readCheckpoint('TEST-004', 'in-progress')
      expect(readResult.success).toBe(true)

      if (readResult.success) {
        expect(readResult.data.story_id).toBe('TEST-004')
        expect(readResult.data.current_phase).toBe('execute')
        expect(readResult.data.iteration).toBe(0)
      }
    })

    it('should handle multiple artifacts for same story', async () => {
      const service = createArtifactService(config)

      const storyId = 'TEST-MULTI'
      const stage = 'in-progress'

      // Create plan
      const plan: Plan = {
        schema: 1,
        story_id: storyId,
        timestamp: '2026-02-16T00:00:00Z',
        steps: [],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [],
        architectural_decisions: [],
        notes: [],
      }

      // Create scope
      const scope: Scope = {
        schema: 1,
        story_id: storyId,
        timestamp: '2026-02-16T00:00:00Z',
        gen_mode: false,
        touches: {
          backend: false,
          frontend: false,
          packages: true,
          db: false,
          contracts: false,
          ui: false,
          infra: false,
        },
        touched_packages: [],
        touched_paths_globs: [],
        risk_flags: {
          auth: false,
          payments: false,
          migrations: false,
          external_apis: false,
          security: false,
          performance: false,
          new_abstraction: false,
        },
        summary: 'Multi-artifact test',
        elaboration: 'completed',
        files_to_create: [],
        files_to_modify: [],
        acceptance_criteria_count: 0,
        story_points: 1,
        priority: 'P2',
        complexity: {
          estimated: 'simple',
          achievability: 'single_session',
        },
        dependencies: [],
      }

      // Write both
      const planWrite = await service.writePlan(storyId, plan, stage)
      const scopeWrite = await service.writeScope(storyId, scope, stage)

      expect(planWrite.success).toBe(true)
      expect(scopeWrite.success).toBe(true)

      // Read both back
      const planRead = await service.readPlan(storyId, stage)
      const scopeRead = await service.readScope(storyId, stage)

      expect(planRead.success).toBe(true)
      expect(scopeRead.success).toBe(true)
    })

    it('should handle file not found gracefully', async () => {
      const service = createArtifactService(config)

      const result = await service.readPlan('NONEXISTENT', 'in-progress')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('READ_ERROR')
      }
    })
  })

  describe('Stage auto-detection integration', () => {
    it('should auto-detect story in in-progress stage', async () => {
      const service = createArtifactService(config)

      const mockPlan: Plan = {
        schema: 1,
        story_id: 'AUTO-001',
        timestamp: '2026-02-16T00:00:00Z',
        steps: [],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [],
        architectural_decisions: [],
        notes: [],
      }

      // Write to in-progress
      await service.writePlan('AUTO-001', mockPlan, 'in-progress')

      // Read without specifying stage (should auto-detect)
      const result = await service.readPlan('AUTO-001')

      expect(result.success).toBe(true)
    })

    it('should search through multiple stages', async () => {
      const service = createArtifactService(config)

      const mockPlan: Plan = {
        schema: 1,
        story_id: 'AUTO-002',
        timestamp: '2026-02-16T00:00:00Z',
        steps: [],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [],
        architectural_decisions: [],
        notes: [],
      }

      // Write to ready-for-qa (later in search order)
      await service.writePlan('AUTO-002', mockPlan, 'ready-for-qa')

      // Read without specifying stage
      const result = await service.readPlan('AUTO-002')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.story_id).toBe('AUTO-002')
      }
    })
  })

  describe('Atomic writes verification', () => {
    it('should preserve existing directory when writing', async () => {
      const service = createArtifactService(config)

      const plan1: Plan = {
        schema: 1,
        story_id: 'ATOMIC-001',
        timestamp: '2026-02-16T00:00:00Z',
        steps: [],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [],
        architectural_decisions: [],
        notes: ['Version 1'],
      }

      const plan2: Plan = {
        ...plan1,
        notes: ['Version 2'],
      }

      // Write first version
      const write1 = await service.writePlan('ATOMIC-001', plan1, 'in-progress')
      expect(write1.success).toBe(true)
      if (write1.success) {
        expect(write1.created).toBe(true)
      }

      // Write second version (directory already exists)
      const write2 = await service.writePlan('ATOMIC-001', plan2, 'in-progress')
      expect(write2.success).toBe(true)
      if (write2.success) {
        expect(write2.created).toBe(false)
      }

      // Verify second version was written
      const read = await service.readPlan('ATOMIC-001', 'in-progress')
      expect(read.success).toBe(true)
      if (read.success) {
        expect(read.data.notes).toEqual(['Version 2'])
      }
    })
  })
})
