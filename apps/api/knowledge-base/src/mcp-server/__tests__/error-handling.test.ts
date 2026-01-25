/**
 * Error Handling Tests for MCP Server
 *
 * Tests error sanitization layer to ensure:
 * - Full errors logged server-side
 * - Sanitized errors returned to clients
 * - Sensitive data (API keys, connection strings) never exposed
 *
 * @see KNOW-0051 AC4 for error sanitization requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import {
  sanitizeError,
  errorToToolResult,
  parseZodError,
  sanitizeDatabaseError,
  sanitizeOpenAIError,
  sanitizeNotFoundError,
  sanitizeUnknownError,
  isZodError,
  isDatabaseError,
  isOpenAIError,
  ErrorCode,
  type McpError,
} from '../error-handling.js'
import { NotFoundError } from '../../crud-operations/errors.js'
import { sampleErrors } from './test-helpers.js'

// Mock the logger to suppress output during tests
vi.mock('../logger.js', () => ({
  createMcpLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('Error Type Guards', () => {
  describe('isZodError', () => {
    it('should return true for Zod validation errors', () => {
      const schema = z.object({ name: z.string() })
      try {
        schema.parse({ name: 123 })
      } catch (error) {
        expect(isZodError(error)).toBe(true)
      }
    })

    it('should return false for non-Zod errors', () => {
      expect(isZodError(new Error('regular error'))).toBe(false)
      expect(isZodError(null)).toBe(false)
      expect(isZodError(undefined)).toBe(false)
      expect(isZodError('string')).toBe(false)
    })
  })

  describe('isDatabaseError', () => {
    it('should detect connection errors', () => {
      const error = new Error('Connection refused')
      expect(isDatabaseError(error)).toBe(true)
    })

    it('should detect PostgreSQL errors', () => {
      const error = new Error('relation "users" does not exist')
      expect(isDatabaseError(error)).toBe(true)
    })

    it('should detect pool errors', () => {
      const error = new Error('pool timeout')
      expect(isDatabaseError(error)).toBe(true)
    })

    it('should return false for non-database errors', () => {
      expect(isDatabaseError(new Error('regular error'))).toBe(false)
      expect(isDatabaseError(null)).toBe(false)
    })
  })

  describe('isOpenAIError', () => {
    it('should detect OpenAI rate limit errors', () => {
      const error = new Error('rate_limit exceeded')
      expect(isOpenAIError(error)).toBe(true)
    })

    it('should detect OpenAI quota errors', () => {
      const error = new Error('insufficient_quota')
      expect(isOpenAIError(error)).toBe(true)
    })

    it('should detect embedding errors', () => {
      const error = new Error('Embedding generation failed')
      expect(isOpenAIError(error)).toBe(true)
    })

    it('should return false for non-OpenAI errors', () => {
      expect(isOpenAIError(new Error('regular error'))).toBe(false)
      expect(isOpenAIError(null)).toBe(false)
    })
  })
})

describe('parseZodError', () => {
  it('should extract field name from validation error', () => {
    const schema = z.object({
      content: z.string().min(1),
      role: z.enum(['pm', 'dev', 'qa', 'all']),
    })

    try {
      schema.parse({ content: '', role: 'dev' })
    } catch (error) {
      if (isZodError(error)) {
        const result = parseZodError(error)
        expect(result.code).toBe(ErrorCode.VALIDATION_ERROR)
        expect(result.field).toBe('content')
        expect(result.message).toContain('least 1 character')
      }
    }
  })

  it('should handle nested field paths', () => {
    const schema = z.object({
      user: z.object({
        email: z.string().email(),
      }),
    })

    try {
      schema.parse({ user: { email: 'invalid' } })
    } catch (error) {
      if (isZodError(error)) {
        const result = parseZodError(error)
        expect(result.code).toBe(ErrorCode.VALIDATION_ERROR)
        expect(result.field).toBe('user.email')
      }
    }
  })

  it('should handle invalid enum values', () => {
    const schema = z.object({
      role: z.enum(['pm', 'dev', 'qa', 'all']),
    })

    try {
      schema.parse({ role: 'invalid' })
    } catch (error) {
      if (isZodError(error)) {
        const result = parseZodError(error)
        expect(result.code).toBe(ErrorCode.VALIDATION_ERROR)
        expect(result.field).toBe('role')
      }
    }
  })
})

describe('sanitizeDatabaseError', () => {
  it('should not expose connection strings', () => {
    const error = new Error('Connection to postgresql://user:password@host:5432/db failed')
    const result = sanitizeDatabaseError(error)

    expect(result.code).toBe(ErrorCode.DATABASE_ERROR)
    expect(result.message).not.toContain('password')
    expect(result.message).not.toContain('postgresql://')
    expect(result.message).toBe('Database operation failed. Please try again later.')
  })

  it('should not expose SQL queries', () => {
    const error = new Error('SELECT * FROM users WHERE id = 1 failed')
    const result = sanitizeDatabaseError(error)

    expect(result.code).toBe(ErrorCode.DATABASE_ERROR)
    expect(result.message).not.toContain('SELECT')
    expect(result.message).not.toContain('FROM')
  })
})

describe('sanitizeOpenAIError', () => {
  it('should provide specific message for rate limits', () => {
    const error = new Error('OpenAI rate_limit exceeded')
    const result = sanitizeOpenAIError(error)

    expect(result.code).toBe(ErrorCode.API_ERROR)
    expect(result.message).toContain('rate limit')
    expect(result.message).toContain('wait')
  })

  it('should provide specific message for quota exceeded', () => {
    const error = new Error('insufficient_quota')
    const result = sanitizeOpenAIError(error)

    expect(result.code).toBe(ErrorCode.API_ERROR)
    expect(result.message).toContain('quota')
    expect(result.message).toContain('administrator')
  })

  it('should not expose API keys', () => {
    const error = new Error('API key sk-abc123xyz invalid')
    const result = sanitizeOpenAIError(error)

    expect(result.code).toBe(ErrorCode.API_ERROR)
    expect(result.message).not.toContain('sk-')
    expect(result.message).not.toContain('abc123')
  })
})

describe('sanitizeNotFoundError', () => {
  it('should include resource and ID in message', () => {
    const error = new NotFoundError('KnowledgeEntry', 'test-uuid-123')
    const result = sanitizeNotFoundError(error)

    expect(result.code).toBe(ErrorCode.NOT_FOUND)
    expect(result.message).toContain('KnowledgeEntry')
    expect(result.message).toContain('test-uuid-123')
    expect(result.message).toContain('not found')
  })
})

describe('sanitizeUnknownError', () => {
  it('should return generic message for unknown errors', () => {
    const error = new Error('Something completely unexpected')
    const result = sanitizeUnknownError(error)

    expect(result.code).toBe(ErrorCode.INTERNAL_ERROR)
    expect(result.message).toBe('An unexpected error occurred. Please try again later.')
  })

  it('should handle non-Error objects', () => {
    const result = sanitizeUnknownError('string error')

    expect(result.code).toBe(ErrorCode.INTERNAL_ERROR)
    expect(result.message).toBe('An unexpected error occurred. Please try again later.')
  })
})

describe('sanitizeError', () => {
  it('should route Zod errors correctly', () => {
    const schema = z.string().min(1)
    try {
      schema.parse('')
    } catch (error) {
      const result = sanitizeError(error)
      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR)
    }
  })

  it('should route NotFoundError correctly', () => {
    const error = new NotFoundError('Entry', '123')
    const result = sanitizeError(error)
    expect(result.code).toBe(ErrorCode.NOT_FOUND)
  })

  it('should route database errors correctly', () => {
    const error = sampleErrors.databaseConnection
    const result = sanitizeError(error)
    expect(result.code).toBe(ErrorCode.DATABASE_ERROR)
    expect(result.message).not.toContain('secretpassword')
  })

  it('should route OpenAI errors correctly', () => {
    const error = sampleErrors.openAIRateLimit
    const result = sanitizeError(error)
    expect(result.code).toBe(ErrorCode.API_ERROR)
  })

  it('should route unknown errors correctly', () => {
    const error = sampleErrors.generic
    const result = sanitizeError(error)
    expect(result.code).toBe(ErrorCode.INTERNAL_ERROR)
  })
})

describe('errorToToolResult', () => {
  it('should return MCP tool result format with error flag', () => {
    const error = new Error('Test error')
    const result = errorToToolResult(error)

    expect(result.isError).toBe(true)
    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
  })

  it('should include sanitized error as JSON in content', () => {
    const error = new NotFoundError('Entry', '123')
    const result = errorToToolResult(error)

    const parsed = JSON.parse(result.content[0].text) as McpError
    expect(parsed.code).toBe(ErrorCode.NOT_FOUND)
    expect(parsed.message).toContain('Entry')
    expect(parsed.message).toContain('123')
  })

  it('should handle validation errors with field info', () => {
    const schema = z.object({ content: z.string().min(1) })
    try {
      schema.parse({ content: '' })
    } catch (error) {
      const result = errorToToolResult(error)
      const parsed = JSON.parse(result.content[0].text) as McpError

      expect(parsed.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(parsed.field).toBe('content')
    }
  })
})
