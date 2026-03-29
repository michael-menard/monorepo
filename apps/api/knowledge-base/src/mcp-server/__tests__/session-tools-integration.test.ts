/**
 * Session Tools Integration Tests (WINT-2090)
 *
 * Tests the 5 session MCP tools at the handler level:
 * - session_create
 * - session_update
 * - session_complete
 * - session_query
 * - session_cleanup
 *
 * Uses unit-style mocking (no DB connection required).
 * Validates handleToolCall dispatch, authorization, and handler behavior.
 */

import { describe, it, expect, vi } from 'vitest'
import { getToolDefinitions } from '../tool-schemas.js'

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../logger.js', () => ({
  createMcpLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Use vi.hoisted to avoid initialization order issues with vi.mock
const {
  mockSessionCreate,
  mockSessionUpdate,
  mockSessionComplete,
  mockSessionQuery,
  mockSessionCleanup,
} = vi.hoisted(() => ({
  mockSessionCreate: vi.fn(),
  mockSessionUpdate: vi.fn(),
  mockSessionComplete: vi.fn(),
  mockSessionQuery: vi.fn(),
  mockSessionCleanup: vi.fn(),
}))

vi.mock('../../crud-operations/session-operations.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../crud-operations/session-operations.js')>()
  return {
    ...actual,
    session_create: mockSessionCreate,
    session_update: mockSessionUpdate,
    session_complete: mockSessionComplete,
    session_query: mockSessionQuery,
    session_cleanup: mockSessionCleanup,
  }
})

// ============================================================================
// Test Helpers
// ============================================================================

function generateTestUuid() {
  return '00000000-0000-0000-0000-' + Math.floor(Math.random() * 1e12).toString().padStart(12, '0')
}

// ============================================================================
// Tests
// ============================================================================

describe('Session Tool Schemas (WINT-2090)', () => {
  describe('Tool Discovery', () => {
    it('should include all 5 session tools in getToolDefinitions()', () => {
      const tools = getToolDefinitions()
      const toolNames = tools.map(t => t.name)

      expect(toolNames).toContain('session_create')
      expect(toolNames).toContain('session_update')
      expect(toolNames).toContain('session_complete')
      expect(toolNames).toContain('session_query')
      expect(toolNames).toContain('session_cleanup')
    })

    it('should have descriptions longer than 50 chars for session tools', () => {
      const tools = getToolDefinitions()
      const sessionTools = tools.filter(t =>
        ['session_create', 'session_update', 'session_complete', 'session_query', 'session_cleanup'].includes(t.name),
      )

      expect(sessionTools).toHaveLength(5)
      for (const tool of sessionTools) {
        expect(tool.description.length, `${tool.name} description too short`).toBeGreaterThan(50)
      }
    })

    it('should have valid inputSchema for all session tools', () => {
      const tools = getToolDefinitions()
      const sessionTools = tools.filter(t =>
        ['session_create', 'session_update', 'session_complete', 'session_query', 'session_cleanup'].includes(t.name),
      )

      for (const tool of sessionTools) {
        expect(tool.inputSchema).toBeTruthy()
        expect(typeof tool.inputSchema).toBe('object')
        expect((tool.inputSchema as { type: string }).type).toBe('object')
      }
    })
  })

  describe('session_create schema', () => {
    it('should require agentName field', () => {
      const tools = getToolDefinitions()
      const tool = tools.find(t => t.name === 'session_create')

      expect(tool).toBeDefined()
      const schema = tool!.inputSchema as {
        required?: string[]
        properties: Record<string, unknown>
      }
      expect(schema.required).toContain('agentName')
    })

    it('should have sessionId as optional UUID field', () => {
      const tools = getToolDefinitions()
      const tool = tools.find(t => t.name === 'session_create')

      expect(tool).toBeDefined()
      const schema = tool!.inputSchema as {
        required?: string[]
        properties: Record<string, unknown>
      }
      // sessionId is optional — should NOT be in required
      expect(schema.required ?? []).not.toContain('sessionId')
    })
  })

  describe('session_update schema', () => {
    it('should require sessionId field', () => {
      const tools = getToolDefinitions()
      const tool = tools.find(t => t.name === 'session_update')

      expect(tool).toBeDefined()
      const schema = tool!.inputSchema as {
        required?: string[]
        properties: Record<string, unknown>
      }
      expect(schema.required).toContain('sessionId')
    })
  })

  describe('session_complete schema', () => {
    it('should require sessionId field', () => {
      const tools = getToolDefinitions()
      const tool = tools.find(t => t.name === 'session_complete')

      expect(tool).toBeDefined()
      const schema = tool!.inputSchema as {
        required?: string[]
        properties: Record<string, unknown>
      }
      expect(schema.required).toContain('sessionId')
    })
  })

  describe('session_query schema', () => {
    it('should have no required fields (all optional)', () => {
      const tools = getToolDefinitions()
      const tool = tools.find(t => t.name === 'session_query')

      expect(tool).toBeDefined()
      const schema = tool!.inputSchema as {
        required?: string[]
        properties: Record<string, unknown>
      }
      // session_query has all optional fields
      expect((schema.required ?? []).length).toBe(0)
    })
  })

  describe('session_cleanup schema', () => {
    it('should have no required fields (all have defaults)', () => {
      const tools = getToolDefinitions()
      const tool = tools.find(t => t.name === 'session_cleanup')

      expect(tool).toBeDefined()
      const schema = tool!.inputSchema as {
        required?: string[]
        properties: Record<string, unknown>
      }
      // session_cleanup has all optional fields with defaults
      expect((schema.required ?? []).length).toBe(0)
    })
  })
})

describe('Session Tool Handlers (WINT-2090)', () => {
  describe('handleToolCall dispatch', () => {
    it('should dispatch session_create to handleSessionCreate', async () => {
      const mockSession = {
        id: generateTestUuid(),
        sessionId: generateTestUuid(),
        agentName: 'dev-execute-leader',
        storyId: 'WINT-2090',
        phase: 'execute',
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockSessionCreate.mockResolvedValue(mockSession)

      const { handleToolCall } = await import('../tool-handlers.js')
      const mockDeps = { db: {}, embeddingClient: {} } as any

      const result = await handleToolCall(
        'session_create',
        { agentName: 'dev-execute-leader', storyId: 'WINT-2090', phase: 'execute' },
        mockDeps,
      )

      expect(result.isError).toBeFalsy()
      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')
    })

    it('should dispatch session_update to handleSessionUpdate', async () => {
      const sessionId = generateTestUuid()
      const mockSession = {
        id: generateTestUuid(),
        sessionId,
        agentName: 'dev-execute-leader',
        storyId: 'WINT-2090',
        phase: 'execute',
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 0,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockSessionUpdate.mockResolvedValue(mockSession)

      const { handleToolCall } = await import('../tool-handlers.js')
      const mockDeps = { db: {}, embeddingClient: {} } as any

      const result = await handleToolCall(
        'session_update',
        { sessionId, inputTokens: 1000, outputTokens: 500 },
        mockDeps,
      )

      expect(result.isError).toBeFalsy()
    })

    it('should dispatch session_complete to handleSessionComplete', async () => {
      const sessionId = generateTestUuid()
      const mockSession = {
        id: generateTestUuid(),
        sessionId,
        agentName: 'dev-execute-leader',
        storyId: 'WINT-2090',
        phase: 'execute',
        inputTokens: 5000,
        outputTokens: 2500,
        cachedTokens: 0,
        startedAt: new Date(),
        endedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockSessionComplete.mockResolvedValue(mockSession)

      const { handleToolCall } = await import('../tool-handlers.js')
      const mockDeps = { db: {}, embeddingClient: {} } as any

      const result = await handleToolCall('session_complete', { sessionId }, mockDeps)

      expect(result.isError).toBeFalsy()
    })

    it('should dispatch session_query to handleSessionQuery', async () => {
      mockSessionQuery.mockResolvedValue([])

      const { handleToolCall } = await import('../tool-handlers.js')
      const mockDeps = { db: {}, embeddingClient: {} } as any

      const result = await handleToolCall(
        'session_query',
        { storyId: 'WINT-2090', activeOnly: true },
        mockDeps,
      )

      expect(result.isError).toBeFalsy()
    })

    it('should dispatch session_cleanup to handleSessionCleanup', async () => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 90)
      mockSessionCleanup.mockResolvedValue({
        deletedCount: 5,
        dryRun: true,
        cutoffDate: cutoffDate.toISOString(),
      })

      const { handleToolCall } = await import('../tool-handlers.js')
      const mockDeps = { db: {}, embeddingClient: {} } as any

      const result = await handleToolCall('session_cleanup', { retentionDays: 90 }, mockDeps)

      expect(result.isError).toBeFalsy()
    })
  })

  describe('null return graceful degradation (telemetry safety)', () => {
    it('session_create null return should return null result without error', async () => {
      mockSessionCreate.mockResolvedValue(null)

      const { handleToolCall } = await import('../tool-handlers.js')
      const mockDeps = { db: {}, embeddingClient: {} } as any

      const result = await handleToolCall(
        'session_create',
        { agentName: 'dev-execute-leader' },
        mockDeps,
      )

      // Null return from session_create is telemetry-safe — should NOT be an error
      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toBeNull()
    })

    it('session_complete null return should return null result without error', async () => {
      const sessionId = generateTestUuid()
      mockSessionComplete.mockResolvedValue(null)

      const { handleToolCall } = await import('../tool-handlers.js')
      const mockDeps = { db: {}, embeddingClient: {} } as any

      const result = await handleToolCall('session_complete', { sessionId }, mockDeps)

      // Null return from session_complete is telemetry-safe — should NOT be an error
      expect(result.isError).toBeFalsy()
    })
  })
})
