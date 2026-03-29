import { describe, expect, it } from 'vitest'

import {
  ScopeChallengesSchema,
  ScopeChallengeSchema,
  createScopeChallenges,
} from '../scope-challenges'

describe('ScopeChallengesSchema', () => {
  describe('schema validation', () => {
    it('validates a minimal scope challenges artifact with empty array', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        challenges: [],
      }

      const result = ScopeChallengesSchema.parse(input)
      expect(result.story_id).toBe('WINT-4150')
      expect(result.challenges).toHaveLength(0)
    })

    it('validates with max(5) challenges', () => {
      const makeChallenge = (i: number) => ({
        id: `ch-${i}`,
        description: `Challenge ${i}`,
        recommendation: 'accept-as-mvp' as const,
        risk_if_deferred: 'low' as const,
      })

      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        challenges: [1, 2, 3, 4, 5].map(makeChallenge),
      }

      const result = ScopeChallengesSchema.parse(input)
      expect(result.challenges).toHaveLength(5)
    })

    it('rejects more than 5 challenges', () => {
      const makeChallenge = (i: number) => ({
        id: `ch-${i}`,
        description: `Challenge ${i}`,
        recommendation: 'defer-to-backlog' as const,
        risk_if_deferred: 'none' as const,
      })

      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        challenges: [1, 2, 3, 4, 5, 6].map(makeChallenge),
      }

      expect(() => ScopeChallengesSchema.parse(input)).toThrow()
    })

    it('validates all recommendation enum values', () => {
      const recommendations = ['defer-to-backlog', 'reduce-scope', 'accept-as-mvp'] as const

      for (const recommendation of recommendations) {
        const challenge = ScopeChallengeSchema.parse({
          id: 'ch-1',
          description: 'A challenge',
          recommendation,
          risk_if_deferred: 'medium',
        })
        expect(challenge.recommendation).toBe(recommendation)
      }
    })

    it('rejects invalid recommendation enum', () => {
      const input = {
        id: 'ch-1',
        description: 'A challenge',
        recommendation: 'skip',
        risk_if_deferred: 'high',
      }

      expect(() => ScopeChallengeSchema.parse(input)).toThrow()
    })

    it('validates all risk_if_deferred enum values', () => {
      const risks = ['critical', 'high', 'medium', 'low', 'none'] as const

      for (const risk_if_deferred of risks) {
        const challenge = ScopeChallengeSchema.parse({
          id: 'ch-1',
          description: 'A challenge',
          recommendation: 'accept-as-mvp',
          risk_if_deferred,
        })
        expect(challenge.risk_if_deferred).toBe(risk_if_deferred)
      }
    })

    it('allows optional deferral_note', () => {
      const input = {
        story_id: 'WINT-4150',
        generated_at: '2026-03-08T12:00:00.000Z',
        challenges: [
          {
            id: 'ch-1',
            description: 'Complex feature that may be out of scope',
            recommendation: 'defer-to-backlog' as const,
            risk_if_deferred: 'low' as const,
            deferral_note: 'Can be addressed in WINT-4200',
          },
        ],
      }

      const result = ScopeChallengesSchema.parse(input)
      expect(result.challenges[0].deferral_note).toBe('Can be addressed in WINT-4200')
    })
  })

  describe('createScopeChallenges', () => {
    it('creates an empty scope challenges artifact', () => {
      const sc = createScopeChallenges('WINT-4150')

      expect(sc.story_id).toBe('WINT-4150')
      expect(sc.challenges).toEqual([])
      expect(sc.generated_at).toBeDefined()
    })

    it('creates a valid artifact that passes schema validation', () => {
      const sc = createScopeChallenges('WINT-4150')

      expect(() => ScopeChallengesSchema.parse(sc)).not.toThrow()
    })
  })
})
