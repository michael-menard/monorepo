import { describe, expect, it } from 'vitest'

import {
  createEvidenceExpectations,
  EvidenceExpectationsSchema,
  ExpectationSchema,
} from '../evidence-expectations'

describe('EvidenceExpectationsSchema', () => {
  describe('schema validation', () => {
    it('validates a minimal evidence expectations artifact with empty array', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        expectations: [],
      }

      const result = EvidenceExpectationsSchema.parse(input)
      expect(result.story_id).toBe('WINT-4150')
      expect(result.expectations).toHaveLength(0)
    })

    it('validates expectations with all evidence types', () => {
      const evidenceTypes = ['test', 'file', 'command', 'manual'] as const
      for (const evidenceType of evidenceTypes) {
        const expectation = ExpectationSchema.parse({
          id: 'exp-1',
          ac_id: 'AC-1',
          description: 'Something must exist',
          evidence_type: evidenceType,
          required: true,
        })
        expect(expectation.evidence_type).toBe(evidenceType)
      }
    })

    it('validates with optional verification_command absent', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        expectations: [
          {
            id: 'exp-1',
            ac_id: 'AC-1',
            description: 'gaps.ts file must exist with GapsSchema export',
            evidence_type: 'file' as const,
            required: true,
          },
        ],
      }

      const result = EvidenceExpectationsSchema.parse(input)
      expect(result.expectations[0].verification_command).toBeUndefined()
    })

    it('validates with optional verification_command present', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        expectations: [
          {
            id: 'exp-2',
            ac_id: 'AC-9',
            description: 'All schemas exported from index.ts',
            evidence_type: 'command' as const,
            verification_command: 'pnpm check-types --filter @repo/orchestrator',
            required: true,
          },
        ],
      }

      const result = EvidenceExpectationsSchema.parse(input)
      expect(result.expectations[0].verification_command).toBe(
        'pnpm check-types --filter @repo/orchestrator',
      )
    })

    it('defaults required to true when not provided', () => {
      const expectation = ExpectationSchema.parse({
        id: 'exp-1',
        ac_id: 'AC-1',
        description: 'Must exist',
        evidence_type: 'test',
      })

      expect(expectation.required).toBe(true)
    })

    it('allows required: false for optional expectations', () => {
      const expectation = ExpectationSchema.parse({
        id: 'exp-1',
        ac_id: 'AC-10',
        description: 'Advisory gate check',
        evidence_type: 'manual',
        required: false,
      })

      expect(expectation.required).toBe(false)
    })

    it('rejects invalid evidence_type', () => {
      expect(() =>
        ExpectationSchema.parse({
          id: 'exp-1',
          ac_id: 'AC-1',
          description: 'Test',
          evidence_type: 'screenshot',
          required: true,
        }),
      ).toThrow()
    })
  })

  describe('createEvidenceExpectations', () => {
    it('creates an empty evidence expectations artifact', () => {
      const ee = createEvidenceExpectations('WINT-4150')

      expect(ee.story_id).toBe('WINT-4150')
      expect(ee.expectations).toEqual([])
      expect(ee.generated_at).toBeDefined()
    })

    it('creates a valid artifact that passes schema validation', () => {
      const ee = createEvidenceExpectations('WINT-4150')

      expect(() => EvidenceExpectationsSchema.parse(ee)).not.toThrow()
    })

    it('generated_at is a valid ISO datetime', () => {
      const ee = createEvidenceExpectations('WINT-4150')
      const parsed = new Date(ee.generated_at)

      expect(parsed.toISOString()).toBe(ee.generated_at)
    })
  })
})
