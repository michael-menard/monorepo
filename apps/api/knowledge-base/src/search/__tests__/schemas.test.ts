/**
 * Schema Validation Tests
 *
 * Tests for Zod schema validation of search inputs and outputs.
 *
 * @see KNOW-004 AC4 for acceptance criteria
 */

import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'
import {
  SearchInputSchema,
  GetRelatedInputSchema,
  createSearchError,
  SEMANTIC_WEIGHT,
  KEYWORD_WEIGHT,
  RRF_K,
  SEMANTIC_SIMILARITY_THRESHOLD,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_RELATED_LIMIT,
  DEFAULT_RELATED_LIMIT,
} from '../schemas.js'

describe('SearchInputSchema', () => {
  describe('query validation', () => {
    it('should accept valid query string', () => {
      const input = SearchInputSchema.parse({ query: 'How to order routes' })

      expect(input.query).toBe('How to order routes')
    })

    it('should reject empty query string', () => {
      expect(() => SearchInputSchema.parse({ query: '' })).toThrow(ZodError)

      try {
        SearchInputSchema.parse({ query: '' })
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError)
        const zodError = error as ZodError
        expect(zodError.issues[0].message).toBe('Query must be non-empty')
      }
    })

    it('should handle very long query text (up to 10000 characters)', () => {
      const longQuery = 'a'.repeat(10000)
      const input = SearchInputSchema.parse({ query: longQuery })

      expect(input.query.length).toBe(10000)
    })

    it('should handle query with special characters', () => {
      const specialQuery = 'How to use $regex like .*test.* in [brackets]?'
      const input = SearchInputSchema.parse({ query: specialQuery })

      expect(input.query).toBe(specialQuery)
    })
  })

  describe('role validation', () => {
    it('should accept valid roles', () => {
      const roles = ['pm', 'dev', 'qa', 'all'] as const

      for (const role of roles) {
        const input = SearchInputSchema.parse({ query: 'test', role })
        expect(input.role).toBe(role)
      }
    })

    it('should reject invalid role', () => {
      expect(() =>
        SearchInputSchema.parse({ query: 'test', role: 'invalid' }),
      ).toThrow(ZodError)

      try {
        SearchInputSchema.parse({ query: 'test', role: 'invalid' })
      } catch (error) {
        const zodError = error as ZodError
        expect(zodError.issues[0].path).toContain('role')
      }
    })

    it('should allow optional role', () => {
      const input = SearchInputSchema.parse({ query: 'test' })

      expect(input.role).toBeUndefined()
    })
  })

  describe('tags validation', () => {
    it('should accept valid tags array', () => {
      const input = SearchInputSchema.parse({
        query: 'test',
        tags: ['typescript', 'best-practice'],
      })

      expect(input.tags).toEqual(['typescript', 'best-practice'])
    })

    it('should accept empty tags array', () => {
      const input = SearchInputSchema.parse({ query: 'test', tags: [] })

      expect(input.tags).toEqual([])
    })

    it('should allow optional tags', () => {
      const input = SearchInputSchema.parse({ query: 'test' })

      expect(input.tags).toBeUndefined()
    })
  })

  describe('entry_type validation', () => {
    it('should accept valid entry types', () => {
      // KBMEM-001: Updated entry types for 3-bucket memory architecture
      const types = ['note', 'decision', 'constraint', 'runbook', 'lesson'] as const

      for (const entry_type of types) {
        const input = SearchInputSchema.parse({ query: 'test', entry_type })
        expect(input.entry_type).toBe(entry_type)
      }
    })

    it('should reject invalid entry type', () => {
      expect(() =>
        SearchInputSchema.parse({ query: 'test', entry_type: 'invalid' }),
      ).toThrow(ZodError)
    })

    it('should reject legacy entry types', () => {
      // Legacy values no longer valid after KBMEM-001
      const legacyTypes = ['fact', 'summary', 'template']

      for (const entry_type of legacyTypes) {
        expect(() =>
          SearchInputSchema.parse({ query: 'test', entry_type }),
        ).toThrow(ZodError)
      }
    })
  })

  describe('limit validation', () => {
    it('should use default limit when not provided', () => {
      const input = SearchInputSchema.parse({ query: 'test' })

      expect(input.limit).toBe(DEFAULT_LIMIT)
    })

    it('should accept valid limit', () => {
      const input = SearchInputSchema.parse({ query: 'test', limit: 25 })

      expect(input.limit).toBe(25)
    })

    it('should reject limit less than 1', () => {
      expect(() => SearchInputSchema.parse({ query: 'test', limit: 0 })).toThrow(ZodError)
      expect(() => SearchInputSchema.parse({ query: 'test', limit: -1 })).toThrow(ZodError)
    })

    it('should reject limit greater than max', () => {
      expect(() =>
        SearchInputSchema.parse({ query: 'test', limit: MAX_LIMIT + 1 }),
      ).toThrow(ZodError)
    })

    it('should accept max limit', () => {
      const input = SearchInputSchema.parse({ query: 'test', limit: MAX_LIMIT })

      expect(input.limit).toBe(MAX_LIMIT)
    })
  })

  describe('min_confidence validation', () => {
    it('should use default min_confidence when not provided', () => {
      const input = SearchInputSchema.parse({ query: 'test' })

      expect(input.min_confidence).toBe(0.0)
    })

    it('should accept valid min_confidence', () => {
      const input = SearchInputSchema.parse({ query: 'test', min_confidence: 0.5 })

      expect(input.min_confidence).toBe(0.5)
    })

    it('should reject min_confidence less than 0', () => {
      expect(() =>
        SearchInputSchema.parse({ query: 'test', min_confidence: -0.1 }),
      ).toThrow(ZodError)
    })

    it('should reject min_confidence greater than 1', () => {
      expect(() =>
        SearchInputSchema.parse({ query: 'test', min_confidence: 1.1 }),
      ).toThrow(ZodError)
    })

    it('should accept boundary values', () => {
      const input0 = SearchInputSchema.parse({ query: 'test', min_confidence: 0 })
      const input1 = SearchInputSchema.parse({ query: 'test', min_confidence: 1 })

      expect(input0.min_confidence).toBe(0)
      expect(input1.min_confidence).toBe(1)
    })
  })

  describe('explain validation', () => {
    it('should accept explain flag', () => {
      const input = SearchInputSchema.parse({ query: 'test', explain: true })

      expect(input.explain).toBe(true)
    })

    it('should default to undefined when not provided', () => {
      const input = SearchInputSchema.parse({ query: 'test' })

      expect(input.explain).toBeUndefined()
    })
  })
})

describe('GetRelatedInputSchema', () => {
  describe('entry_id validation', () => {
    it('should accept valid UUID', () => {
      const input = GetRelatedInputSchema.parse({
        entry_id: '123e4567-e89b-12d3-a456-426614174000',
      })

      expect(input.entry_id).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('should reject invalid UUID format', () => {
      expect(() =>
        GetRelatedInputSchema.parse({ entry_id: 'not-a-uuid' }),
      ).toThrow(ZodError)

      try {
        GetRelatedInputSchema.parse({ entry_id: 'not-a-uuid' })
      } catch (error) {
        const zodError = error as ZodError
        expect(zodError.issues[0].message).toBe('Invalid UUID format')
      }
    })
  })

  describe('limit validation', () => {
    it('should use default limit when not provided', () => {
      const input = GetRelatedInputSchema.parse({
        entry_id: '123e4567-e89b-12d3-a456-426614174000',
      })

      expect(input.limit).toBe(DEFAULT_RELATED_LIMIT)
    })

    it('should accept valid limit', () => {
      const input = GetRelatedInputSchema.parse({
        entry_id: '123e4567-e89b-12d3-a456-426614174000',
        limit: 10,
      })

      expect(input.limit).toBe(10)
    })

    it('should reject limit greater than max', () => {
      expect(() =>
        GetRelatedInputSchema.parse({
          entry_id: '123e4567-e89b-12d3-a456-426614174000',
          limit: MAX_RELATED_LIMIT + 1,
        }),
      ).toThrow(ZodError)
    })
  })
})

describe('createSearchError', () => {
  it('should create error with correct structure', () => {
    const error = createSearchError('VALIDATION_ERROR', 'Invalid query', 'query')

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.error).toBe('Invalid query')
    expect(error.field).toBe('query')
  })

  it('should sanitize SQL from error message', () => {
    const error = createSearchError(
      'DATABASE_ERROR',
      'SELECT * FROM users WHERE password=secret',
    )

    expect(error.error).not.toContain('SELECT')
    expect(error.error).toContain('[SQL query]')
  })

  it('should sanitize password from error message', () => {
    const error = createSearchError(
      'DATABASE_ERROR',
      'Connection failed: password=mysecret123',
    )

    expect(error.error).not.toContain('mysecret123')
    expect(error.error).toContain('password=***')
  })

  it('should truncate long messages', () => {
    const longMessage = 'a'.repeat(300)
    const error = createSearchError('INTERNAL_ERROR', longMessage)

    expect(error.error.length).toBeLessThanOrEqual(203) // 200 + '...'
  })

  it('should exclude field when not provided', () => {
    const error = createSearchError('NOT_FOUND', 'Entry not found')

    expect(error.field).toBeUndefined()
  })
})

describe('Constants', () => {
  it('should have correct RRF constants', () => {
    expect(SEMANTIC_WEIGHT).toBe(0.7)
    expect(KEYWORD_WEIGHT).toBe(0.3)
    expect(RRF_K).toBe(60)
  })

  it('should have correct similarity threshold', () => {
    expect(SEMANTIC_SIMILARITY_THRESHOLD).toBe(0.3)
  })

  it('should have correct limit constants', () => {
    expect(DEFAULT_LIMIT).toBe(10)
    expect(MAX_LIMIT).toBe(50)
    expect(DEFAULT_RELATED_LIMIT).toBe(5)
    expect(MAX_RELATED_LIMIT).toBe(20)
  })
})
