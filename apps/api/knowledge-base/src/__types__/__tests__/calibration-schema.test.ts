/**
 * Unit tests for CalibrationEntrySchema (WKFL-002)
 *
 * Tests validation logic for calibration entries including:
 * - Valid confidence levels (high, medium, low)
 * - Valid actual outcomes (correct, false_positive, severity_wrong)
 * - Required fields (agent_id, finding_id, story_id, stated_confidence, actual_outcome, timestamp)
 * - Finding ID and Story ID format validation (ABC-123 pattern)
 * - ISO 8601 datetime validation
 *
 * @see WKFL-002 AC-1
 */

import { describe, it, expect } from 'vitest'
import {
  CalibrationEntrySchema,
  ConfidenceLevelSchema,
  ActualOutcomeSchema,
} from '../index.js'

describe('CalibrationEntrySchema', () => {
  describe('valid calibration entries', () => {
    it('should validate correct calibration entry', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.agent_id).toBe('code-review-security')
        expect(result.data.finding_id).toBe('SEC-042')
        expect(result.data.story_id).toBe('WISH-2045')
        expect(result.data.stated_confidence).toBe('high')
        expect(result.data.actual_outcome).toBe('false_positive')
      }
    })

    it('should validate calibration entry with medium confidence and correct outcome', () => {
      const data = {
        agent_id: 'code-review-architecture',
        finding_id: 'ARCH-015',
        story_id: 'WKFL-001',
        stated_confidence: 'medium' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00.123Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.stated_confidence).toBe('medium')
        expect(result.data.actual_outcome).toBe('correct')
      }
    })

    it('should validate calibration entry with low confidence and severity_wrong outcome', () => {
      const data = {
        agent_id: 'qa-verify-completion',
        finding_id: 'QA-003',
        story_id: 'KNOW-001',
        stated_confidence: 'low' as const,
        actual_outcome: 'severity_wrong' as const,
        timestamp: '2026-02-07T08:15:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate calibration entry with agent ID containing hyphens', () => {
      const data = {
        agent_id: 'code-review-security-deep',
        finding_id: 'SEC-100',
        story_id: 'WISH-3000',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('required field validation', () => {
    it('should fail when agent_id is missing', () => {
      const data = {
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('agent_id')
      }
    })

    it('should fail when agent_id is empty string', () => {
      const data = {
        agent_id: '',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Agent ID required')
      }
    })

    it('should fail when finding_id is missing', () => {
      const data = {
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when story_id is missing', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        stated_confidence: 'high' as const,
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when stated_confidence is missing', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when actual_outcome is missing', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when timestamp is missing', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'false_positive' as const,
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('ID format validation', () => {
    it('should fail when finding_id does not match ABC-123 format', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'invalid-id',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const formatError = result.error.issues.find(
          issue => issue.path[0] === 'finding_id',
        )
        expect(formatError).toBeDefined()
        expect(formatError?.message).toContain('Finding ID must match format: ABC-123')
      }
    })

    it('should fail when finding_id uses lowercase letters', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'sec-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when story_id does not match ABC-123 format', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'wish2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const formatError = result.error.issues.find(
          issue => issue.path[0] === 'story_id',
        )
        expect(formatError).toBeDefined()
        expect(formatError?.message).toContain('Story ID must match format: ABC-123')
      }
    })

    it('should accept finding_id with multiple digit groups', () => {
      // Note: Regex is /^[A-Z]+-\d+$/, so only one digit group is allowed
      // This test verifies the regex rejects multiple digit groups
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042-A',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept finding_id and story_id with single-digit numbers', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-1',
        story_id: 'WISH-2',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept finding_id and story_id with large numbers', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-999999',
        story_id: 'WISH-123456',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('enum validation', () => {
    it('should reject invalid confidence level', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'super-high',
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid actual outcome', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'unknown',
        timestamp: '2026-02-07T10:00:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('timestamp validation', () => {
    it('should fail when timestamp is not a valid ISO datetime', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07', // Date only, not datetime
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept ISO 8601 datetime with milliseconds', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00.456Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept ISO 8601 datetime with Z notation', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T22:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})

describe('ConfidenceLevelSchema', () => {
  it('should accept all valid confidence levels', () => {
    expect(ConfidenceLevelSchema.safeParse('high').success).toBe(true)
    expect(ConfidenceLevelSchema.safeParse('medium').success).toBe(true)
    expect(ConfidenceLevelSchema.safeParse('low').success).toBe(true)
  })

  it('should reject invalid confidence level', () => {
    expect(ConfidenceLevelSchema.safeParse('super-high').success).toBe(false)
    expect(ConfidenceLevelSchema.safeParse('').success).toBe(false)
    expect(ConfidenceLevelSchema.safeParse(null).success).toBe(false)
  })
})

describe('ActualOutcomeSchema', () => {
  it('should accept all valid outcomes', () => {
    expect(ActualOutcomeSchema.safeParse('correct').success).toBe(true)
    expect(ActualOutcomeSchema.safeParse('false_positive').success).toBe(true)
    expect(ActualOutcomeSchema.safeParse('severity_wrong').success).toBe(true)
  })

  it('should reject invalid outcome', () => {
    expect(ActualOutcomeSchema.safeParse('unknown').success).toBe(false)
    expect(ActualOutcomeSchema.safeParse('helpful').success).toBe(false)
    expect(ActualOutcomeSchema.safeParse('').success).toBe(false)
    expect(ActualOutcomeSchema.safeParse(null).success).toBe(false)
  })
})
