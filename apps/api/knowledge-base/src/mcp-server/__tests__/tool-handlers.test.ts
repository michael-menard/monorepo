/**
 * Tool Handler Tests for MCP Server
 *
 * Tests the 5 CRUD tool handlers:
 * - kb_add: Add knowledge entry
 * - kb_get: Retrieve entry by ID
 * - kb_update: Update existing entry
 * - kb_delete: Delete entry (idempotent)
 * - kb_list: List entries with filters
 *
 * @see KNOW-0051 AC3 for tool handler requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockEmbeddingClient,
  createMockKnowledgeEntry,
  sampleEntries,
  generateTestUuid,
} from './test-helpers.js'
import { NotFoundError } from '../../crud-operations/errors.js'

// Create hoisted mock functions (needed for vi.mock)
const { mockKbAdd, mockKbGet, mockKbUpdate, mockKbDelete, mockKbList } = vi.hoisted(() => ({
  mockKbAdd: vi.fn(),
  mockKbGet: vi.fn(),
  mockKbUpdate: vi.fn(),
  mockKbDelete: vi.fn(),
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
    kb_update: mockKbUpdate,
    kb_delete: mockKbDelete,
    kb_list: mockKbList,
  }
})

import {
  handleKbAdd,
  handleKbGet,
  handleKbUpdate,
  handleKbDelete,
  handleKbList,
  handleToolCall,
  type ToolHandlerDeps,
} from '../tool-handlers.js'

describe('Tool Handlers', () => {
  let mockDeps: ToolHandlerDeps

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      db: {} as ToolHandlerDeps['db'],
      embeddingClient: createMockEmbeddingClient(),
    }
  })

  describe('handleKbAdd', () => {
    it('should add entry and return UUID', async () => {
      const expectedId = generateTestUuid()
      mockKbAdd.mockResolvedValue(expectedId)

      const result = await handleKbAdd(sampleEntries.dev1, mockDeps)

      expect(result.isError).toBeUndefined()
      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe(expectedId)
      expect(mockKbAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          content: sampleEntries.dev1.content,
          role: sampleEntries.dev1.role,
        }),
        mockDeps,
      )
    })

    it('should return error for empty content', async () => {
      const result = await handleKbAdd({ content: '', role: 'dev' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.field).toBe('content')
    })

    it('should return error for invalid role', async () => {
      const result = await handleKbAdd({ content: 'test', role: 'invalid' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.field).toBe('role')
    })

    it('should handle null tags', async () => {
      mockKbAdd.mockResolvedValue('test-uuid')

      const result = await handleKbAdd(sampleEntries.noTags, mockDeps)

      expect(result.isError).toBeUndefined()
      expect(mockKbAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: null,
        }),
        mockDeps,
      )
    })

    it('should return error on CRUD operation failure', async () => {
      mockKbAdd.mockRejectedValue(new Error('Database error'))

      const result = await handleKbAdd(sampleEntries.dev1, mockDeps)

      expect(result.isError).toBe(true)
    })
  })

  describe('handleKbGet', () => {
    it('should return entry when found', async () => {
      const mockEntry = createMockKnowledgeEntry()
      mockKbGet.mockResolvedValue(mockEntry)

      const result = await handleKbGet({ id: mockEntry.id }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.id).toBe(mockEntry.id)
      expect(parsed.content).toBe(mockEntry.content)
      // Should not include embedding in response
      expect(parsed.embedding).toBeUndefined()
    })

    it('should return null when not found', async () => {
      mockKbGet.mockResolvedValue(null)

      const result = await handleKbGet({ id: generateTestUuid() }, mockDeps)

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toBe('null')
    })

    it('should return error for invalid UUID', async () => {
      const result = await handleKbGet({ id: 'not-a-uuid' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('handleKbUpdate', () => {
    it('should update entry and return updated data', async () => {
      const mockEntry = createMockKnowledgeEntry({ content: 'Updated content' })
      mockKbUpdate.mockResolvedValue(mockEntry)

      const result = await handleKbUpdate(
        { id: mockEntry.id, content: 'Updated content' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.content).toBe('Updated content')
      // Should not include embedding
      expect(parsed.embedding).toBeUndefined()
    })

    it('should return error when entry not found', async () => {
      const id = generateTestUuid()
      mockKbUpdate.mockRejectedValue(new NotFoundError('KnowledgeEntry', id))

      const result = await handleKbUpdate({ id, content: 'Updated' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('NOT_FOUND')
    })

    it('should return error when no update fields provided', async () => {
      const result = await handleKbUpdate({ id: generateTestUuid() }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('handleKbDelete', () => {
    it('should delete entry and return success', async () => {
      mockKbDelete.mockResolvedValue(undefined)

      const result = await handleKbDelete({ id: generateTestUuid() }, mockDeps)

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toBe('Deleted successfully')
    })

    it('should succeed for non-existent entry (idempotent)', async () => {
      mockKbDelete.mockResolvedValue(undefined)

      const result = await handleKbDelete({ id: generateTestUuid() }, mockDeps)

      expect(result.isError).toBeUndefined()
    })

    it('should return error for invalid UUID', async () => {
      const result = await handleKbDelete({ id: 'invalid' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('handleKbList', () => {
    it('should return array of entries', async () => {
      const mockEntries = [
        createMockKnowledgeEntry({ id: 'entry-1' }),
        createMockKnowledgeEntry({ id: 'entry-2' }),
      ]
      mockKbList.mockResolvedValue(mockEntries)

      const result = await handleKbList({}, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toHaveLength(2)
      // Should not include embeddings
      expect(parsed[0].embedding).toBeUndefined()
    })

    it('should return empty array when no entries', async () => {
      mockKbList.mockResolvedValue([])

      const result = await handleKbList({}, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toEqual([])
    })

    it('should pass role filter', async () => {
      mockKbList.mockResolvedValue([])

      await handleKbList({ role: 'dev' }, mockDeps)

      expect(mockKbList).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'dev' }),
        mockDeps,
      )
    })

    it('should pass tags filter', async () => {
      mockKbList.mockResolvedValue([])

      await handleKbList({ tags: ['typescript'] }, mockDeps)

      expect(mockKbList).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['typescript'] }),
        mockDeps,
      )
    })

    it('should pass limit', async () => {
      mockKbList.mockResolvedValue([])

      await handleKbList({ limit: 50 }, mockDeps)

      expect(mockKbList).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
        mockDeps,
      )
    })

    it('should handle undefined input', async () => {
      mockKbList.mockResolvedValue([])

      const result = await handleKbList(undefined, mockDeps)

      expect(result.isError).toBeUndefined()
    })
  })

  describe('handleToolCall', () => {
    it('should dispatch to correct handler', async () => {
      mockKbGet.mockResolvedValue(null)

      await handleToolCall('kb_get', { id: generateTestUuid() }, mockDeps)

      expect(mockKbGet).toHaveBeenCalled()
    })

    it('should return error for unknown tool', async () => {
      const result = await handleToolCall('unknown_tool', {}, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.message).toContain('Unknown tool')
    })
  })
})
