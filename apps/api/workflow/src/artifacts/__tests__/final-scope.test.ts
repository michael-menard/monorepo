import { describe, expect, it } from 'vitest'

import { createFinalScope, FinalScopeSchema } from '../final-scope'

describe('FinalScopeSchema', () => {
  describe('schema validation', () => {
    it('validates a valid final scope', () => {
      const input = {
        schema_version: '1.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        final_acs: [
          { id: 'AC-1', description: 'Schema gaps.ts exists', in_mvp: true },
          { id: 'AC-2', description: 'CohesionFindings max 5', in_mvp: true },
        ],
        followups: [],
        warnings: [],
      }

      const result = FinalScopeSchema.parse(input)
      expect(result.schema_version).toBe('1.0')
      expect(result.final_acs).toHaveLength(2)
    })

    it('rejects schema_version 1.0-draft (provisional version)', () => {
      const input = {
        schema_version: '1.0-draft',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        final_acs: [{ id: 'AC-1', description: 'A', in_mvp: true }],
        followups: [],
        warnings: [],
      }

      expect(() => FinalScopeSchema.parse(input)).toThrow()
    })

    it('rejects schema_version 2.0', () => {
      const input = {
        schema_version: '2.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        final_acs: [{ id: 'AC-1', description: 'A', in_mvp: true }],
        followups: [],
        warnings: [],
      }

      expect(() => FinalScopeSchema.parse(input)).toThrow()
    })

    it('validates followups with conflict: true', () => {
      const input = {
        schema_version: '1.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        final_acs: [{ id: 'AC-1', description: 'Schema exists', in_mvp: true }],
        followups: [
          {
            id: 'followup-1',
            description: 'Consider adding a migration script',
            conflict: true,
            suggested_story_id: 'WINT-4200',
          },
        ],
        warnings: [],
      }

      const result = FinalScopeSchema.parse(input)
      expect(result.followups[0].conflict).toBe(true)
    })

    it('validates followups with conflict: false', () => {
      const input = {
        schema_version: '1.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        final_acs: [{ id: 'AC-1', description: 'Schema exists', in_mvp: true }],
        followups: [
          {
            id: 'followup-1',
            description: 'Add observability for elab metrics',
            conflict: false,
          },
        ],
        warnings: [],
      }

      const result = FinalScopeSchema.parse(input)
      expect(result.followups[0].conflict).toBe(false)
    })

    it('validates warnings array', () => {
      const input = {
        schema_version: '1.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        final_acs: [{ id: 'AC-1', description: 'Schema exists', in_mvp: true }],
        followups: [],
        warnings: ['AC-3 was not fully elaborated', 'UserFlowsSchema re-export is advisory'],
      }

      const result = FinalScopeSchema.parse(input)
      expect(result.warnings).toHaveLength(2)
    })

    it('rejects empty final_acs array', () => {
      const input = {
        schema_version: '1.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        final_acs: [],
        followups: [],
        warnings: [],
      }

      expect(() => FinalScopeSchema.parse(input)).toThrow()
    })

    it('defaults followups and warnings to empty arrays when omitted', () => {
      const input = {
        schema_version: '1.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        final_acs: [{ id: 'AC-1', description: 'Schema exists', in_mvp: true }],
      }

      const result = FinalScopeSchema.parse(input)
      expect(result.followups).toEqual([])
      expect(result.warnings).toEqual([])
    })
  })

  describe('createFinalScope', () => {
    it('creates a valid final scope artifact', () => {
      const acs = [{ id: 'AC-1', description: 'Schema gaps.ts defined', in_mvp: true }]
      const fs = createFinalScope('WINT-4150', acs)

      expect(fs.schema_version).toBe('1.0')
      expect(fs.story_id).toBe('WINT-4150')
      expect(fs.final_acs).toEqual(acs)
      expect(fs.followups).toEqual([])
      expect(fs.warnings).toEqual([])
    })

    it('creates a valid artifact that passes schema validation', () => {
      const fs = createFinalScope('WINT-4150', [
        { id: 'AC-1', description: 'Schema exists', in_mvp: true },
      ])

      expect(() => FinalScopeSchema.parse(fs)).not.toThrow()
    })
  })
})
