import { describe, expect, it } from 'vitest'

import { createGaps, GapItemSchema, GapsSchema } from '../gaps'

describe('GapsSchema', () => {
  describe('schema validation', () => {
    it('validates a minimal gaps artifact with empty array', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        gaps: [],
      }

      const result = GapsSchema.parse(input)
      expect(result.story_id).toBe('WINT-4150')
      expect(result.gaps).toEqual([])
    })

    it('validates a gaps artifact with blocking and non-blocking gaps', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        gaps: [
          {
            id: 'gap-1',
            description: 'Missing timeout handling for upload flow',
            blocking: true,
            severity: 'high',
            source: 'risk_disclosure',
            resolution: null,
          },
          {
            id: 'gap-2',
            description: 'Edge case for empty list not addressed',
            blocking: false,
            severity: 'low',
            source: 'testability',
            resolution: 'Add empty state test',
          },
        ],
      }

      const result = GapsSchema.parse(input)
      expect(result.gaps).toHaveLength(2)
      expect(result.gaps[0].blocking).toBe(true)
      expect(result.gaps[1].blocking).toBe(false)
      expect(result.gaps[1].resolution).toBe('Add empty state test')
    })

    it('rejects gap with invalid severity', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        gaps: [
          {
            id: 'gap-1',
            description: 'A gap',
            blocking: true,
            severity: 'urgent',
            source: 'scope_alignment',
            resolution: null,
          },
        ],
      }

      expect(() => GapsSchema.parse(input)).toThrow()
    })

    it('validates all severity levels', () => {
      const severities = ['critical', 'high', 'medium', 'low'] as const
      for (const severity of severities) {
        const item = GapItemSchema.parse({
          id: 'gap-1',
          description: 'A gap',
          blocking: true,
          severity,
          source: 'scope_alignment',
          resolution: null,
        })
        expect(item.severity).toBe(severity)
      }
    })

    it('defaults resolution to null when not provided', () => {
      const item = GapItemSchema.parse({
        id: 'gap-1',
        description: 'A gap',
        blocking: false,
        severity: 'medium',
        source: 'decision_completeness',
      })

      expect(item.resolution).toBeNull()
    })
  })

  describe('createGaps', () => {
    it('creates an empty gaps artifact', () => {
      const gaps = createGaps('WINT-4150')

      expect(gaps.story_id).toBe('WINT-4150')
      expect(gaps.gaps).toEqual([])
      expect(gaps.generated_at).toBeDefined()
    })

    it('creates a valid gaps artifact that passes schema validation', () => {
      const gaps = createGaps('WINT-4150')

      expect(() => GapsSchema.parse(gaps)).not.toThrow()
    })

    it('generated_at is a valid ISO datetime', () => {
      const gaps = createGaps('WINT-4150')
      const parsed = new Date(gaps.generated_at)

      expect(parsed.toISOString()).toBe(gaps.generated_at)
    })
  })
})
