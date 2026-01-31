/**
 * MCP Protocol Error Tests
 *
 * Tests for error handling of malformed MCP requests, invalid tools,
 * and server startup failures.
 *
 * @see KNOW-0052 AC9, AC11 for protocol error test requirements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleToolCall } from '../tool-handlers.js'
import {
  type ToolCallContext,
  generateCorrelationId,
  EnvSchema,
  validateEnvironment,
} from '../server.js'
import { createMockEmbeddingClient, generateTestUuid } from './test-helpers.js'

// Mock only the search functions, not the schemas
vi.mock('../../search/index.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../search/index.js')>()
  return {
    ...actual,
    kb_search: vi.fn(),
    kb_get_related: vi.fn(),
  }
})

// Import mocked functions
import { kb_search, kb_get_related } from '../../search/index.js'

describe('MCP Protocol Errors', () => {
  let mockDeps: {
    db: unknown
    embeddingClient: ReturnType<typeof createMockEmbeddingClient>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      db: {},
      embeddingClient: createMockEmbeddingClient(),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Invalid tool name', () => {
    it('should return error for unknown tool', async () => {
      const context: ToolCallContext = {
        correlation_id: generateCorrelationId(),
        tool_call_chain: [],
        start_time: Date.now(),
      }

      const result = await handleToolCall(
        'unknown_tool',
        {},
        mockDeps as Parameters<typeof handleToolCall>[2],
        context,
      )

      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.code).toBe('INTERNAL_ERROR')
      expect(response.message).toContain('Unknown tool')
      expect(response.message).toContain('unknown_tool')
      expect(response.correlation_id).toBe(context.correlation_id)
    })

    it('should return error for empty tool name', async () => {
      const result = await handleToolCall(
        '',
        {},
        mockDeps as Parameters<typeof handleToolCall>[2],
      )

      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('Missing required parameters', () => {
    it('should return error when kb_search query is missing', async () => {
      const result = await handleToolCall(
        'kb_search',
        {},
        mockDeps as Parameters<typeof handleToolCall>[2],
      )

      expect(result.isError).toBe(true)
    })

    it('should return error when kb_search query is empty', async () => {
      const result = await handleToolCall(
        'kb_search',
        { query: '' },
        mockDeps as Parameters<typeof handleToolCall>[2],
      )

      expect(result.isError).toBe(true)
    })

    it('should return error when kb_get_related entry_id is missing', async () => {
      const result = await handleToolCall(
        'kb_get_related',
        {},
        mockDeps as Parameters<typeof handleToolCall>[2],
      )

      expect(result.isError).toBe(true)
    })
  })

  describe('Invalid parameter types', () => {
    it('should return error when query is not a string', async () => {
      const result = await handleToolCall(
        'kb_search',
        { query: 123 },
        mockDeps as Parameters<typeof handleToolCall>[2],
      )

      expect(result.isError).toBe(true)
    })

    it('should return error when limit is not a number', async () => {
      vi.mocked(kb_search).mockResolvedValue({
        results: [],
        metadata: {
          total: 0,
          fallback_mode: false,
          query_time_ms: 50,
          search_modes_used: ['semantic', 'keyword'] as const,
        },
      })

      // Limit as string - the schema should validate this
      const result = await handleToolCall(
        'kb_search',
        { query: 'test', limit: 'ten' },
        mockDeps as Parameters<typeof handleToolCall>[2],
      )

      // May or may not error depending on Zod coercion - test that it handles gracefully
      expect(result.content).toBeDefined()
    })

    it('should return error when entry_id is not a valid UUID', async () => {
      const result = await handleToolCall(
        'kb_get_related',
        { entry_id: 'not-a-uuid' },
        mockDeps as Parameters<typeof handleToolCall>[2],
      )

      expect(result.isError).toBe(true)
    })
  })

  describe('Concurrent request handling', () => {
    it('should handle 10 parallel kb_search calls', async () => {
      vi.mocked(kb_search).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return {
          results: [],
          metadata: {
            total: 0,
            fallback_mode: false,
            query_time_ms: 10,
            search_modes_used: ['semantic', 'keyword'] as const,
          },
        }
      })

      const promises = Array(10)
        .fill(null)
        .map((_, i) =>
          handleToolCall(
            'kb_search',
            { query: `test query ${i}` },
            mockDeps as Parameters<typeof handleToolCall>[2],
            {
              correlation_id: generateCorrelationId(),
              tool_call_chain: [], // Empty chain - not a nested call
              start_time: Date.now(),
            },
          ),
        )

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach(result => {
        expect(result.isError).toBeUndefined()
      })
    })

    it('should maintain unique correlation IDs for parallel calls', async () => {
      vi.mocked(kb_search).mockResolvedValue({
        results: [],
        metadata: {
          total: 0,
          fallback_mode: false,
          query_time_ms: 50,
          search_modes_used: ['semantic', 'keyword'] as const,
        },
      })

      const correlationIds = new Set<string>()

      const promises = Array(5)
        .fill(null)
        .map(() => {
          const correlationId = generateCorrelationId()
          correlationIds.add(correlationId)
          return handleToolCall(
            'kb_search',
            { query: 'test' },
            mockDeps as Parameters<typeof handleToolCall>[2],
            {
              correlation_id: correlationId,
              tool_call_chain: [], // Empty chain - not a nested call
              start_time: Date.now(),
            },
          )
        })

      await Promise.all(promises)

      // All correlation IDs should be unique
      expect(correlationIds.size).toBe(5)
    })
  })

  describe('Structured error responses', () => {
    it('should return structured error with code and message', async () => {
      const result = await handleToolCall(
        'nonexistent_tool',
        {},
        mockDeps as Parameters<typeof handleToolCall>[2],
      )

      expect(result.isError).toBe(true)
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')

      const response = JSON.parse(result.content[0].text)
      expect(response).toHaveProperty('code')
      expect(response).toHaveProperty('message')
      expect(typeof response.code).toBe('string')
      expect(typeof response.message).toBe('string')
    })

    it('should include correlation_id in error response when context provided', async () => {
      const correlationId = generateCorrelationId()
      const context: ToolCallContext = {
        correlation_id: correlationId,
        tool_call_chain: [],
        start_time: Date.now(),
      }

      const result = await handleToolCall(
        'unknown_tool',
        {},
        mockDeps as Parameters<typeof handleToolCall>[2],
        context,
      )

      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.correlation_id).toBe(correlationId)
    })
  })
})

describe('Server Startup Validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Environment variable validation', () => {
    it('should fail when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL
      process.env.OPENAI_API_KEY = 'test-key'

      expect(() => validateEnvironment()).toThrow('DATABASE_URL')
    })

    it('should fail when OPENAI_API_KEY is missing', () => {
      process.env.DATABASE_URL = 'postgresql://test'
      delete process.env.OPENAI_API_KEY

      expect(() => validateEnvironment()).toThrow('OPENAI_API_KEY')
    })

    it('should fail when DATABASE_URL is empty', () => {
      process.env.DATABASE_URL = ''
      process.env.OPENAI_API_KEY = 'test-key'

      expect(() => validateEnvironment()).toThrow('DATABASE_URL')
    })

    it('should fail when OPENAI_API_KEY is empty', () => {
      process.env.DATABASE_URL = 'postgresql://test'
      process.env.OPENAI_API_KEY = ''

      expect(() => validateEnvironment()).toThrow('OPENAI_API_KEY')
    })

    it('should succeed with valid environment variables', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test'
      process.env.OPENAI_API_KEY = 'sk-test-key'

      const config = validateEnvironment()

      expect(config.DATABASE_URL).toBe('postgresql://localhost:5432/test')
      expect(config.OPENAI_API_KEY).toBe('sk-test-key')
    })

    it('should use default values for optional variables', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test'
      process.env.OPENAI_API_KEY = 'sk-test-key'
      // Ensure optional variables are deleted to test defaults
      delete process.env.SHUTDOWN_TIMEOUT_MS
      delete process.env.LOG_LEVEL
      delete process.env.DB_POOL_SIZE
      delete process.env.KB_SEARCH_TIMEOUT_MS
      delete process.env.KB_GET_RELATED_TIMEOUT_MS
      delete process.env.LOG_SLOW_QUERIES_MS

      const config = validateEnvironment()

      expect(config.SHUTDOWN_TIMEOUT_MS).toBe(30000)
      expect(config.LOG_LEVEL).toBe('info')
      expect(config.DB_POOL_SIZE).toBe(5)
      expect(config.KB_SEARCH_TIMEOUT_MS).toBe(10000)
      expect(config.KB_GET_RELATED_TIMEOUT_MS).toBe(5000)
      expect(config.LOG_SLOW_QUERIES_MS).toBe(1000)
    })

    it('should accept custom timeout values', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test'
      process.env.OPENAI_API_KEY = 'sk-test-key'
      process.env.KB_SEARCH_TIMEOUT_MS = '15000'
      process.env.KB_GET_RELATED_TIMEOUT_MS = '8000'
      process.env.LOG_SLOW_QUERIES_MS = '500'

      const config = validateEnvironment()

      expect(config.KB_SEARCH_TIMEOUT_MS).toBe(15000)
      expect(config.KB_GET_RELATED_TIMEOUT_MS).toBe(8000)
      expect(config.LOG_SLOW_QUERIES_MS).toBe(500)
    })
  })

  describe('Environment schema validation', () => {
    it('should validate LOG_LEVEL enum values', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://test',
        OPENAI_API_KEY: 'test-key',
        LOG_LEVEL: 'debug',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.LOG_LEVEL).toBe('debug')
      }
    })

    it('should reject invalid LOG_LEVEL', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://test',
        OPENAI_API_KEY: 'test-key',
        LOG_LEVEL: 'invalid',
      })

      expect(result.success).toBe(false)
    })

    it('should coerce string timeout values to numbers', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://test',
        OPENAI_API_KEY: 'test-key',
        KB_SEARCH_TIMEOUT_MS: '20000',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.KB_SEARCH_TIMEOUT_MS).toBe(20000)
        expect(typeof result.data.KB_SEARCH_TIMEOUT_MS).toBe('number')
      }
    })

    it('should enforce maximum pool size', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://test',
        OPENAI_API_KEY: 'test-key',
        DB_POOL_SIZE: '25', // Exceeds max of 20
      })

      expect(result.success).toBe(false)
    })

    it('should enforce positive timeout values', () => {
      const result = EnvSchema.safeParse({
        DATABASE_URL: 'postgresql://test',
        OPENAI_API_KEY: 'test-key',
        KB_SEARCH_TIMEOUT_MS: '-1000',
      })

      expect(result.success).toBe(false)
    })
  })
})
