/**
 * Unit tests for CalibrationEntrySchema (WKFL-002)
 *
 * Tests validation logic for calibration entries including:
 * - Valid confidence levels (high, medium, low)
 * - Valid actual outcomes (correct, false_positive, severity_wrong)
 * - Required fields (agent_id, finding_id, story_id, stated_confidence, actual_outcome, timestamp)
 * - Edge cases
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
    it('should validate high confidence with correct outcome', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.stated_confidence).toBe('high')
        expect(result.data.actual_outcome).toBe('correct')
      }
    })

    it('should validate medium confidence with false_positive outcome', () => {
      const data = {
        agent_id: 'code-review-architecture',
        finding_id: 'ARCH-015',
        story_id: 'WISH-2045',
        stated_confidence: 'medium' as const,
        actual_outcome: 'false_positive' as const,
        timestamp: '2026-02-07T15:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.stated_confidence).toBe('medium')
        expect(result.data.actual_outcome).toBe('false_positive')
      }
    })

    it('should validate low confidence with severity_wrong outcome', () => {
      const data = {
        agent_id: 'qa-verify',
        finding_id: 'QA-001',
        story_id: 'WKFL-002',
        stated_confidence: 'low' as const,
        actual_outcome: 'severity_wrong' as const,
        timestamp: '2026-02-07T15:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate with ISO 8601 timestamp with milliseconds', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00.123Z',
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
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00Z',
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
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00Z',
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
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('finding_id')
      }
    })

    it('should fail when finding_id is empty string', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: '',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Finding ID required')
      }
    })

    it('should fail when story_id is missing', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('story_id')
      }
    })

    it('should fail when story_id is empty string', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: '',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Story ID required')
      }
    })

    it('should fail when stated_confidence is missing', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00Z',
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
        timestamp: '2026-02-07T15:30:00Z',
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
        actual_outcome: 'correct' as const,
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when timestamp is not a valid ISO datetime', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07', // Date only, not datetime
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('confidence level enum validation', () => {
    it('should accept all valid confidence levels', () => {
      const validLevels = ['high', 'medium', 'low']

      for (const confidence of validLevels) {
        const data = {
          agent_id: 'test-agent',
          finding_id: 'TEST-001',
          story_id: 'TEST-001',
          stated_confidence: confidence,
          actual_outcome: 'correct',
          timestamp: '2026-02-07T15:30:00Z',
        }

        const result = CalibrationEntrySchema.safeParse(data)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid confidence level', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'invalid',
        actual_outcome: 'correct',
        timestamp: '2026-02-07T15:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('actual outcome enum validation', () => {
    it('should accept all valid actual outcomes', () => {
      const validOutcomes = ['correct', 'false_positive', 'severity_wrong']

      for (const outcome of validOutcomes) {
        const data = {
          agent_id: 'test-agent',
          finding_id: 'TEST-001',
          story_id: 'TEST-001',
          stated_confidence: 'high',
          actual_outcome: outcome,
          timestamp: '2026-02-07T15:30:00Z',
        }

        const result = CalibrationEntrySchema.safeParse(data)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid actual outcome', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high',
        actual_outcome: 'invalid',
        timestamp: '2026-02-07T15:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in IDs', () => {
      const data = {
        agent_id: 'code-review-security-v2',
        finding_id: 'SEC-042-A',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle long agent IDs', () => {
      const longAgentId = 'very-long-agent-id-with-many-dashes-and-segments'
      const data = {
        agent_id: longAgentId,
        finding_id: 'SEC-042',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00Z',
      }

      const result = CalibrationEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle finding IDs without standard format', () => {
      const data = {
        agent_id: 'code-review-security',
        finding_id: 'custom-finding-123',
        story_id: 'WISH-2045',
        stated_confidence: 'high' as const,
        actual_outcome: 'correct' as const,
        timestamp: '2026-02-07T15:30:00Z',
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
    expect(ConfidenceLevelSchema.safeParse('invalid').success).toBe(false)
    expect(ConfidenceLevelSchema.safeParse('').success).toBe(false)
    expect(ConfidenceLevelSchema.safeParse(null).success).toBe(false)
  })
})

describe('ActualOutcomeSchema', () => {
  it('should accept all valid actual outcomes', () => {
    expect(ActualOutcomeSchema.safeParse('correct').success).toBe(true)
    expect(ActualOutcomeSchema.safeParse('false_positive').success).toBe(true)
    expect(ActualOutcomeSchema.safeParse('severity_wrong').success).toBe(true)
  })

  it('should reject invalid actual outcome', () => {
    expect(ActualOutcomeSchema.safeParse('invalid').success).toBe(false)
    expect(ActualOutcomeSchema.safeParse('').success).toBe(false)
    expect(ActualOutcomeSchema.safeParse(null).success).toBe(false)
  })
})
