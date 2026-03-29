import { describe, expect, it } from 'vitest'

import { createMvpSlice, MvpSliceSchema } from '../mvp-slice'

describe('MvpSliceSchema', () => {
  describe('schema validation', () => {
    it('validates a valid MVP slice with included and excluded ACs', () => {
      const input = {
        schema_version: '1.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        included_acs: ['AC-1', 'AC-2', 'AC-3'],
        excluded_acs: ['AC-4', 'AC-5'],
        rationale: 'AC-4 and AC-5 are nice-to-have and can be deferred to the next iteration.',
      }

      const result = MvpSliceSchema.parse(input)
      expect(result.included_acs).toHaveLength(3)
      expect(result.excluded_acs).toHaveLength(2)
    })

    it('validates when excluded_acs is empty', () => {
      const input = {
        schema_version: '1.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        included_acs: ['AC-1', 'AC-2'],
        excluded_acs: [],
        rationale: 'All ACs are in scope for MVP.',
      }

      const result = MvpSliceSchema.parse(input)
      expect(result.excluded_acs).toEqual([])
    })

    it('defaults excluded_acs to empty when omitted', () => {
      const input = {
        schema_version: '1.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        included_acs: ['AC-1'],
        rationale: 'Only AC-1 in MVP.',
      }

      const result = MvpSliceSchema.parse(input)
      expect(result.excluded_acs).toEqual([])
    })

    it('rejects schema_version other than 1.0', () => {
      const input = {
        schema_version: '2.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        included_acs: ['AC-1'],
        rationale: 'Test',
      }

      expect(() => MvpSliceSchema.parse(input)).toThrow()
    })

    it('rejects empty included_acs array', () => {
      const input = {
        schema_version: '1.0',
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        included_acs: [],
        rationale: 'No ACs?',
      }

      expect(() => MvpSliceSchema.parse(input)).toThrow()
    })
  })

  describe('createMvpSlice', () => {
    it('creates a valid MVP slice artifact', () => {
      const slice = createMvpSlice('WINT-4150', ['AC-1', 'AC-2', 'AC-3'], 'Full scope is MVP.')

      expect(slice.schema_version).toBe('1.0')
      expect(slice.story_id).toBe('WINT-4150')
      expect(slice.included_acs).toEqual(['AC-1', 'AC-2', 'AC-3'])
      expect(slice.excluded_acs).toEqual([])
      expect(slice.rationale).toBe('Full scope is MVP.')
    })

    it('creates a valid artifact that passes schema validation', () => {
      const slice = createMvpSlice('WINT-4150', ['AC-1'], 'Minimal MVP.')

      expect(() => MvpSliceSchema.parse(slice)).not.toThrow()
    })

    it('generated_at is a valid ISO datetime', () => {
      const slice = createMvpSlice('WINT-4150', ['AC-1'], 'Test.')
      const parsed = new Date(slice.generated_at)

      expect(parsed.toISOString()).toBe(slice.generated_at)
    })
  })
})
