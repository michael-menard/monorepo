import { describe, expect, it } from 'vitest'

import { createPlan, PlanSchema } from '../plan'

describe('PlanSchema', () => {
  describe('schema validation', () => {
    it('validates a minimal valid plan', () => {
      const plan = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        steps: [],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [],
        architectural_decisions: [],
        notes: [],
      }

      const result = PlanSchema.parse(plan)
      expect(result).toMatchObject(plan)
    })

    it('validates a complete plan', () => {
      const plan = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        steps: [
          {
            id: 1,
            description: 'Create upload handler',
            files: ['src/handlers/upload.ts'],
            dependencies: [],
            slice: 'backend',
          },
          {
            id: 2,
            description: 'Create upload form component',
            files: ['src/components/UploadForm.tsx'],
            dependencies: [1],
            slice: 'frontend',
          },
        ],
        files_to_change: [
          { path: 'src/handlers/upload.ts', action: 'create', reason: 'New upload handler' },
          { path: 'src/components/UploadForm.tsx', action: 'create', reason: 'Upload UI' },
          { path: 'src/routes/index.ts', action: 'modify', reason: 'Add upload route' },
        ],
        commands_to_run: [
          { command: 'pnpm test', when: 'after implementation', required: true },
          { command: 'pnpm build', when: 'after tests pass', required: true },
        ],
        acceptance_criteria_map: [
          { ac_id: 'AC1', planned_evidence: 'Unit test for upload handler', evidence_type: 'test' },
          { ac_id: 'AC2', planned_evidence: 'HTTP test for endpoint', evidence_type: 'http' },
        ],
        architectural_decisions: [
          {
            id: 'ADR-001',
            question: 'How to handle large file uploads?',
            decision: 'Use presigned S3 URLs',
            rationale: 'Avoids Lambda timeout issues',
            decided_by: 'agent',
          },
        ],
        complexity: 'moderate',
        notes: ['Consider rate limiting for uploads'],
      }

      const result = PlanSchema.parse(plan)
      expect(result.steps).toHaveLength(2)
      expect(result.files_to_change).toHaveLength(3)
      expect(result.commands_to_run).toHaveLength(2)
      expect(result.acceptance_criteria_map).toHaveLength(2)
      expect(result.architectural_decisions).toHaveLength(1)
    })

    it('validates step dependencies', () => {
      const plan = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        steps: [
          { id: 1, description: 'Step 1', files: ['a.ts'], dependencies: [] },
          { id: 2, description: 'Step 2', files: ['b.ts'], dependencies: [1] },
          { id: 3, description: 'Step 3', files: ['c.ts'], dependencies: [1, 2] },
        ],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [],
      }

      const result = PlanSchema.parse(plan)
      expect(result.steps[2].dependencies).toEqual([1, 2])
    })

    it('rejects invalid file action', () => {
      const plan = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        steps: [],
        files_to_change: [{ path: 'file.ts', action: 'rename' }],
        commands_to_run: [],
        acceptance_criteria_map: [],
      }

      expect(() => PlanSchema.parse(plan)).toThrow()
    })

    it('rejects invalid slice value', () => {
      const plan = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        steps: [
          { id: 1, description: 'Step', files: ['a.ts'], dependencies: [], slice: 'database' },
        ],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [],
      }

      expect(() => PlanSchema.parse(plan)).toThrow()
    })

    it('rejects invalid evidence type', () => {
      const plan = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        steps: [],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [
          { ac_id: 'AC1', planned_evidence: 'Something', evidence_type: 'screenshot' },
        ],
      }

      expect(() => PlanSchema.parse(plan)).toThrow()
    })

    it('rejects invalid complexity', () => {
      const plan = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        steps: [],
        files_to_change: [],
        commands_to_run: [],
        acceptance_criteria_map: [],
        complexity: 'easy',
      }

      expect(() => PlanSchema.parse(plan)).toThrow()
    })
  })

  describe('createPlan', () => {
    it('creates an empty plan', () => {
      const plan = createPlan('WISH-001')

      expect(plan.schema).toBe(1)
      expect(plan.story_id).toBe('WISH-001')
      expect(plan.steps).toEqual([])
      expect(plan.files_to_change).toEqual([])
      expect(plan.commands_to_run).toEqual([])
      expect(plan.acceptance_criteria_map).toEqual([])
      expect(plan.architectural_decisions).toEqual([])
      expect(plan.notes).toEqual([])
    })

    it('creates a valid plan that passes schema validation', () => {
      const plan = createPlan('WISH-001')

      expect(() => PlanSchema.parse(plan)).not.toThrow()
    })

    it('has a valid timestamp', () => {
      const plan = createPlan('WISH-001')

      expect(plan.timestamp).toBeDefined()
      expect(() => new Date(plan.timestamp)).not.toThrow()
    })
  })
})
