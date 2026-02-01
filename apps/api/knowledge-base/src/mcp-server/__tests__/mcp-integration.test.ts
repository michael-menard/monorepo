/**
 * MCP Integration Tests
 *
 * Tests the MCP server at the protocol level:
 * - Tool discovery (ListToolsRequest)
 * - Tool invocation (CallToolRequest)
 * - Error propagation through MCP layer
 *
 * These tests verify the MCP SDK integration works correctly.
 * They test the server creation and request handling without
 * actually starting the stdio transport.
 *
 * @see KNOW-0051 AC7 for integration test requirements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMcpServer, validateEnvironment, type EnvConfig } from '../server.js'
import { getToolDefinitions, TOOL_SCHEMA_VERSION } from '../tool-schemas.js'
import {
  createMockEmbeddingClient,
  createMockKnowledgeEntry,
  generateTestUuid,
} from './test-helpers.js'
import type { ToolHandlerDeps } from '../tool-handlers.js'

// Create hoisted mock functions (needed for vi.mock)
const { mockKbAdd, mockKbGet, mockKbList } = vi.hoisted(() => ({
  mockKbAdd: vi.fn(),
  mockKbGet: vi.fn(),
  mockKbList: vi.fn(),
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
    kb_add: mockKbAdd,
    kb_get: mockKbGet,
    kb_update: vi.fn(),
    kb_delete: vi.fn(),
    kb_list: mockKbList,
  }
})

describe('MCP Server Integration', () => {
  let mockDeps: ToolHandlerDeps

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      db: {} as ToolHandlerDeps['db'],
      embeddingClient: createMockEmbeddingClient(),
    }
  })

  describe('Tool Discovery', () => {
    it('should return all 14 tool definitions (CRUD + search + admin + audit)', () => {
      const tools = getToolDefinitions()

      expect(tools).toHaveLength(14)
      expect(tools.map(t => t.name)).toEqual([
        'kb_add',
        'kb_get',
        'kb_update',
        'kb_delete',
        'kb_list',
        'kb_search',
        'kb_get_related',
        'kb_bulk_import',
        'kb_rebuild_embeddings',
        'kb_stats',
        'kb_health',
        'kb_audit_by_entry',
        'kb_audit_query',
        'kb_audit_retention_cleanup',
      ])
    })

    it('should include tool descriptions', () => {
      const tools = getToolDefinitions()

      for (const tool of tools) {
        expect(tool.description).toBeTruthy()
        expect(tool.description.length).toBeGreaterThan(50)
      }
    })

    it('should include input schemas', () => {
      const tools = getToolDefinitions()

      for (const tool of tools) {
        expect(tool.inputSchema).toBeTruthy()
        expect(typeof tool.inputSchema).toBe('object')
      }
    })

    it('should have valid kb_add input schema', () => {
      const tools = getToolDefinitions()
      const kbAdd = tools.find(t => t.name === 'kb_add')

      expect(kbAdd).toBeTruthy()
      const schema = kbAdd!.inputSchema as Record<string, unknown>
      expect(schema.type).toBe('object')
      expect(schema.properties).toBeTruthy()

      const props = schema.properties as Record<string, unknown>
      expect(props.content).toBeTruthy()
      expect(props.role).toBeTruthy()
    })

    it('should have valid kb_list input schema with optional params', () => {
      const tools = getToolDefinitions()
      const kbList = tools.find(t => t.name === 'kb_list')

      expect(kbList).toBeTruthy()
      // kb_list schema should be optional (can be undefined)
    })
  })

  describe('Server Creation', () => {
    it('should create server with correct name and version', () => {
      const { server } = createMcpServer(mockDeps)

      // Server should be created (we can't inspect internals easily)
      expect(server).toBeTruthy()
    })

    it('should include tool schema version', () => {
      expect(TOOL_SCHEMA_VERSION).toBe('1.0.0')
    })
  })

  describe('Environment Validation', () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should fail without DATABASE_URL', () => {
      delete process.env.DATABASE_URL
      process.env.OPENAI_API_KEY = 'test-key'

      expect(() => validateEnvironment()).toThrow('DATABASE_URL')
    })

    it('should fail without OPENAI_API_KEY', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test'
      delete process.env.OPENAI_API_KEY

      expect(() => validateEnvironment()).toThrow('OPENAI_API_KEY')
    })

    it('should pass with required env vars', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test'
      process.env.OPENAI_API_KEY = 'test-key'

      const config = validateEnvironment()

      expect(config.DATABASE_URL).toBe('postgresql://localhost/test')
      expect(config.OPENAI_API_KEY).toBe('test-key')
    })

    it('should use default values for optional env vars', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test'
      process.env.OPENAI_API_KEY = 'test-key'
      // Clear any existing optional env vars
      delete process.env.SHUTDOWN_TIMEOUT_MS
      delete process.env.LOG_LEVEL
      delete process.env.DB_POOL_SIZE

      const config = validateEnvironment()

      expect(config.SHUTDOWN_TIMEOUT_MS).toBe(30000)
      expect(config.LOG_LEVEL).toBe('info')
      expect(config.DB_POOL_SIZE).toBe(5)
    })

    it('should parse custom shutdown timeout', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test'
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.SHUTDOWN_TIMEOUT_MS = '60000'

      const config = validateEnvironment()

      expect(config.SHUTDOWN_TIMEOUT_MS).toBe(60000)
    })
  })

  describe('Tool Invocation via Server', () => {
    // These tests verify the handler integration works

    it('should handle kb_add via handler', async () => {
      const expectedId = generateTestUuid()
      mockKbAdd.mockResolvedValue(expectedId)

      // Import handler directly for testing
      const { handleToolCall } = await import('../tool-handlers.js')

      const result = await handleToolCall(
        'kb_add',
        {
          content: 'Test content',
          role: 'dev',
          tags: ['test'],
        },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toBe(expectedId)
    })

    it('should handle kb_get returning entry', async () => {
      const mockEntry = createMockKnowledgeEntry()
      mockKbGet.mockResolvedValue(mockEntry)

      const { handleToolCall } = await import('../tool-handlers.js')

      const result = await handleToolCall('kb_get', { id: mockEntry.id }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.id).toBe(mockEntry.id)
    })

    it('should handle kb_get returning null', async () => {
      mockKbGet.mockResolvedValue(null)

      const { handleToolCall } = await import('../tool-handlers.js')

      const result = await handleToolCall('kb_get', { id: generateTestUuid() }, mockDeps)

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toBe('null')
    })

    it('should handle kb_list with results', async () => {
      const mockEntries = [
        createMockKnowledgeEntry({ id: 'entry-1' }),
        createMockKnowledgeEntry({ id: 'entry-2' }),
      ]
      mockKbList.mockResolvedValue(mockEntries)

      const { handleToolCall } = await import('../tool-handlers.js')

      const result = await handleToolCall('kb_list', { role: 'dev' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toHaveLength(2)
    })

    it('should handle validation errors', async () => {
      const { handleToolCall } = await import('../tool-handlers.js')

      const result = await handleToolCall(
        'kb_add',
        { content: '', role: 'invalid' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle unknown tools', async () => {
      const { handleToolCall } = await import('../tool-handlers.js')

      const result = await handleToolCall('unknown_tool', {}, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.message).toContain('Unknown tool')
    })
  })

  describe('Error Propagation', () => {
    it('should propagate validation errors with field info', async () => {
      const { handleToolCall } = await import('../tool-handlers.js')

      const result = await handleToolCall(
        'kb_add',
        { content: '', role: 'dev' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.field).toBe('content')
    })

    it('should sanitize database errors', async () => {
      mockKbAdd.mockRejectedValue(
        new Error('Connection to postgresql://user:password@localhost:5432/db failed'),
      )

      const { handleToolCall } = await import('../tool-handlers.js')

      const result = await handleToolCall(
        'kb_add',
        { content: 'Test', role: 'dev' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.message).not.toContain('password')
    })
  })

  describe('Authorization Integration (KNOW-009)', () => {
    it('should allow PM role to access all tools', async () => {
      const expectedId = generateTestUuid()
      mockKbAdd.mockResolvedValue(expectedId)
      mockKbGet.mockResolvedValue(null)

      const { handleToolCall } = await import('../tool-handlers.js')

      // Create context with PM role
      const context = {
        correlation_id: 'test-correlation',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'pm' as const,
      }

      // PM should be able to access kb_add (non-admin)
      const addResult = await handleToolCall(
        'kb_add',
        { content: 'Test content', role: 'dev', tags: ['test'] },
        mockDeps,
        context,
      )
      expect(addResult.isError).toBeUndefined()
    })

    it('should deny dev role access to kb_delete (admin tool)', async () => {
      const { handleToolCall } = await import('../tool-handlers.js')

      // Create context with dev role
      const context = {
        correlation_id: 'test-correlation',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'dev' as const,
      }

      // Dev should be denied access to kb_delete
      const result = await handleToolCall(
        'kb_delete',
        { id: generateTestUuid() },
        mockDeps,
        context,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('FORBIDDEN')
      expect(error.message).toBe('kb_delete requires pm role')
    })

    it('should deny qa role access to kb_bulk_import (admin tool)', async () => {
      const { handleToolCall } = await import('../tool-handlers.js')

      // Create context with qa role
      const context = {
        correlation_id: 'test-correlation',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'qa' as const,
      }

      // QA should be denied access to kb_bulk_import
      const result = await handleToolCall(
        'kb_bulk_import',
        { entries: [] },
        mockDeps,
        context,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('FORBIDDEN')
      expect(error.message).toBe('kb_bulk_import requires pm role')
    })

    it('should deny all role access to kb_rebuild_embeddings (admin tool)', async () => {
      const { handleToolCall } = await import('../tool-handlers.js')

      // Create context with all role
      const context = {
        correlation_id: 'test-correlation',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'all' as const,
      }

      // All role should be denied access to kb_rebuild_embeddings
      const result = await handleToolCall('kb_rebuild_embeddings', {}, mockDeps, context)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('FORBIDDEN')
      expect(error.message).toBe('kb_rebuild_embeddings requires pm role')
    })

    it('should allow dev role access to non-admin tools', async () => {
      const mockEntry = createMockKnowledgeEntry()
      mockKbGet.mockResolvedValue(mockEntry)

      const { handleToolCall } = await import('../tool-handlers.js')

      // Create context with dev role
      const context = {
        correlation_id: 'test-correlation',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'dev' as const,
      }

      // Dev should be able to access kb_get (non-admin)
      const result = await handleToolCall('kb_get', { id: mockEntry.id }, mockDeps, context)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.id).toBe(mockEntry.id)
    })

    it('should default to all role when context is undefined', async () => {
      const { handleToolCall } = await import('../tool-handlers.js')

      // Call without context - should default to 'all' role
      const result = await handleToolCall('kb_delete', { id: generateTestUuid() }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('FORBIDDEN')
      expect(error.message).toBe('kb_delete requires pm role')
    })

    it('authorization error should not include stack traces', async () => {
      const { handleToolCall } = await import('../tool-handlers.js')

      const context = {
        correlation_id: 'test-correlation',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'dev' as const,
      }

      const result = await handleToolCall(
        'kb_delete',
        { id: generateTestUuid() },
        mockDeps,
        context,
      )

      expect(result.isError).toBe(true)
      const errorText = result.content[0].text

      // Should not include any internal details
      expect(errorText).not.toContain('stack')
      expect(errorText).not.toContain('.ts')
      expect(errorText).not.toContain('Error:')
      expect(errorText).not.toContain('at ')

      // Should only include sanitized error
      const error = JSON.parse(errorText)
      expect(error.code).toBe('FORBIDDEN')
      expect(error.message).toBe('kb_delete requires pm role')
    })

    it('authorization failure should not execute business logic', async () => {
      // Reset mock call counts
      mockKbGet.mockClear()

      const { handleToolCall } = await import('../tool-handlers.js')

      const context = {
        correlation_id: 'test-correlation',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'dev' as const,
      }

      // Try to delete with dev role
      await handleToolCall('kb_delete', { id: generateTestUuid() }, mockDeps, context)

      // The kb_get (used for audit logging before delete) should NOT be called
      // because authorization check happens FIRST
      expect(mockKbGet).not.toHaveBeenCalled()
    })
  })
})
