/**
 * Bucket A Typed Entry Tools Tests
 *
 * Tests for kb_add_decision, kb_add_constraint, kb_add_lesson, kb_add_runbook.
 *
 * @see KBMEM-004 for implementation requirements
 */

import { describe, it, expect } from 'vitest'
import {
  KbAddDecisionInputSchema,
  KbAddConstraintInputSchema,
  KbAddLessonInputSchema,
  KbAddRunbookInputSchema,
  kbAddDecisionToolDefinition,
  kbAddConstraintToolDefinition,
  kbAddLessonToolDefinition,
  kbAddRunbookToolDefinition,
} from '../tool-schemas.js'

describe('Bucket A Typed Entry Tools (KBMEM-004)', () => {
  describe('KbAddDecisionInputSchema', () => {
    it('should accept valid minimal decision', () => {
      const input = {
        title: 'Use server-side processing',
        context: 'Client-side is too slow',
        decision: 'Process on the server',
      }
      const result = KbAddDecisionInputSchema.parse(input)
      expect(result.title).toBe('Use server-side processing')
      expect(result.role).toBe('dev') // default
    })

    it('should accept valid full decision', () => {
      const input = {
        title: 'Use server-side image processing',
        context: 'Client-side HEIC conversion is too slow on mobile devices.',
        decision: 'Process images on the server using Sharp library.',
        consequences: 'Faster conversion but increased server load.',
        role: 'all' as const,
        story_id: 'WISH-2045',
        tags: ['performance', 'images'],
      }
      const result = KbAddDecisionInputSchema.parse(input)
      expect(result.title).toBe('Use server-side image processing')
      expect(result.consequences).toBe('Faster conversion but increased server load.')
      expect(result.role).toBe('all')
      expect(result.story_id).toBe('WISH-2045')
      expect(result.tags).toEqual(['performance', 'images'])
    })

    it('should reject decision without title', () => {
      const input = {
        context: 'Some context',
        decision: 'Some decision',
      }
      expect(() => KbAddDecisionInputSchema.parse(input)).toThrow()
    })

    it('should reject decision without context', () => {
      const input = {
        title: 'Some title',
        decision: 'Some decision',
      }
      expect(() => KbAddDecisionInputSchema.parse(input)).toThrow()
    })

    it('should reject decision without decision', () => {
      const input = {
        title: 'Some title',
        context: 'Some context',
      }
      expect(() => KbAddDecisionInputSchema.parse(input)).toThrow()
    })

    it('should reject empty title', () => {
      const input = {
        title: '',
        context: 'Some context',
        decision: 'Some decision',
      }
      expect(() => KbAddDecisionInputSchema.parse(input)).toThrow()
    })
  })

  describe('KbAddConstraintInputSchema', () => {
    it('should accept valid minimal constraint', () => {
      const input = {
        constraint: 'Always use Zod schemas',
        rationale: 'Provides runtime validation',
      }
      const result = KbAddConstraintInputSchema.parse(input)
      expect(result.constraint).toBe('Always use Zod schemas')
      expect(result.scope).toBe('project') // default
      expect(result.role).toBe('all') // default
    })

    it('should accept valid full constraint', () => {
      const input = {
        constraint: 'HEIC conversion must preserve EXIF orientation',
        rationale: 'Without EXIF preservation, images display rotated',
        scope: 'story' as const,
        source: 'QA finding',
        role: 'dev' as const,
        story_id: 'WISH-2045',
        tags: ['images', 'heic'],
      }
      const result = KbAddConstraintInputSchema.parse(input)
      expect(result.scope).toBe('story')
      expect(result.source).toBe('QA finding')
      expect(result.story_id).toBe('WISH-2045')
    })

    it('should accept all scope values', () => {
      const scopes = ['project', 'epic', 'story'] as const
      for (const scope of scopes) {
        const input = {
          constraint: 'Test constraint',
          rationale: 'Test rationale',
          scope,
        }
        const result = KbAddConstraintInputSchema.parse(input)
        expect(result.scope).toBe(scope)
      }
    })

    it('should reject invalid scope', () => {
      const input = {
        constraint: 'Test constraint',
        rationale: 'Test rationale',
        scope: 'invalid',
      }
      expect(() => KbAddConstraintInputSchema.parse(input)).toThrow()
    })

    it('should reject constraint without rationale', () => {
      const input = {
        constraint: 'Test constraint',
      }
      expect(() => KbAddConstraintInputSchema.parse(input)).toThrow()
    })
  })

  describe('KbAddLessonInputSchema', () => {
    it('should accept valid minimal lesson', () => {
      const input = {
        title: 'HEIC images display rotated',
        what_happened: 'Users reported rotated images',
        resolution: 'Preserve EXIF orientation during conversion',
      }
      const result = KbAddLessonInputSchema.parse(input)
      expect(result.title).toBe('HEIC images display rotated')
      expect(result.category).toBe('other') // default
    })

    it('should accept valid full lesson', () => {
      const input = {
        title: 'HEIC images display rotated after conversion',
        what_happened: 'Users reported that some HEIC images appeared rotated.',
        why: 'Sharp library strips EXIF orientation metadata by default.',
        resolution: 'Added rotate() call before conversion.',
        category: 'edge-cases' as const,
        role: 'dev' as const,
        story_id: 'WISH-2045',
        tags: ['images', 'heic'],
      }
      const result = KbAddLessonInputSchema.parse(input)
      expect(result.why).toBe('Sharp library strips EXIF orientation metadata by default.')
      expect(result.category).toBe('edge-cases')
    })

    it('should accept all category values', () => {
      const categories = [
        'edge-cases',
        'performance',
        'security',
        'testing',
        'architecture',
        'workflow',
        'tooling',
        'other',
      ] as const
      for (const category of categories) {
        const input = {
          title: 'Test lesson',
          what_happened: 'Test situation',
          resolution: 'Test resolution',
          category,
        }
        const result = KbAddLessonInputSchema.parse(input)
        expect(result.category).toBe(category)
      }
    })

    it('should reject lesson without resolution', () => {
      const input = {
        title: 'Test lesson',
        what_happened: 'Test situation',
      }
      expect(() => KbAddLessonInputSchema.parse(input)).toThrow()
    })
  })

  describe('KbAddRunbookInputSchema', () => {
    it('should accept valid minimal runbook', () => {
      const input = {
        title: 'Database migration',
        purpose: 'Steps to run database migrations',
        steps: ['Run migrations', 'Verify schema'],
      }
      const result = KbAddRunbookInputSchema.parse(input)
      expect(result.title).toBe('Database migration')
      expect(result.steps).toHaveLength(2)
    })

    it('should accept valid full runbook', () => {
      const input = {
        title: 'Database migration procedure',
        purpose: 'Steps to safely run database migrations in production',
        prerequisites: ['SSH access to production', 'Database backup completed'],
        steps: [
          'Put application in maintenance mode',
          'Take a backup',
          'Run migrations',
          'Verify schema',
          'Remove maintenance mode',
        ],
        notes: 'If migration fails, restore from backup immediately.',
        role: 'dev' as const,
        story_id: 'KBMEM-001',
        tags: ['database', 'production'],
      }
      const result = KbAddRunbookInputSchema.parse(input)
      expect(result.prerequisites).toHaveLength(2)
      expect(result.steps).toHaveLength(5)
      expect(result.notes).toContain('restore from backup')
    })

    it('should require at least one step', () => {
      const input = {
        title: 'Test runbook',
        purpose: 'Test purpose',
        steps: [],
      }
      expect(() => KbAddRunbookInputSchema.parse(input)).toThrow()
    })

    it('should reject runbook without steps', () => {
      const input = {
        title: 'Test runbook',
        purpose: 'Test purpose',
      }
      expect(() => KbAddRunbookInputSchema.parse(input)).toThrow()
    })
  })

  describe('Tool Definitions', () => {
    it('should have valid kb_add_decision definition', () => {
      expect(kbAddDecisionToolDefinition.name).toBe('kb_add_decision')
      expect(kbAddDecisionToolDefinition.description).toContain('Architecture Decision Record')
      expect(kbAddDecisionToolDefinition.inputSchema).toBeDefined()
    })

    it('should have valid kb_add_constraint definition', () => {
      expect(kbAddConstraintToolDefinition.name).toBe('kb_add_constraint')
      expect(kbAddConstraintToolDefinition.description).toContain('constraint')
      expect(kbAddConstraintToolDefinition.inputSchema).toBeDefined()
    })

    it('should have valid kb_add_lesson definition', () => {
      expect(kbAddLessonToolDefinition.name).toBe('kb_add_lesson')
      expect(kbAddLessonToolDefinition.description).toContain('lessons learned')
      expect(kbAddLessonToolDefinition.inputSchema).toBeDefined()
    })

    it('should have valid kb_add_runbook definition', () => {
      expect(kbAddRunbookToolDefinition.name).toBe('kb_add_runbook')
      expect(kbAddRunbookToolDefinition.description).toContain('runbook')
      expect(kbAddRunbookToolDefinition.inputSchema).toBeDefined()
    })
  })
})
