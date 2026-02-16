/**
 * Core Artifacts Schema Unit Tests
 *
 * Tests schema validation for the 4 core artifact types:
 * - Story artifacts
 * - Checkpoint artifacts
 * - Scope artifacts
 * - Plan artifacts
 *
 * Story: INFR-0110 AC-11
 */

import { describe, it, expect } from 'vitest'
import {
  insertStoryArtifactSchema,
  insertCheckpointArtifactSchema,
  insertScopeArtifactSchema,
  insertPlanArtifactSchema,
  type AcceptanceCriterion,
  type Risk,
  type ScopeTouches,
  type RiskFlags,
  type PlanStep,
  type FileChange,
  type Command,
  type AcceptanceCriteriaMap,
} from '../artifacts'

describe('Core Artifacts Schema Validation', () => {
  describe('Story Artifact Schema', () => {
    it('should accept valid story artifact with all fields', () => {
      const validArtifact = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Story',
        storyType: 'feature',
        state: 'ready-to-work',
        scopeSummary: 'Brief summary',
        acceptanceCriteria: [
          {
            id: 'AC-001',
            description: 'Should do something',
            testable: true,
            automated: false,
          },
        ] as AcceptanceCriterion[],
        risks: [
          {
            id: 'RISK-001',
            description: 'Potential risk',
            severity: 'medium' as const,
            mitigation: 'Mitigation strategy',
          },
        ] as Risk[],
      }

      const result = insertStoryArtifactSchema.safeParse(validArtifact)
      expect(result.success).toBe(true)
    })

    it('should accept valid story artifact with minimal fields', () => {
      const minimalArtifact = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Minimal Story',
        storyType: 'bug',
        state: 'backlog',
      }

      const result = insertStoryArtifactSchema.safeParse(minimalArtifact)
      expect(result.success).toBe(true)
    })

    it('should reject story artifact with invalid UUID', () => {
      const invalidArtifact = {
        storyId: 'not-a-uuid',
        title: 'Test Story',
        storyType: 'feature',
        state: 'backlog',
      }

      const result = insertStoryArtifactSchema.safeParse(invalidArtifact)
      expect(result.success).toBe(false)
    })

    it('should reject story artifact missing required fields', () => {
      const invalidArtifact = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        // Missing title, storyType, state
      }

      const result = insertStoryArtifactSchema.safeParse(invalidArtifact)
      expect(result.success).toBe(false)
    })

    it('should validate JSONB acceptance_criteria structure', () => {
      const artifact = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Story',
        storyType: 'feature',
        state: 'ready-to-work',
        acceptanceCriteria: [
          {
            id: 'AC-001',
            description: 'Valid AC',
            testable: true,
            automated: true,
          },
          {
            id: 'AC-002',
            description: 'Another valid AC',
            testable: false,
            automated: false,
          },
        ] as AcceptanceCriterion[],
      }

      const result = insertStoryArtifactSchema.safeParse(artifact)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.acceptanceCriteria).toHaveLength(2)
      }
    })

    it('should validate JSONB risks structure', () => {
      const artifact = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Story',
        storyType: 'feature',
        state: 'ready-to-work',
        risks: [
          {
            id: 'RISK-001',
            description: 'High severity risk',
            severity: 'high' as const,
            mitigation: 'Careful review',
          },
          {
            id: 'RISK-002',
            description: 'Low severity risk',
            severity: 'low' as const,
            mitigation: null,
          },
        ] as Risk[],
      }

      const result = insertStoryArtifactSchema.safeParse(artifact)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.risks).toHaveLength(2)
      }
    })
  })

  describe('Checkpoint Artifact Schema', () => {
    it('should accept valid checkpoint artifact', () => {
      const validCheckpoint = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        phase: 'execute',
        substep: 'backend',
        completedSteps: ['step-1', 'step-2', 'step-3'],
      }

      const result = insertCheckpointArtifactSchema.safeParse(validCheckpoint)
      expect(result.success).toBe(true)
    })

    it('should accept checkpoint without optional fields', () => {
      const minimalCheckpoint = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        phase: 'plan',
      }

      const result = insertCheckpointArtifactSchema.safeParse(minimalCheckpoint)
      expect(result.success).toBe(true)
    })

    it('should validate JSONB completed_steps array', () => {
      const checkpoint = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        phase: 'review',
        completedSteps: ['step-1', 'step-2', 'step-3', 'step-4', 'step-5'],
      }

      const result = insertCheckpointArtifactSchema.safeParse(checkpoint)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.completedSteps).toHaveLength(5)
      }
    })
  })

  describe('Scope Artifact Schema', () => {
    it('should accept valid scope artifact with all surfaces', () => {
      const validScope = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        packagesTouched: ['@repo/ui', '@repo/api-client', '@repo/database-schema'],
        surfaces: {
          backend: true,
          frontend: true,
          packages: true,
          db: false,
          contracts: false,
          ui: true,
          infra: false,
        } as ScopeTouches,
        riskFlags: {
          auth: false,
          payments: false,
          migrations: true,
          external_apis: false,
          security: false,
          performance: false,
        } as RiskFlags,
      }

      const result = insertScopeArtifactSchema.safeParse(validScope)
      expect(result.success).toBe(true)
    })

    it('should accept scope with minimal fields', () => {
      const minimalScope = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = insertScopeArtifactSchema.safeParse(minimalScope)
      expect(result.success).toBe(true)
    })

    it('should validate JSONB surfaces structure', () => {
      const scope = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        surfaces: {
          backend: true,
          frontend: false,
          packages: true,
          db: true,
          contracts: false,
          ui: false,
          infra: false,
        } as ScopeTouches,
      }

      const result = insertScopeArtifactSchema.safeParse(scope)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.surfaces?.backend).toBe(true)
        expect(result.data.surfaces?.frontend).toBe(false)
      }
    })

    it('should validate JSONB risk_flags structure', () => {
      const scope = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        riskFlags: {
          auth: true,
          payments: true,
          migrations: false,
          external_apis: false,
          security: true,
          performance: false,
        } as RiskFlags,
      }

      const result = insertScopeArtifactSchema.safeParse(scope)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.riskFlags?.auth).toBe(true)
        expect(result.data.riskFlags?.payments).toBe(true)
      }
    })
  })

  describe('Plan Artifact Schema', () => {
    it('should accept valid plan artifact with all fields', () => {
      const validPlan = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        steps: [
          {
            id: 1,
            description: 'Create schema file',
            files: ['src/schema/artifacts.ts'],
            dependencies: [],
            slice: 'packages' as const,
          },
          {
            id: 2,
            description: 'Generate migration',
            files: ['src/migrations/app/00XX.sql'],
            dependencies: [1],
            slice: 'packages' as const,
          },
        ] as PlanStep[],
        fileChanges: [
          {
            path: 'src/schema/artifacts.ts',
            action: 'create' as const,
            reason: 'New schema file',
          },
          {
            path: 'src/schema/index.ts',
            action: 'modify' as const,
            reason: 'Export artifacts schema',
          },
        ] as FileChange[],
        commands: [
          {
            command: 'pnpm db:generate',
            when: 'after schema created',
            required: true,
          },
          {
            command: 'pnpm test',
            when: 'after all changes',
            required: true,
          },
        ] as Command[],
        acMapping: [
          {
            ac_id: 'AC-001',
            planned_evidence: 'File exists: src/schema/artifacts.ts',
            evidence_type: 'file' as const,
          },
          {
            ac_id: 'AC-002',
            planned_evidence: 'Migration generated successfully',
            evidence_type: 'command' as const,
          },
        ] as AcceptanceCriteriaMap[],
      }

      const result = insertPlanArtifactSchema.safeParse(validPlan)
      expect(result.success).toBe(true)
    })

    it('should accept plan with minimal fields', () => {
      const minimalPlan = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = insertPlanArtifactSchema.safeParse(minimalPlan)
      expect(result.success).toBe(true)
    })

    it('should validate JSONB steps structure', () => {
      const plan = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        steps: [
          {
            id: 1,
            description: 'Step 1',
            files: ['file1.ts'],
            dependencies: [],
          },
          {
            id: 2,
            description: 'Step 2',
            files: ['file2.ts', 'file3.ts'],
            dependencies: [1],
            slice: 'backend' as const,
          },
        ] as PlanStep[],
      }

      const result = insertPlanArtifactSchema.safeParse(plan)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.steps).toHaveLength(2)
        expect(result.data.steps?.[1]?.dependencies).toContain(1)
      }
    })

    it('should validate JSONB file_changes structure', () => {
      const plan = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        fileChanges: [
          { path: 'new-file.ts', action: 'create' as const },
          { path: 'existing-file.ts', action: 'modify' as const, reason: 'Update logic' },
          { path: 'old-file.ts', action: 'delete' as const },
        ] as FileChange[],
      }

      const result = insertPlanArtifactSchema.safeParse(plan)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fileChanges).toHaveLength(3)
      }
    })

    it('should validate JSONB commands structure', () => {
      const plan = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        commands: [
          { command: 'pnpm build', when: 'after code changes', required: true },
          { command: 'pnpm test', when: 'before commit', required: true },
          { command: 'pnpm lint', when: 'before commit', required: false },
        ] as Command[],
      }

      const result = insertPlanArtifactSchema.safeParse(plan)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.commands).toHaveLength(3)
      }
    })

    it('should validate JSONB ac_mapping structure', () => {
      const plan = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        acMapping: [
          { ac_id: 'AC-001', planned_evidence: 'Unit tests pass', evidence_type: 'test' as const },
          { ac_id: 'AC-002', planned_evidence: 'API returns 200', evidence_type: 'http' as const },
          { ac_id: 'AC-003', planned_evidence: 'File created', evidence_type: 'file' as const },
        ] as AcceptanceCriteriaMap[],
      }

      const result = insertPlanArtifactSchema.safeParse(plan)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.acMapping).toHaveLength(3)
      }
    })
  })
})
