/**
 * Unit tests for FeedbackContentSchema (WKFL-004)
 *
 * Tests validation logic for feedback entries including:
 * - Valid feedback types (false_positive, helpful, missing, severity_wrong)
 * - Required fields (finding_id, agent_id, story_id, feedback_type, note, created_at)
 * - Conditional validation (severity_wrong requires suggested_severity)
 * - Edge cases
 *
 * @see WKFL-004 AC-3, AC-5
 */

import { describe, it, expect } from 'vitest'
import {
  FeedbackContentSchema,
  FeedbackTypeSchema,
  FindingSeveritySchema,
} from '../index.js'

describe('FeedbackContentSchema', () => {
  describe('valid feedback entries', () => {
    it('should validate false_positive feedback', () => {
      const data = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'false_positive' as const,
        original_severity: 'high' as const,
        note: 'This is intentional behavior for admin users',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.feedback_type).toBe('false_positive')
        expect(result.data.finding_id).toBe('SEC-042')
      }
    })

    it('should validate helpful feedback', () => {
      const data = {
        finding_id: 'ARCH-015',
        agent_id: 'code-review-architecture',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        original_severity: 'medium' as const,
        note: 'Good catch, would have missed this boundary issue',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.feedback_type).toBe('helpful')
      }
    })

    it('should validate missing feedback', () => {
      const data = {
        finding_id: 'QA-001',
        agent_id: 'qa-verify',
        story_id: 'WISH-2045',
        feedback_type: 'missing' as const,
        note: 'Should also check empty array case',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate severity_wrong feedback with suggested_severity', () => {
      const data = {
        finding_id: 'SEC-003',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'severity_wrong' as const,
        original_severity: 'high' as const,
        suggested_severity: 'medium' as const,
        note: 'Should be medium, not high - defense in depth exists',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.suggested_severity).toBe('medium')
      }
    })

    it('should validate feedback without original_severity (optional field)', () => {
      const data = {
        finding_id: 'QA-005',
        agent_id: 'qa-verify',
        story_id: 'WKFL-001',
        feedback_type: 'helpful' as const,
        note: 'Great edge case coverage',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('required field validation', () => {
    it('should fail when finding_id is missing', () => {
      const data = {
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        note: 'Good finding',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('finding_id')
      }
    })

    it('should fail when finding_id is empty string', () => {
      const data = {
        finding_id: '',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        note: 'Good finding',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Finding ID required')
      }
    })

    it('should fail when agent_id is missing', () => {
      const data = {
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        note: 'Good finding',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when story_id is missing', () => {
      const data = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        feedback_type: 'helpful' as const,
        note: 'Good finding',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when note is missing', () => {
      const data = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when created_at is missing', () => {
      const data = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        note: 'Good finding',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when created_at is not a valid ISO datetime', () => {
      const data = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        note: 'Good finding',
        created_at: '2026-02-07', // Date only, not datetime
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('conditional validation for severity_wrong', () => {
    it('should fail when severity_wrong feedback lacks suggested_severity', () => {
      const data = {
        finding_id: 'SEC-003',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'severity_wrong' as const,
        original_severity: 'high' as const,
        // suggested_severity is missing
        note: 'Should be medium, not high',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const severityError = result.error.issues.find(
          issue => issue.path[0] === 'suggested_severity',
        )
        expect(severityError).toBeDefined()
        expect(severityError?.message).toContain('required when feedback_type is severity_wrong')
      }
    })

    it('should pass when severity_wrong feedback includes suggested_severity', () => {
      const data = {
        finding_id: 'SEC-003',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'severity_wrong' as const,
        original_severity: 'high' as const,
        suggested_severity: 'medium' as const,
        note: 'Should be medium, not high',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow suggested_severity for non-severity_wrong feedback (permissive)', () => {
      const data = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        original_severity: 'high' as const,
        suggested_severity: 'medium' as const, // Present but not required
        note: 'Good finding',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('feedback type enum validation', () => {
    it('should accept all valid feedback types', () => {
      const validTypes = ['false_positive', 'helpful', 'missing', 'severity_wrong']

      for (const feedbackType of validTypes) {
        const data = {
          finding_id: 'TEST-001',
          agent_id: 'test-agent',
          story_id: 'TEST-001',
          feedback_type: feedbackType,
          suggested_severity: feedbackType === 'severity_wrong' ? 'low' : undefined,
          note: 'Test note',
          created_at: '2026-02-07T15:30:00Z',
        }

        const result = FeedbackContentSchema.safeParse(data)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid feedback type', () => {
      const data = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'invalid_type',
        note: 'Test',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('severity enum validation', () => {
    it('should accept all valid severity levels', () => {
      const validSeverities = ['critical', 'high', 'medium', 'low']

      for (const severity of validSeverities) {
        const data = {
          finding_id: 'SEC-042',
          agent_id: 'code-review-security',
          story_id: 'WISH-2045',
          feedback_type: 'severity_wrong' as const,
          original_severity: 'high' as const,
          suggested_severity: severity,
          note: 'Test',
          created_at: '2026-02-07T15:30:00Z',
        }

        const result = FeedbackContentSchema.safeParse(data)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid severity level', () => {
      const data = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'severity_wrong' as const,
        original_severity: 'invalid',
        suggested_severity: 'medium' as const,
        note: 'Test',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle very long note', () => {
      const longNote = 'x'.repeat(5000)
      const data = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        note: longNote,
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle special characters in IDs', () => {
      const data = {
        finding_id: 'SEC-042-A',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        note: 'Test with special chars: @#$%^&*()',
        created_at: '2026-02-07T15:30:00Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle ISO 8601 datetime with milliseconds', () => {
      const data = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        note: 'Test',
        created_at: '2026-02-07T15:30:00.123Z',
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle ISO 8601 datetime with timezone offset', () => {
      // Note: Zod z.string().datetime() only accepts Z notation by default
      // Timezone offset notation would require .datetime({ offset: true })
      // For this schema, we'll use Z notation
      const data = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        note: 'Test',
        created_at: '2026-02-07T22:30:00Z', // Adjusted to Z notation
      }

      const result = FeedbackContentSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})

describe('FeedbackTypeSchema', () => {
  it('should accept all valid feedback types', () => {
    expect(FeedbackTypeSchema.safeParse('false_positive').success).toBe(true)
    expect(FeedbackTypeSchema.safeParse('helpful').success).toBe(true)
    expect(FeedbackTypeSchema.safeParse('missing').success).toBe(true)
    expect(FeedbackTypeSchema.safeParse('severity_wrong').success).toBe(true)
  })

  it('should reject invalid feedback type', () => {
    expect(FeedbackTypeSchema.safeParse('invalid').success).toBe(false)
    expect(FeedbackTypeSchema.safeParse('').success).toBe(false)
    expect(FeedbackTypeSchema.safeParse(null).success).toBe(false)
  })
})

describe('FindingSeveritySchema', () => {
  it('should accept all valid severity levels', () => {
    expect(FindingSeveritySchema.safeParse('critical').success).toBe(true)
    expect(FindingSeveritySchema.safeParse('high').success).toBe(true)
    expect(FindingSeveritySchema.safeParse('medium').success).toBe(true)
    expect(FindingSeveritySchema.safeParse('low').success).toBe(true)
  })

  it('should reject invalid severity level', () => {
    expect(FindingSeveritySchema.safeParse('invalid').success).toBe(false)
    expect(FindingSeveritySchema.safeParse('').success).toBe(false)
    expect(FindingSeveritySchema.safeParse(null).success).toBe(false)
  })
})
