import { describe, expect, it } from 'vitest'

import {
  CohesionFindingsSchema,
  createCohesionFindings,
} from '../cohesion-findings'

describe('CohesionFindingsSchema', () => {
  describe('schema validation', () => {
    it('validates a minimal cohesion findings artifact', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        findings: [],
        blocking_findings: [],
        overall_verdict: 'pass',
      }

      const result = CohesionFindingsSchema.parse(input)
      expect(result.story_id).toBe('WINT-4150')
      expect(result.findings).toHaveLength(0)
    })

    it('validates with max(5) findings', () => {
      const makeFinding = (i: number) => ({
        id: `finding-${i}`,
        description: `Finding ${i} description`,
        severity: 'warning' as const,
        recommendation: `Fix finding ${i}`,
      })

      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        findings: [1, 2, 3, 4, 5].map(makeFinding),
        blocking_findings: [],
        overall_verdict: 'warn',
      }

      const result = CohesionFindingsSchema.parse(input)
      expect(result.findings).toHaveLength(5)
    })

    it('rejects more than 5 findings', () => {
      const makeFinding = (i: number) => ({
        id: `finding-${i}`,
        description: `Finding ${i}`,
        severity: 'warning' as const,
        recommendation: `Fix ${i}`,
      })

      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        findings: [1, 2, 3, 4, 5, 6].map(makeFinding),
        blocking_findings: [],
        overall_verdict: 'warn',
      }

      expect(() => CohesionFindingsSchema.parse(input)).toThrow()
    })

    it('validates with max(2) blocking_findings', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        findings: [
          {
            id: 'f-1',
            description: 'First blocking issue',
            severity: 'blocking' as const,
            recommendation: 'Fix this',
          },
          {
            id: 'f-2',
            description: 'Second blocking issue',
            severity: 'blocking' as const,
            recommendation: 'Fix that',
          },
        ],
        blocking_findings: ['f-1', 'f-2'],
        overall_verdict: 'fail',
      }

      const result = CohesionFindingsSchema.parse(input)
      expect(result.blocking_findings).toHaveLength(2)
    })

    it('rejects more than 2 blocking_findings', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        findings: [
          { id: 'f-1', description: 'D1', severity: 'blocking' as const, recommendation: 'R1' },
          { id: 'f-2', description: 'D2', severity: 'blocking' as const, recommendation: 'R2' },
          { id: 'f-3', description: 'D3', severity: 'blocking' as const, recommendation: 'R3' },
        ],
        blocking_findings: ['f-1', 'f-2', 'f-3'],
        overall_verdict: 'fail',
      }

      expect(() => CohesionFindingsSchema.parse(input)).toThrow()
    })

    it('rejects invalid overall_verdict', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        findings: [],
        blocking_findings: [],
        overall_verdict: 'unknown',
      }

      expect(() => CohesionFindingsSchema.parse(input)).toThrow()
    })

    it('allows optional user_flow on findings', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        findings: [
          {
            id: 'f-1',
            description: 'Missing empty state',
            severity: 'warning' as const,
            user_flow: 'Upload Flow',
            recommendation: 'Add empty state handler',
          },
        ],
        blocking_findings: [],
        overall_verdict: 'warn',
      }

      const result = CohesionFindingsSchema.parse(input)
      expect(result.findings[0].user_flow).toBe('Upload Flow')
    })
  })

  describe('createCohesionFindings', () => {
    it('creates an empty cohesion findings artifact', () => {
      const findings = createCohesionFindings('WINT-4150')

      expect(findings.story_id).toBe('WINT-4150')
      expect(findings.findings).toEqual([])
      expect(findings.blocking_findings).toEqual([])
      expect(findings.overall_verdict).toBe('pass')
    })

    it('creates a valid artifact that passes schema validation', () => {
      const findings = createCohesionFindings('WINT-4150')

      expect(() => CohesionFindingsSchema.parse(findings)).not.toThrow()
    })
  })
})
