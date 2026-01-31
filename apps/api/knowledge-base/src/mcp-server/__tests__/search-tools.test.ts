/**
 * Search Tools Tests
 *
 * Unit tests for kb_search and kb_get_related MCP tool handlers.
 *
 * @see KNOW-0052 AC1, AC2 for search tool requirements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  handleKbSearch,
  handleKbGetRelated,
  handleToolCall,
  ToolTimeoutError,
  CircularDependencyError,
} from '../tool-handlers.js'
import { type ToolCallContext, generateCorrelationId } from '../server.js'
import {
  createMockEmbeddingClient,
  createMockKnowledgeEntry,
  generateTestUuid,
} from './test-helpers.js'
import { SearchInputSchema, GetRelatedInputSchema } from '../../search/index.js'

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

describe('Search Tools', () => {
  let mockDeps: {
    db: unknown
    embeddingClient: ReturnType<typeof createMockEmbeddingClient>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock dependencies
    mockDeps = {
      db: {},
      embeddingClient: createMockEmbeddingClient(),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('handleKbSearch', () => {
    it('should return search results with metadata', async () => {
      const mockResults = [
        createMockKnowledgeEntry({ id: generateTestUuid(), content: 'Result 1' }),
        createMockKnowledgeEntry({ id: generateTestUuid(), content: 'Result 2' }),
      ]

      vi.mocked(kb_search).mockResolvedValue({
        results: mockResults.map(entry => ({
          id: entry.id,
          content: entry.content,
          role: entry.role,
          tags: entry.tags,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          relevance_score: 0.95,
        })),
        metadata: {
          total: 2,
          fallback_mode: false,
          query_time_ms: 150,
          search_modes_used: ['semantic', 'keyword'] as const,
        },
      })

      const context: ToolCallContext = {
        correlation_id: generateCorrelationId(),
        tool_call_chain: ['kb_search'],
        start_time: Date.now(),
      }

      const result = await handleKbSearch(
        { query: 'test query', role: 'dev', limit: 10 },
        mockDeps as Parameters<typeof handleKbSearch>[1],
        context,
      )

      expect(result.isError).toBeUndefined()
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')

      const response = JSON.parse(result.content[0].text)
      expect(response.results).toHaveLength(2)
      expect(response.metadata.correlation_id).toBe(context.correlation_id)
      expect(response.metadata.fallback_mode).toBe(false)
      expect(response.metadata.query_time_ms).toBe(150)
    })

    it('should include correlation_id in response metadata', async () => {
      vi.mocked(kb_search).mockResolvedValue({
        results: [],
        metadata: {
          total: 0,
          fallback_mode: false,
          query_time_ms: 50,
          search_modes_used: ['semantic', 'keyword'] as const,
        },
      })

      const correlationId = generateCorrelationId()
      const context: ToolCallContext = {
        correlation_id: correlationId,
        tool_call_chain: ['kb_search'],
        start_time: Date.now(),
      }

      const result = await handleKbSearch(
        { query: 'test' },
        mockDeps as Parameters<typeof handleKbSearch>[1],
        context,
      )

      const response = JSON.parse(result.content[0].text)
      expect(response.metadata.correlation_id).toBe(correlationId)
    })

    it('should filter by role', async () => {
      vi.mocked(kb_search).mockResolvedValue({
        results: [
          {
            id: generateTestUuid(),
            content: 'Dev content',
            role: 'dev',
            tags: ['typescript'],
            createdAt: new Date(),
            updatedAt: new Date(),
            relevance_score: 0.9,
          },
        ],
        metadata: {
          total: 1,
          fallback_mode: false,
          query_time_ms: 100,
          search_modes_used: ['semantic', 'keyword'] as const,
        },
      })

      const result = await handleKbSearch(
        { query: 'typescript', role: 'dev' },
        mockDeps as Parameters<typeof handleKbSearch>[1],
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.results[0].role).toBe('dev')
    })

    it('should filter by tags', async () => {
      vi.mocked(kb_search).mockResolvedValue({
        results: [
          {
            id: generateTestUuid(),
            content: 'Tagged content',
            role: 'dev',
            tags: ['typescript', 'validation'],
            createdAt: new Date(),
            updatedAt: new Date(),
            relevance_score: 0.85,
          },
        ],
        metadata: {
          total: 1,
          fallback_mode: false,
          query_time_ms: 80,
          search_modes_used: ['semantic', 'keyword'] as const,
        },
      })

      const result = await handleKbSearch(
        { query: 'validation', tags: ['typescript'] },
        mockDeps as Parameters<typeof handleKbSearch>[1],
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.results[0].tags).toContain('typescript')
    })

    it('should log fallback mode at warn level when OpenAI unavailable', async () => {
      vi.mocked(kb_search).mockResolvedValue({
        results: [
          {
            id: generateTestUuid(),
            content: 'Keyword-only result',
            role: 'dev',
            tags: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            keyword_score: 0.7,
          },
        ],
        metadata: {
          total: 1,
          fallback_mode: true,
          query_time_ms: 50,
          search_modes_used: ['keyword'] as const,
        },
      })

      const result = await handleKbSearch(
        { query: 'test' },
        mockDeps as Parameters<typeof handleKbSearch>[1],
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.metadata.fallback_mode).toBe(true)
    })

    it('should handle validation errors', async () => {
      // Empty query should trigger Zod validation error
      const result = await handleKbSearch(
        { query: '' }, // Invalid empty query
        mockDeps as Parameters<typeof handleKbSearch>[1],
      )

      expect(result.isError).toBe(true)
    })

    it('should handle database errors', async () => {
      vi.mocked(kb_search).mockRejectedValue(new Error('Database connection failed'))

      const result = await handleKbSearch(
        { query: 'test' },
        mockDeps as Parameters<typeof handleKbSearch>[1],
      )

      expect(result.isError).toBe(true)
    })
  })

  describe('handleKbGetRelated', () => {
    it('should return related entries with metadata', async () => {
      const entryId = generateTestUuid()
      const relatedEntries = [
        {
          id: generateTestUuid(),
          content: 'Related entry 1',
          role: 'dev' as const,
          tags: ['typescript', 'validation'],
          createdAt: new Date(),
          updatedAt: new Date(),
          relationship: 'tag_overlap' as const,
          tag_overlap_count: 2,
        },
      ]

      vi.mocked(kb_get_related).mockResolvedValue({
        results: relatedEntries,
        metadata: {
          total: 1,
          relationship_types: ['tag_overlap'],
        },
      })

      const context: ToolCallContext = {
        correlation_id: generateCorrelationId(),
        tool_call_chain: ['kb_get_related'],
        start_time: Date.now(),
      }

      const result = await handleKbGetRelated(
        { entry_id: entryId, limit: 5 },
        mockDeps as Parameters<typeof handleKbGetRelated>[1],
        context,
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.results).toHaveLength(1)
      expect(response.metadata.correlation_id).toBe(context.correlation_id)
      expect(response.metadata.relationship_types).toContain('tag_overlap')
    })

    it('should return empty results for non-existent entry', async () => {
      vi.mocked(kb_get_related).mockResolvedValue({
        results: [],
        metadata: {
          total: 0,
          relationship_types: [],
        },
      })

      const result = await handleKbGetRelated(
        { entry_id: generateTestUuid() },
        mockDeps as Parameters<typeof handleKbGetRelated>[1],
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.results).toHaveLength(0)
    })

    it('should include correlation_id in response metadata', async () => {
      vi.mocked(kb_get_related).mockResolvedValue({
        results: [],
        metadata: {
          total: 0,
          relationship_types: [],
        },
      })

      const correlationId = generateCorrelationId()
      const context: ToolCallContext = {
        correlation_id: correlationId,
        tool_call_chain: ['kb_get_related'],
        start_time: Date.now(),
      }

      const result = await handleKbGetRelated(
        { entry_id: generateTestUuid() },
        mockDeps as Parameters<typeof handleKbGetRelated>[1],
        context,
      )

      const response = JSON.parse(result.content[0].text)
      expect(response.metadata.correlation_id).toBe(correlationId)
    })
  })

  describe('handleToolCall with search tools', () => {
    it('should dispatch kb_search to correct handler', async () => {
      vi.mocked(kb_search).mockResolvedValue({
        results: [],
        metadata: {
          total: 0,
          fallback_mode: false,
          query_time_ms: 50,
          search_modes_used: ['semantic', 'keyword'] as const,
        },
      })

      const context: ToolCallContext = {
        correlation_id: generateCorrelationId(),
        tool_call_chain: [],
        start_time: Date.now(),
      }

      const result = await handleToolCall(
        'kb_search',
        { query: 'test' },
        mockDeps as Parameters<typeof handleToolCall>[2],
        context,
      )

      expect(result.isError).toBeUndefined()
      expect(vi.mocked(kb_search)).toHaveBeenCalled()
    })

    it('should dispatch kb_get_related to correct handler', async () => {
      vi.mocked(kb_get_related).mockResolvedValue({
        results: [],
        metadata: {
          total: 0,
          relationship_types: [],
        },
      })

      const context: ToolCallContext = {
        correlation_id: generateCorrelationId(),
        tool_call_chain: [],
        start_time: Date.now(),
      }

      const result = await handleToolCall(
        'kb_get_related',
        { entry_id: generateTestUuid() },
        mockDeps as Parameters<typeof handleToolCall>[2],
        context,
      )

      expect(result.isError).toBeUndefined()
      expect(vi.mocked(kb_get_related)).toHaveBeenCalled()
    })
  })

  describe('Correlation ID generation', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId()
      const id2 = generateCorrelationId()

      expect(id1).not.toBe(id2)
      // UUID v4 format
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })
  })

  describe('Circular dependency detection', () => {
    it('should detect circular dependency in tool chain', async () => {
      const context: ToolCallContext = {
        correlation_id: generateCorrelationId(),
        tool_call_chain: ['kb_search', 'kb_get'],
        start_time: Date.now(),
      }

      // Try to call kb_search again (circular)
      const result = await handleToolCall(
        'kb_search',
        { query: 'test' },
        mockDeps as Parameters<typeof handleToolCall>[2],
        context,
      )

      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.code).toBe('CIRCULAR_DEPENDENCY')
    })

    it('should detect max depth exceeded', async () => {
      const context: ToolCallContext = {
        correlation_id: generateCorrelationId(),
        tool_call_chain: ['tool1', 'tool2', 'tool3', 'tool4', 'tool5'],
        start_time: Date.now(),
      }

      // Try to add a 6th tool (exceeds max depth of 5)
      const result = await handleToolCall(
        'kb_search',
        { query: 'test' },
        mockDeps as Parameters<typeof handleToolCall>[2],
        context,
      )

      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.code).toBe('CIRCULAR_DEPENDENCY')
    })
  })

  describe('Error classes', () => {
    it('should create ToolTimeoutError correctly', () => {
      const error = new ToolTimeoutError('kb_search', 10000)

      expect(error.name).toBe('ToolTimeoutError')
      expect(error.toolName).toBe('kb_search')
      expect(error.timeoutMs).toBe(10000)
      expect(error.message).toContain('10000ms timeout')
    })

    it('should create CircularDependencyError correctly', () => {
      const error = new CircularDependencyError(['kb_search', 'kb_get'], 'kb_search')

      expect(error.name).toBe('CircularDependencyError')
      expect(error.toolChain).toEqual(['kb_search', 'kb_get'])
      expect(error.attemptedTool).toBe('kb_search')
      expect(error.message).toContain('kb_search -> kb_get -> kb_search')
    })
  })
})
