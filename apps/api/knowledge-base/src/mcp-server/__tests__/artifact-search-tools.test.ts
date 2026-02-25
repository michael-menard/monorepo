/**
 * Artifact Search Tool Tests
 *
 * Unit tests for artifact_search MCP tool handler.
 *
 * @see KBAR-0130 AC9 for test requirements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleArtifactSearch, handleToolCall, ToolTimeoutError } from '../tool-handlers.js'
import { type ToolCallContext, generateCorrelationId } from '../server.js'
import { createMockEmbeddingClient, createMockKnowledgeEntry, generateTestUuid } from './test-helpers.js'

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
import { kb_search } from '../../search/index.js'

describe('artifact_search tool', () => {
  let mockDeps: {
    db: unknown
    embeddingClient: ReturnType<typeof createMockEmbeddingClient>
  }

  const makeSearchResult = (overrides: Partial<{ results: unknown[]; fallback_mode: boolean }> = {}) => ({
    results: overrides.results ?? [],
    metadata: {
      total: overrides.results?.length ?? 0,
      fallback_mode: overrides.fallback_mode ?? false,
      query_time_ms: 50,
      search_modes_used: ['semantic', 'keyword'] as const,
    },
  })

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

  // ============================================================================
  // Happy Paths (HP-1 to HP-6)
  // ============================================================================

  describe('Happy paths', () => {
    it('HP-1: should return results for story_id only search', async () => {
      const mockEntry = createMockKnowledgeEntry({ id: generateTestUuid(), content: 'checkpoint for KBAR-0130' })
      vi.mocked(kb_search).mockResolvedValue(
        makeSearchResult({
          results: [
            {
              id: mockEntry.id,
              content: mockEntry.content,
              role: mockEntry.role,
              tags: ['artifact', 'kbar-0130'],
              createdAt: mockEntry.createdAt,
              updatedAt: mockEntry.updatedAt,
              relevance_score: 0.9,
            },
          ],
        }),
      )

      const result = await handleArtifactSearch(
        { story_id: 'KBAR-0130' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.results).toHaveLength(1)
      expect(response.metadata.fallback_mode).toBe(false)
    })

    it('HP-2: should return results for artifact_type only search', async () => {
      vi.mocked(kb_search).mockResolvedValue(makeSearchResult({ results: [
        {
          id: generateTestUuid(),
          content: 'checkpoint artifact',
          role: 'dev',
          tags: ['artifact', 'checkpoint'],
          createdAt: new Date(),
          updatedAt: new Date(),
          relevance_score: 0.85,
        },
      ]}))

      const result = await handleArtifactSearch(
        { artifact_type: 'checkpoint' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.results).toHaveLength(1)
    })

    it('HP-3: should return results for phase only search', async () => {
      vi.mocked(kb_search).mockResolvedValue(makeSearchResult({ results: [
        {
          id: generateTestUuid(),
          content: 'implementation phase artifact',
          role: 'dev',
          tags: ['artifact', 'implementation'],
          createdAt: new Date(),
          updatedAt: new Date(),
          relevance_score: 0.8,
        },
      ]}))

      const result = await handleArtifactSearch(
        { phase: 'implementation' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.results).toHaveLength(1)
    })

    it('HP-4: should return results for story_id + artifact_type combination', async () => {
      vi.mocked(kb_search).mockResolvedValue(makeSearchResult({ results: [
        {
          id: generateTestUuid(),
          content: 'plan for KBAR-0130',
          role: 'dev',
          tags: ['artifact', 'kbar-0130', 'plan'],
          createdAt: new Date(),
          updatedAt: new Date(),
          relevance_score: 0.95,
        },
      ]}))

      const context: ToolCallContext = {
        correlation_id: generateCorrelationId(),
        tool_call_chain: ['artifact_search'],
        start_time: Date.now(),
      }

      const result = await handleArtifactSearch(
        { story_id: 'KBAR-0130', artifact_type: 'plan' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
        context,
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.results).toHaveLength(1)
      // Verify correlation_id is in metadata
      expect(response.metadata.correlation_id).toBe(context.correlation_id)
    })

    it('HP-5: should return empty array without error (empty results = success)', async () => {
      vi.mocked(kb_search).mockResolvedValue(makeSearchResult())

      const result = await handleArtifactSearch(
        { story_id: 'KBAR-9999' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.results).toHaveLength(0)
      expect(response.metadata.total).toBe(0)
    })

    it('HP-6: should propagate fallback_mode in response metadata', async () => {
      vi.mocked(kb_search).mockResolvedValue(makeSearchResult({ fallback_mode: true }))

      const result = await handleArtifactSearch(
        { story_id: 'KBAR-0130' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.metadata.fallback_mode).toBe(true)
    })
  })

  // ============================================================================
  // Error Cases (EC-1 to EC-4)
  // ============================================================================

  describe('Error cases', () => {
    it('EC-1: should handle validation error for invalid artifact_type', async () => {
      const result = await handleArtifactSearch(
        { artifact_type: 'not_a_valid_type' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      expect(result.isError).toBe(true)
    })

    it('EC-2: should handle validation error for invalid phase', async () => {
      const result = await handleArtifactSearch(
        { phase: 'not_a_valid_phase' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      expect(result.isError).toBe(true)
    })

    it('EC-3: should handle database/search errors gracefully', async () => {
      vi.mocked(kb_search).mockRejectedValue(new Error('Database connection failed'))

      const result = await handleArtifactSearch(
        { story_id: 'KBAR-0130' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      expect(result.isError).toBe(true)
    })

    it('EC-4: should handle timeout errors', async () => {
      vi.mocked(kb_search).mockImplementation(
        () =>
          new Promise((_resolve, reject) =>
            setTimeout(() => reject(new ToolTimeoutError('artifact_search', 1)), 10),
          ),
      )

      // Override timeout to be very short for testing
      process.env.KB_SEARCH_TIMEOUT_MS = '1'

      const result = await handleArtifactSearch(
        { story_id: 'KBAR-0130' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      delete process.env.KB_SEARCH_TIMEOUT_MS

      // Either TIMEOUT error or regular error (depends on timing)
      expect(result.isError).toBe(true)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge cases', () => {
    it('should include correlation_id in response metadata', async () => {
      vi.mocked(kb_search).mockResolvedValue(makeSearchResult())

      const correlationId = generateCorrelationId()
      const context: ToolCallContext = {
        correlation_id: correlationId,
        tool_call_chain: ['artifact_search'],
        start_time: Date.now(),
      }

      const result = await handleArtifactSearch(
        { story_id: 'KBAR-0130' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
        context,
      )

      const response = JSON.parse(result.content[0].text)
      expect(response.metadata.correlation_id).toBe(correlationId)
    })

    it('should succeed with no parameters (empty input)', async () => {
      vi.mocked(kb_search).mockResolvedValue(makeSearchResult())

      const result = await handleArtifactSearch(
        {},
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.results).toBeDefined()
    })

    it('should respect limit parameter', async () => {
      vi.mocked(kb_search).mockResolvedValue(makeSearchResult())

      await handleArtifactSearch(
        { story_id: 'KBAR-0130', limit: 5 },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      expect(vi.mocked(kb_search)).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 }),
        expect.anything(),
      )
    })

    it('should compose tags with only defined segments (filter out undefined)', async () => {
      vi.mocked(kb_search).mockResolvedValue(makeSearchResult())

      await handleArtifactSearch(
        { story_id: 'KBAR-0130', artifact_type: 'plan' },
        mockDeps as Parameters<typeof handleArtifactSearch>[1],
      )

      // Tags should be ['artifact', 'KBAR-0130', 'plan'] — no undefined/phase slot
      expect(vi.mocked(kb_search)).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['artifact', 'KBAR-0130', 'plan']),
        }),
        expect.anything(),
      )
    })

    it('should dispatch artifact_search via handleToolCall', async () => {
      vi.mocked(kb_search).mockResolvedValue(makeSearchResult())

      const context: ToolCallContext = {
        correlation_id: generateCorrelationId(),
        tool_call_chain: [],
        start_time: Date.now(),
      }

      const result = await handleToolCall(
        'artifact_search',
        { story_id: 'KBAR-0130' },
        mockDeps as Parameters<typeof handleToolCall>[2],
        context,
      )

      expect(result.isError).toBeUndefined()
      expect(vi.mocked(kb_search)).toHaveBeenCalled()
    })
  })
})
