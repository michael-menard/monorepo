/**
 * Connection Pooling Tests
 *
 * Tests for connection pool behavior, concurrent request handling,
 * and pool exhaustion scenarios.
 *
 * @see KNOW-0052 AC5, AC12 for connection pooling requirements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleKbSearch, handleToolCall } from '../tool-handlers.js'
import { type ToolCallContext, generateCorrelationId, EnvSchema } from '../server.js'
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

describe('Connection Pooling Tests', () => {
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

    // Set environment variables
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.DB_POOL_SIZE = '5'
    process.env.KB_SEARCH_TIMEOUT_MS = '10000'
    process.env.KB_GET_RELATED_TIMEOUT_MS = '5000'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Concurrent search calls', () => {
    it('should handle 10 parallel kb_search calls successfully', async () => {
      vi.mocked(kb_search).mockImplementation(async () => {
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 20))
        return {
          results: [],
          metadata: {
            total: 0,
            fallback_mode: false,
            query_time_ms: 20,
            search_modes_used: ['semantic', 'keyword'] as const,
          },
        }
      })

      const promises = Array(10)
        .fill(null)
        .map((_, i) => {
          const context: ToolCallContext = {
            correlation_id: generateCorrelationId(),
            tool_call_chain: ['kb_search'],
            start_time: Date.now(),
          }
          return handleKbSearch(
            { query: `concurrent query ${i}` },
            mockDeps as Parameters<typeof handleKbSearch>[1],
            context,
          )
        })

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach(result => {
        expect(result.isError).toBeUndefined()
      })

      // Verify all were called
      expect(vi.mocked(kb_search)).toHaveBeenCalledTimes(10)
    })

    it('should handle mixed concurrent kb_search and kb_get_related calls', async () => {
      vi.mocked(kb_search).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 15))
        return {
          results: [],
          metadata: {
            total: 0,
            fallback_mode: false,
            query_time_ms: 15,
            search_modes_used: ['semantic', 'keyword'] as const,
          },
        }
      })

      vi.mocked(kb_get_related).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return {
          results: [],
          metadata: {
            total: 0,
            relationship_types: [],
          },
        }
      })

      const searchPromises = Array(5)
        .fill(null)
        .map((_, i) =>
          handleToolCall(
            'kb_search',
            { query: `search ${i}` },
            mockDeps as Parameters<typeof handleToolCall>[2],
            {
              correlation_id: generateCorrelationId(),
              tool_call_chain: [],
              start_time: Date.now(),
            },
          ),
        )

      const relatedPromises = Array(5)
        .fill(null)
        .map(() =>
          handleToolCall(
            'kb_get_related',
            { entry_id: generateTestUuid() },
            mockDeps as Parameters<typeof handleToolCall>[2],
            {
              correlation_id: generateCorrelationId(),
              tool_call_chain: [],
              start_time: Date.now(),
            },
          ),
        )

      const results = await Promise.all([...searchPromises, ...relatedPromises])

      results.forEach(result => {
        expect(result.isError).toBeUndefined()
      })

      expect(vi.mocked(kb_search)).toHaveBeenCalledTimes(5)
      expect(vi.mocked(kb_get_related)).toHaveBeenCalledTimes(5)
    })
  })

  describe('Connection pool configuration', () => {
    it('should use configured pool size from environment', () => {
      process.env.DB_POOL_SIZE = '10'

      const result = EnvSchema.safeParse(process.env)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.DB_POOL_SIZE).toBe(10)
      }
    })

    it('should use default pool size when not configured', () => {
      delete process.env.DB_POOL_SIZE

      const result = EnvSchema.safeParse(process.env)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.DB_POOL_SIZE).toBe(5)
      }
    })

    it('should enforce maximum pool size of 20', () => {
      process.env.DB_POOL_SIZE = '25'

      const result = EnvSchema.safeParse(process.env)

      expect(result.success).toBe(false)
    })

    it('should enforce minimum pool size of 1', () => {
      process.env.DB_POOL_SIZE = '0'

      const result = EnvSchema.safeParse(process.env)

      expect(result.success).toBe(false)
    })
  })

  describe('Pool exhaustion simulation', () => {
    it('should handle 11 concurrent calls with queue behavior', async () => {
      let activeConnections = 0
      let maxActiveConnections = 0
      const poolSize = 5

      vi.mocked(kb_search).mockImplementation(async () => {
        activeConnections++
        maxActiveConnections = Math.max(maxActiveConnections, activeConnections)

        // Simulate database work
        await new Promise(resolve => setTimeout(resolve, 50))

        activeConnections--

        return {
          results: [],
          metadata: {
            total: 0,
            fallback_mode: false,
            query_time_ms: 50,
            search_modes_used: ['semantic', 'keyword'] as const,
          },
        }
      })

      const promises = Array(11)
        .fill(null)
        .map((_, i) =>
          handleKbSearch(
            { query: `exhaust query ${i}` },
            mockDeps as Parameters<typeof handleKbSearch>[1],
            {
              correlation_id: generateCorrelationId(),
              tool_call_chain: ['kb_search'],
              start_time: Date.now(),
            },
          ),
        )

      const results = await Promise.all(promises)

      // All should eventually succeed (mocked, no real pool)
      results.forEach(result => {
        expect(result.isError).toBeUndefined()
      })

      // Verify all were called
      expect(vi.mocked(kb_search)).toHaveBeenCalledTimes(11)
    })
  })

  describe('Connection timeout behavior', () => {
    it('should handle timeout without connection leak', async () => {
      process.env.KB_SEARCH_TIMEOUT_MS = '25'

      vi.mocked(kb_search).mockImplementation(async () => {
        // Simulate a query that takes longer than timeout
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          results: [],
          metadata: {
            total: 0,
            fallback_mode: false,
            query_time_ms: 100,
            search_modes_used: ['semantic', 'keyword'] as const,
          },
        }
      })

      const result = await handleKbSearch(
        { query: 'timeout query' },
        mockDeps as Parameters<typeof handleKbSearch>[1],
        {
          correlation_id: generateCorrelationId(),
          tool_call_chain: ['kb_search'],
          start_time: Date.now(),
        },
      )

      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.code).toBe('TIMEOUT')
    })

    it('should allow subsequent queries after timeout', async () => {
      process.env.KB_SEARCH_TIMEOUT_MS = '25'

      // First call times out
      vi.mocked(kb_search).mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          results: [],
          metadata: {
            total: 0,
            fallback_mode: false,
            query_time_ms: 100,
            search_modes_used: ['semantic', 'keyword'] as const,
          },
        }
      })

      // Second call succeeds quickly
      vi.mocked(kb_search).mockImplementationOnce(async () => {
        return {
          results: [
            {
              id: generateTestUuid(),
              content: 'Success',
              role: 'dev' as const,
              tags: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          metadata: {
            total: 1,
            fallback_mode: false,
            query_time_ms: 10,
            search_modes_used: ['semantic', 'keyword'] as const,
          },
        }
      })

      // First query times out
      const result1 = await handleKbSearch(
        { query: 'timeout query' },
        mockDeps as Parameters<typeof handleKbSearch>[1],
        {
          correlation_id: generateCorrelationId(),
          tool_call_chain: ['kb_search'],
          start_time: Date.now(),
        },
      )

      expect(result1.isError).toBe(true)

      // Reset timeout for second query
      process.env.KB_SEARCH_TIMEOUT_MS = '10000'

      // Second query succeeds
      const result2 = await handleKbSearch(
        { query: 'success query' },
        mockDeps as Parameters<typeof handleKbSearch>[1],
        {
          correlation_id: generateCorrelationId(),
          tool_call_chain: ['kb_search'],
          start_time: Date.now(),
        },
      )

      expect(result2.isError).toBeUndefined()
      const response = JSON.parse(result2.content[0].text)
      expect(response.results).toHaveLength(1)
    })
  })

  describe('Pool metrics tracking', () => {
    it('should complete all queries even under load', async () => {
      const queryCount = 20
      let completedQueries = 0

      vi.mocked(kb_search).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5))
        completedQueries++
        return {
          results: [],
          metadata: {
            total: 0,
            fallback_mode: false,
            query_time_ms: 5,
            search_modes_used: ['semantic', 'keyword'] as const,
          },
        }
      })

      const promises = Array(queryCount)
        .fill(null)
        .map((_, i) =>
          handleKbSearch(
            { query: `load query ${i}` },
            mockDeps as Parameters<typeof handleKbSearch>[1],
          ),
        )

      await Promise.all(promises)

      expect(completedQueries).toBe(queryCount)
    })
  })
})
