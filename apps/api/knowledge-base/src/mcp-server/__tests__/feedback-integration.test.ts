/**
 * Integration tests for feedback entries (WKFL-004)
 *
 * Tests that feedback entries work end-to-end with KB system:
 * - FeedbackContentSchema validation
 * - Integration with KB entry_type enum
 * - JSON serialization/deserialization
 *
 * @see WKFL-004 AC-1 through AC-5
 */

import { describe, it, expect } from 'vitest'
import {
  FeedbackContentSchema,
  FeedbackTypeSchema,
  FindingSeveritySchema,
  KnowledgeEntryTypeSchema,
} from '../../__types__/index.js'
import { KbAddInputSchema } from '../../crud-operations/schemas.js'

describe('Feedback Entry Integration', () => {
  describe('entry_type enum integration', () => {
    it('should accept "feedback" as valid entry_type', () => {
      const result = KnowledgeEntryTypeSchema.safeParse('feedback')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('feedback')
      }
    })

    it('should allow feedback in kb_add input schema', () => {
      const input = {
        content: 'Test feedback content',
        role: 'dev',
        entry_type: 'feedback',
        story_id: 'WISH-2045',
        tags: ['feedback', 'test'],
      }

      const result = KbAddInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('FeedbackContentSchema serialization (AC-1, AC-2)', () => {
    it('should serialize and deserialize false_positive feedback (AC-1)', () => {
      const feedbackContent = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'false_positive' as const,
        original_severity: 'high' as const,
        note: 'This is intentional behavior for admin users',
        created_at: '2026-02-07T15:30:00Z',
      }

      // Validate
      const validated = FeedbackContentSchema.parse(feedbackContent)

      // Serialize to JSON (as it would be stored in KB)
      const serialized = JSON.stringify(validated, null, 2)

      // Deserialize back
      const deserialized = JSON.parse(serialized)

      // Re-validate deserialized
      const revalidated = FeedbackContentSchema.parse(deserialized)

      expect(revalidated.feedback_type).toBe('false_positive')
      expect(revalidated.finding_id).toBe('SEC-042')
      expect(revalidated.agent_id).toBe('code-review-security')
      expect(revalidated.story_id).toBe('WISH-2045')
    })

    it('should serialize and deserialize helpful feedback (AC-2)', () => {
      const feedbackContent = {
        finding_id: 'ARCH-015',
        agent_id: 'code-review-architecture',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        note: 'Good catch, would have missed this boundary issue',
        created_at: '2026-02-07T15:30:00Z',
      }

      const validated = FeedbackContentSchema.parse(feedbackContent)
      const serialized = JSON.stringify(validated)
      const deserialized = JSON.parse(serialized)
      const revalidated = FeedbackContentSchema.parse(deserialized)

      expect(revalidated.feedback_type).toBe('helpful')
    })

    it('should serialize severity_wrong feedback with suggested_severity (AC-5)', () => {
      const feedbackContent = {
        finding_id: 'SEC-003',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'severity_wrong' as const,
        original_severity: 'high' as const,
        suggested_severity: 'medium' as const,
        note: 'Should be medium, not high',
        created_at: '2026-02-07T15:30:00Z',
      }

      const validated = FeedbackContentSchema.parse(feedbackContent)
      const serialized = JSON.stringify(validated)
      const deserialized = JSON.parse(serialized)
      const revalidated = FeedbackContentSchema.parse(deserialized)

      expect(revalidated.suggested_severity).toBe('medium')
    })
  })

  describe('linkage metadata (AC-3)', () => {
    it('should preserve all linkage fields through serialization', () => {
      const feedbackContent = {
        finding_id: 'QA-999',
        agent_id: 'qa-verify',
        story_id: 'WKFL-004',
        feedback_type: 'missing' as const,
        note: 'Test linkage preservation',
        created_at: '2026-02-07T15:30:00Z',
      }

      const validated = FeedbackContentSchema.parse(feedbackContent)
      const serialized = JSON.stringify(validated)
      const deserialized = JSON.parse(serialized)
      const revalidated = FeedbackContentSchema.parse(deserialized)

      // AC-3: Verify all linkage fields are preserved
      expect(revalidated.finding_id).toBe('QA-999')
      expect(revalidated.agent_id).toBe('qa-verify')
      expect(revalidated.story_id).toBe('WKFL-004')
    })
  })

  describe('tag generation for kb_add (AC-4)', () => {
    it('should support tags for filtering false_positive feedback', () => {
      const tags = [
        'feedback',
        'agent:code-review-security',
        'story:WISH-2045',
        'type:false_positive',
        'date:2026-02',
      ]

      const input = {
        content: JSON.stringify({
          finding_id: 'SEC-042',
          agent_id: 'code-review-security',
          story_id: 'WISH-2045',
          feedback_type: 'false_positive',
          note: 'Test',
          created_at: '2026-02-07T15:30:00Z',
        }),
        role: 'dev',
        entry_type: 'feedback',
        story_id: 'WISH-2045',
        tags: tags,
      }

      const result = KbAddInputSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toContain('feedback')
        expect(result.data.tags).toContain('type:false_positive')
      }
    })

    it('should support all feedback type tags (AC-5)', () => {
      const feedbackTypes = ['false_positive', 'helpful', 'missing', 'severity_wrong']

      for (const feedbackType of feedbackTypes) {
        const tags = ['feedback', `type:${feedbackType}`]

        const input = {
          content: 'Test',
          role: 'dev',
          entry_type: 'feedback',
          tags: tags,
        }

        const result = KbAddInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('complete kb_add payload validation', () => {
    it('should validate complete false_positive feedback entry (AC-1)', () => {
      const feedbackContent = {
        finding_id: 'SEC-042',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'false_positive' as const,
        original_severity: 'high' as const,
        note: 'This is intentional behavior for admin users',
        created_at: '2026-02-07T15:30:00Z',
      }

      // Step 1: Validate feedback content with FeedbackContentSchema
      const validatedContent = FeedbackContentSchema.parse(feedbackContent)

      // Step 2: Build kb_add payload
      const kbAddPayload = {
        content: JSON.stringify(validatedContent, null, 2),
        role: 'dev',
        entry_type: 'feedback',
        story_id: 'WISH-2045',
        tags: [
          'feedback',
          'agent:code-review-security',
          'story:WISH-2045',
          'type:false_positive',
          'date:2026-02',
        ],
      }

      // Step 3: Validate kb_add payload
      const validatedPayload = KbAddInputSchema.parse(kbAddPayload)

      // Verify payload structure
      expect(validatedPayload.entry_type).toBe('feedback')
      expect(validatedPayload.role).toBe('dev')
      expect(validatedPayload.story_id).toBe('WISH-2045')
      expect(validatedPayload.tags).toContain('feedback')

      // Verify content can be parsed back
      const parsedContent = JSON.parse(validatedPayload.content)
      const revalidatedContent = FeedbackContentSchema.parse(parsedContent)
      expect(revalidatedContent.feedback_type).toBe('false_positive')
    })

    it('should validate complete helpful feedback entry (AC-2)', () => {
      const feedbackContent = {
        finding_id: 'ARCH-015',
        agent_id: 'code-review-architecture',
        story_id: 'WISH-2045',
        feedback_type: 'helpful' as const,
        original_severity: 'medium' as const,
        note: 'Good catch, would have missed this boundary issue',
        created_at: '2026-02-07T15:30:00Z',
      }

      const validatedContent = FeedbackContentSchema.parse(feedbackContent)

      const kbAddPayload = {
        content: JSON.stringify(validatedContent, null, 2),
        role: 'dev',
        entry_type: 'feedback',
        story_id: 'WISH-2045',
        tags: ['feedback', 'agent:code-review-architecture', 'story:WISH-2045', 'type:helpful'],
      }

      const validatedPayload = KbAddInputSchema.parse(kbAddPayload)
      expect(validatedPayload.entry_type).toBe('feedback')

      // Verify round-trip
      const parsedContent = JSON.parse(validatedPayload.content)
      const revalidatedContent = FeedbackContentSchema.parse(parsedContent)
      expect(revalidatedContent.feedback_type).toBe('helpful')
      expect(revalidatedContent.finding_id).toBe('ARCH-015')
    })

    it('should validate complete severity_wrong feedback entry with suggested_severity (AC-5)', () => {
      const feedbackContent = {
        finding_id: 'SEC-003',
        agent_id: 'code-review-security',
        story_id: 'WISH-2045',
        feedback_type: 'severity_wrong' as const,
        original_severity: 'high' as const,
        suggested_severity: 'medium' as const,
        note: 'Should be medium, not high - defense in depth exists',
        created_at: '2026-02-07T15:30:00Z',
      }

      const validatedContent = FeedbackContentSchema.parse(feedbackContent)

      const kbAddPayload = {
        content: JSON.stringify(validatedContent, null, 2),
        role: 'dev',
        entry_type: 'feedback',
        story_id: 'WISH-2045',
        tags: [
          'feedback',
          'agent:code-review-security',
          'story:WISH-2045',
          'type:severity_wrong',
          'severity:high',
        ],
      }

      const validatedPayload = KbAddInputSchema.parse(kbAddPayload)

      // Verify suggested_severity is preserved
      const parsedContent = JSON.parse(validatedPayload.content)
      const revalidatedContent = FeedbackContentSchema.parse(parsedContent)
      expect(revalidatedContent.suggested_severity).toBe('medium')
    })
  })
})
