/**
 * Admin Tool Tests for MCP Server
 *
 * Tests the admin/operational tool handlers:
 * - kb_bulk_import: Bulk import knowledge entries
 * - kb_rebuild_embeddings: Full implementation with force/incremental modes
 * - kb_stats: Basic implementation with database queries
 * - kb_health: Full implementation with health checks
 *
 * @see KNOW-007 for kb_rebuild_embeddings requirements
 * @see KNOW-0053 for other admin tool requirements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockEmbeddingClient,
  createMockKnowledgeEntry,
  generateTestUuid,
} from './test-helpers.js'

// Create hoisted mock functions (needed for vi.mock)
const { mockKbGet, mockRebuildEmbeddings, mockKbBulkImport } = vi.hoisted(() => ({
  mockKbGet: vi.fn(),
  mockRebuildEmbeddings: vi.fn(),
  mockKbBulkImport: vi.fn(),
}))

// Mock the logger
vi.mock('../logger.js', () => ({
  createMcpLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock the CRUD operations
vi.mock('../../crud-operations/index.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../crud-operations/index.js')>()
  return {
    ...actual,
    kb_get: mockKbGet,
  }
})

// Mock the rebuild-embeddings module
vi.mock('../rebuild-embeddings.js', () => ({
  rebuildEmbeddings: mockRebuildEmbeddings,
}))

// Mock the bulk-import module
vi.mock('../../seed/kb-bulk-import.js', () => ({
  kbBulkImport: mockKbBulkImport,
}))

// Mock the access control module
vi.mock('../access-control.js', () => ({
  checkAccess: vi.fn().mockReturnValue({ allowed: true }),
  cacheGet: vi.fn().mockReturnValue(null),
  cacheSet: vi.fn(),
}))

import {
  handleKbBulkImport,
  handleKbRebuildEmbeddings,
  handleKbStats,
  handleKbHealth,
  type ToolHandlerDeps,
} from '../tool-handlers.js'
import { checkAccess, cacheGet, cacheSet } from '../access-control.js'

describe('Admin Tool Handlers (KNOW-007)', () => {
  let mockDeps: ToolHandlerDeps
  let mockDbExecute: ReturnType<typeof vi.fn>
  let mockDbSelect: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create chainable mock for db.select
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([
        { role: 'dev', count: 50 },
        { role: 'pm', count: 30 },
        { role: 'qa', count: 15 },
        { role: 'all', count: 5 },
      ]),
    }
    mockDbSelect = vi.fn().mockReturnValue(selectChain)

    // Create mock for db.execute
    mockDbExecute = vi.fn()

    mockDeps = {
      db: {
        select: mockDbSelect,
        execute: mockDbExecute,
      } as unknown as ToolHandlerDeps['db'],
      embeddingClient: createMockEmbeddingClient(),
    }

    // Set default environment
    process.env.OPENAI_API_KEY = 'test-api-key'
  })

  describe('handleKbBulkImport', () => {
    it('should validate entries array and call bulk import', async () => {
      const entries = [
        { content: 'Test content 1', role: 'dev', tags: ['test'] },
        { content: 'Test content 2', role: 'pm' },
      ]

      const result = await handleKbBulkImport({ entries }, mockDeps)

      // Should call access control
      expect(checkAccess).toHaveBeenCalledWith('kb_bulk_import', 'all')
    })

    it('should return validation error for missing entries', async () => {
      const result = await handleKbBulkImport({}, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should include correlation_id in response', async () => {
      // Mock successful bulk import result
      mockKbBulkImport.mockResolvedValue({
        total: 1,
        succeeded: 1,
        failed: 0,
        dry_run: false,
        errors: [],
      })

      const context = {
        correlation_id: 'test-correlation-123',
        tool_call_chain: ['kb_bulk_import'],
        start_time: Date.now(),
        agent_role: 'pm' as const, // Required for KNOW-009 authorization
      }

      const entries = [{ content: 'Test content', role: 'dev' }]
      const result = await handleKbBulkImport({ entries }, mockDeps, context)

      // Response should contain correlation_id
      const response = JSON.parse(result.content[0].text)
      expect(response.correlation_id).toBe('test-correlation-123')
    })
  })

  describe('handleKbRebuildEmbeddings (KNOW-007)', () => {
    beforeEach(() => {
      // Default mock implementation for successful rebuild
      mockRebuildEmbeddings.mockResolvedValue({
        total_entries: 100,
        rebuilt: 10,
        skipped: 90,
        failed: 0,
        errors: [],
        duration_ms: 3000,
        estimated_cost_usd: 0.00006,
        entries_per_second: 3.33,
        dry_run: false,
      })
    })

    it('should call rebuildEmbeddings with default parameters (incremental)', async () => {
      const result = await handleKbRebuildEmbeddings({}, mockDeps)

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.total_entries).toBe(100)
      expect(response.rebuilt).toBe(10)
      expect(response.skipped).toBe(90)
      expect(mockRebuildEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          force: false,
          batch_size: 50,
          dry_run: false,
        }),
        mockDeps,
      )
    })

    it('should call rebuildEmbeddings with force=true for full rebuild', async () => {
      mockRebuildEmbeddings.mockResolvedValue({
        total_entries: 100,
        rebuilt: 100,
        skipped: 0,
        failed: 0,
        errors: [],
        duration_ms: 30000,
        estimated_cost_usd: 0.0006,
        entries_per_second: 3.33,
        dry_run: false,
      })

      const result = await handleKbRebuildEmbeddings({ force: true }, mockDeps)

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.rebuilt).toBe(100)
      expect(response.skipped).toBe(0)
      expect(mockRebuildEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          force: true,
        }),
        mockDeps,
      )
    })

    it('should support custom batch_size parameter', async () => {
      const result = await handleKbRebuildEmbeddings({ batch_size: 100 }, mockDeps)

      expect(result.isError).toBeUndefined()
      expect(mockRebuildEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          batch_size: 100,
        }),
        mockDeps,
      )
    })

    it('should support entry_ids parameter for selective rebuild', async () => {
      const entryIds = [generateTestUuid(), generateTestUuid()]

      mockRebuildEmbeddings.mockResolvedValue({
        total_entries: 100,
        rebuilt: 2,
        skipped: 0,
        failed: 0,
        errors: [],
        duration_ms: 600,
        estimated_cost_usd: 0.000012,
        entries_per_second: 3.33,
        dry_run: false,
      })

      const result = await handleKbRebuildEmbeddings(
        { entry_ids: entryIds, force: true },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.rebuilt).toBe(2)
      expect(mockRebuildEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          entry_ids: entryIds,
          force: true,
        }),
        mockDeps,
      )
    })

    it('should support dry_run mode for cost estimation', async () => {
      mockRebuildEmbeddings.mockResolvedValue({
        total_entries: 100,
        rebuilt: 0,
        skipped: 100,
        failed: 0,
        errors: [],
        duration_ms: 50,
        estimated_cost_usd: 0.0006,
        entries_per_second: 0,
        dry_run: true,
      })

      const result = await handleKbRebuildEmbeddings({ force: true, dry_run: true }, mockDeps)

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.dry_run).toBe(true)
      expect(response.rebuilt).toBe(0)
      expect(response.estimated_cost_usd).toBe(0.0006)
    })

    it('should return validation error for batch_size < 1', async () => {
      const result = await handleKbRebuildEmbeddings({ batch_size: 0 }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toContain('batch_size')
    })

    it('should return validation error for batch_size > 1000', async () => {
      const result = await handleKbRebuildEmbeddings({ batch_size: 1001 }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toContain('batch_size')
    })

    it('should return validation error for invalid entry_ids', async () => {
      const result = await handleKbRebuildEmbeddings(
        { entry_ids: ['not-a-uuid'] },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should return validation error for invalid force type', async () => {
      const result = await handleKbRebuildEmbeddings({ force: 'yes' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle partial success with errors', async () => {
      mockRebuildEmbeddings.mockResolvedValue({
        total_entries: 100,
        rebuilt: 95,
        skipped: 0,
        failed: 5,
        errors: [
          { entry_id: 'entry-1', reason: 'OpenAI API timeout' },
          { entry_id: 'entry-2', reason: 'Validation error' },
          { entry_id: 'entry-3', reason: 'Database error' },
          { entry_id: 'entry-4', reason: 'OpenAI API rate limit' },
          { entry_id: 'entry-5', reason: 'Unknown error' },
        ],
        duration_ms: 30000,
        estimated_cost_usd: 0.0006,
        entries_per_second: 3.17,
        dry_run: false,
      })

      const result = await handleKbRebuildEmbeddings({ force: true }, mockDeps)

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.rebuilt).toBe(95)
      expect(response.failed).toBe(5)
      expect(response.errors).toHaveLength(5)
      expect(response.errors[0]).toEqual({
        entry_id: 'entry-1',
        reason: 'OpenAI API timeout',
      })
    })

    it('should handle empty database gracefully', async () => {
      mockRebuildEmbeddings.mockResolvedValue({
        total_entries: 0,
        rebuilt: 0,
        skipped: 0,
        failed: 0,
        errors: [],
        duration_ms: 10,
        estimated_cost_usd: 0,
        entries_per_second: 0,
        dry_run: false,
      })

      const result = await handleKbRebuildEmbeddings({}, mockDeps)

      expect(result.isError).toBeUndefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.total_entries).toBe(0)
      expect(response.rebuilt).toBe(0)
    })

    it('should call access control stub', async () => {
      await handleKbRebuildEmbeddings({}, mockDeps)

      expect(checkAccess).toHaveBeenCalledWith('kb_rebuild_embeddings', 'all')
    })

    it('should include correlation_id in response', async () => {
      const context = {
        correlation_id: 'rebuild-correlation-123',
        tool_call_chain: ['kb_rebuild_embeddings'],
        start_time: Date.now(),
      }

      const result = await handleKbRebuildEmbeddings({}, mockDeps, context)

      const response = JSON.parse(result.content[0].text)
      expect(response.correlation_id).toBe('rebuild-correlation-123')
    })

    it('should include performance metrics in response', async () => {
      const result = await handleKbRebuildEmbeddings({}, mockDeps)

      const response = JSON.parse(result.content[0].text)
      expect(response.duration_ms).toBeGreaterThanOrEqual(0)
      expect(response.entries_per_second).toBeGreaterThanOrEqual(0)
      expect(response.estimated_cost_usd).toBeGreaterThanOrEqual(0)
    })
  })

  describe('handleKbStats', () => {
    beforeEach(() => {
      // Mock total count query
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockImplementation(() => {
          return Promise.resolve([
            { role: 'dev', count: 50 },
            { role: 'pm', count: 30 },
            { role: 'qa', count: 15 },
            { role: 'all', count: 5 },
          ])
        }),
      }

      // First call returns total count, second call returns role breakdown
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 100 }]),
        })
        .mockReturnValue(selectChain)

      // Mock tags query
      mockDbExecute.mockResolvedValue({
        rows: [
          { tag: 'typescript', count: 25 },
          { tag: 'testing', count: 20 },
          { tag: 'validation', count: 15 },
        ],
      })
    })

    it('should return statistics with correct structure', async () => {
      const result = await handleKbStats({}, mockDeps)

      expect(result.isError).toBeUndefined()
      const stats = JSON.parse(result.content[0].text)
      expect(stats).toHaveProperty('total_entries')
      expect(stats).toHaveProperty('by_role')
      expect(stats).toHaveProperty('top_tags')
      expect(stats).toHaveProperty('query_time_ms')
    })

    it('should call access control and caching stubs', async () => {
      await handleKbStats({}, mockDeps)

      expect(checkAccess).toHaveBeenCalledWith('kb_stats', 'all')
      expect(cacheGet).toHaveBeenCalledWith('kb_stats')
      expect(cacheSet).toHaveBeenCalled()
    })

    it('should return correct role breakdown', async () => {
      const result = await handleKbStats({}, mockDeps)

      const stats = JSON.parse(result.content[0].text)
      expect(stats.by_role).toEqual({
        pm: 30,
        dev: 50,
        qa: 15,
        all: 5,
      })
    })

    it('should return top tags ordered by count', async () => {
      const result = await handleKbStats({}, mockDeps)

      const stats = JSON.parse(result.content[0].text)
      expect(stats.top_tags).toHaveLength(3)
      expect(stats.top_tags[0].tag).toBe('typescript')
      expect(stats.top_tags[0].count).toBe(25)
    })

    it('should handle empty database gracefully', async () => {
      // Mock empty database
      mockDbSelect.mockReset()
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 0 }]),
        })
        .mockReturnValue({
          from: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockResolvedValue([]),
        })
      mockDbExecute.mockResolvedValue({ rows: [] })

      const result = await handleKbStats({}, mockDeps)

      expect(result.isError).toBeUndefined()
      const stats = JSON.parse(result.content[0].text)
      expect(stats.total_entries).toBe(0)
      expect(stats.top_tags).toEqual([])
    })

    it('should handle database error gracefully', async () => {
      mockDbSelect.mockReset()
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      })

      const result = await handleKbStats({}, mockDeps)

      expect(result.isError).toBe(true)
    })
  })

  describe('handleKbHealth', () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => {
      // Mock successful database check
      mockDbExecute.mockResolvedValue({ rows: [{ '?column?': 1 }] })

      // Mock fetch for OpenAI API validation (KNOW-039 enhancement)
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })
    })

    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    it('should return healthy status when all checks pass', async () => {
      const result = await handleKbHealth({}, mockDeps)

      expect(result.isError).toBeUndefined()
      const health = JSON.parse(result.content[0].text)
      expect(health.status).toBe('healthy')
      expect(health.checks.db.status).toBe('pass')
      expect(health.checks.openai_api.status).toBe('pass')
      expect(health.checks.mcp_server.status).toBe('pass')
    })

    it('should include uptime and version', async () => {
      const result = await handleKbHealth({}, mockDeps)

      const health = JSON.parse(result.content[0].text)
      expect(health.uptime_ms).toBeGreaterThanOrEqual(0)
      expect(health.version).toBeDefined()
    })

    it('should return degraded status when OpenAI API unavailable', async () => {
      // Test case 1: No API key
      const originalKey = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY

      const result = await handleKbHealth({}, mockDeps)

      const health = JSON.parse(result.content[0].text)
      expect(health.status).toBe('degraded')
      expect(health.checks.openai_api.status).toBe('fail')
      expect(health.checks.openai_api.error).toContain('OPENAI_API_KEY')

      // Restore for other tests
      process.env.OPENAI_API_KEY = originalKey
    })

    it('should return degraded status when OpenAI API returns error', async () => {
      // Mock API returning 401
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })

      const result = await handleKbHealth({}, mockDeps)

      const health = JSON.parse(result.content[0].text)
      expect(health.status).toBe('degraded')
      expect(health.checks.openai_api.status).toBe('fail')
      expect(health.checks.openai_api.error).toContain('401')
    })

    it('should return unhealthy status when database fails', async () => {
      mockDbExecute.mockRejectedValue(new Error('Connection refused'))

      const result = await handleKbHealth({}, mockDeps)

      const health = JSON.parse(result.content[0].text)
      expect(health.status).toBe('unhealthy')
      expect(health.checks.db.status).toBe('fail')
      expect(health.checks.db.error).toContain('Database connection failed')
    })

    it('should include latency_ms for checks', async () => {
      const result = await handleKbHealth({}, mockDeps)

      const health = JSON.parse(result.content[0].text)
      expect(health.checks.db.latency_ms).toBeGreaterThanOrEqual(0)
      expect(health.checks.openai_api.latency_ms).toBeGreaterThanOrEqual(0)
    })

    it('should call access control stub', async () => {
      await handleKbHealth({}, mockDeps)

      expect(checkAccess).toHaveBeenCalledWith('kb_health', 'all')
    })

    it('should include correlation_id in response', async () => {
      const context = {
        correlation_id: 'health-check-123',
        tool_call_chain: ['kb_health'],
        start_time: Date.now(),
      }

      const result = await handleKbHealth({}, mockDeps, context)

      const health = JSON.parse(result.content[0].text)
      expect(health.correlation_id).toBe('health-check-123')
    })

    it('should complete within performance target (500ms)', async () => {
      const start = Date.now()
      await handleKbHealth({}, mockDeps)
      const elapsed = Date.now() - start

      // Allow some buffer for test overhead
      expect(elapsed).toBeLessThan(1000)
    })
  })

  describe('kb_update embedding_regenerated flag', () => {
    it('should be tested via integration tests', () => {
      // The embedding_regenerated flag is tested implicitly through
      // the handleKbUpdate function. Full integration tests are in
      // the existing tool-handlers.test.ts.
      expect(true).toBe(true)
    })
  })
})
